// js/criar.js - Formulário em etapas para gerar o roteiro com IA

// Limite de dias: acima disso a resposta da IA passa do limite de tokens e o JSON volta cortado
const MAX_DIAS = 15;

// Modelo da OpenAI. O gpt-4o-mini é mais barato; o gpt-4o erra menos em logística e preços.
const MODELO_OPENAI = 'gpt-4o';

// Converte o que a IA mandou em número inteiro >= 0 (aceita "45", "45,5" ou 45)
function numeroSeguro(valor) {
    const n = Number(String(valor ?? '').replace(',', '.'));
    return isFinite(n) && n > 0 ? Math.round(n) : 0;
}

// Igual ao numeroSeguro, mas devolve null quando a IA não mandou o valor
// (assim "não informado" não vira "Grátis")
function numeroOuNulo(valor) {
    if (valor === undefined || valor === null || String(valor).trim() === '') return null;
    const n = Number(String(valor).replace(',', '.'));
    return isFinite(n) && n >= 0 ? Math.round(n) : null;
}

// Soma os custos que a IA estimou. A conta é feita aqui (e não pela IA),
// porque modelos de linguagem erram somas com frequência.
function calcularCustos(roteiro, formData) {
    let total = 0;
    let semPreco = 0; // itens que a IA não mandou o preço (não entram na soma)

    (roteiro.dias || []).forEach(dia => {
        let totalDia = 0;

        (dia.atividades || []).forEach(atividade => {
            atividade.custoEstimado = numeroOuNulo(atividade.custoEstimado);
            atividade.reserva = /^(sim|s|true)/i.test(String(atividade.reserva || '').trim());

            if (atividade.custoEstimado === null) semPreco++;
            else totalDia += atividade.custoEstimado;
        });

        const custosRefeicoes = dia.refeicoesCustos || {};
        ['cafe', 'almoco', 'jantar'].forEach(chave => {
            custosRefeicoes[chave] = numeroOuNulo(custosRefeicoes[chave]);

            if (custosRefeicoes[chave] === null) semPreco++;
            else totalDia += custosRefeicoes[chave];
        });
        dia.refeicoesCustos = custosRefeicoes;

        dia.transporteLocalDia = numeroSeguro(dia.transporteLocalDia);
        totalDia += dia.transporteLocalDia;

        dia.custoTotalDia = totalDia;
        total += totalDia;
    });

    const limite = numeroSeguro(formData.orcamentoValor);
    roteiro.custoTotalEstimado = total;
    roteiro.custosSemPreco = semPreco;
    roteiro.acimaDoOrcamento = limite > 0 && total > limite;

    return roteiro;
}

// Lista de países (para bloquear destino "só o país")
const PAISES_CONHECIDOS = [
    'frança', 'brasil', 'japão', 'espanha', 'estados unidos', 'eua', 'itália', 'reino unido',
    'holanda', 'países baixos', 'emirados árabes unidos', 'eau', 'argentina', 'chile', 'portugal',
    'alemanha', 'méxico', 'peru', 'colômbia', 'uruguai', 'canadá', 'austrália', 'china', 'coreia do sul',
    'tailândia', 'grécia', 'turquia', 'egito', 'marrocos', 'índia', 'indonésia', 'vietnã', 'suíça',
    'áustria', 'bélgica', 'irlanda', 'escócia', 'noruega', 'suécia', 'dinamarca', 'finlândia', 'polônia',
    'rússia', 'cuba', 'costa rica', 'panamá', 'equador', 'bolívia', 'paraguai', 'venezuela', 'nova zelândia',
    'áfrica do sul', 'malásia', 'filipinas', 'catar', 'arábia saudita', 'israel', 'jordânia'
];

// Cidades conhecidas -> país (usado para sugerir/completar automaticamente)
const CIDADE_PARA_PAIS = {
    'paris': 'França', 'rio de janeiro': 'Brasil', 'são paulo': 'Brasil', 'sao paulo': 'Brasil',
    'tóquio': 'Japão', 'toquio': 'Japão', 'barcelona': 'Espanha', 'madri': 'Espanha', 'madrid': 'Espanha',
    'nova york': 'Estados Unidos', 'los angeles': 'Estados Unidos', 'miami': 'Estados Unidos',
    'roma': 'Itália', 'milão': 'Itália', 'milao': 'Itália', 'veneza': 'Itália', 'florença': 'Itália',
    'londres': 'Reino Unido', 'amsterdã': 'Holanda', 'amsterda': 'Holanda', 'dubai': 'Emirados Árabes Unidos',
    'curitiba': 'Brasil', 'florianópolis': 'Brasil', 'florianopolis': 'Brasil', 'gramado': 'Brasil',
    'buenos aires': 'Argentina', 'santiago': 'Chile', 'lisboa': 'Portugal', 'porto': 'Portugal',
    'berlim': 'Alemanha', 'munique': 'Alemanha', 'cidade do méxico': 'México', 'cancún': 'México',
    'cancun': 'México', 'lima': 'Peru', 'cusco': 'Peru', 'bogotá': 'Colômbia', 'bogota': 'Colômbia',
    'montevidéu': 'Uruguai', 'montevideu': 'Uruguai', 'toronto': 'Canadá', 'vancouver': 'Canadá',
    'sydney': 'Austrália', 'melbourne': 'Austrália', 'pequim': 'China', 'xangai': 'China',
    'seul': 'Coreia do Sul', 'bangkok': 'Tailândia', 'atenas': 'Grécia', 'santorini': 'Grécia',
    'istambul': 'Turquia', 'cairo': 'Egito', 'marrakech': 'Marrocos', 'nova déli': 'Índia',
    'mumbai': 'Índia', 'bali': 'Indonésia', 'jacarta': 'Indonésia', 'hanói': 'Vietnã', 'hanoi': 'Vietnã',
    'zurique': 'Suíça', 'genebra': 'Suíça', 'viena': 'Áustria', 'bruxelas': 'Bélgica', 'dublin': 'Irlanda',
    'edimburgo': 'Escócia', 'oslo': 'Noruega', 'estocolmo': 'Suécia', 'copenhague': 'Dinamarca',
    'helsinque': 'Finlândia', 'varsóvia': 'Polônia', 'moscou': 'Rússia', 'havana': 'Cuba',
    'quito': 'Equador', 'la paz': 'Bolívia', 'caracas': 'Venezuela', 'auckland': 'Nova Zelândia',
    'cidade do cabo': 'África do Sul', 'kuala lumpur': 'Malásia', 'manila': 'Filipinas', 'doha': 'Catar',
    'tel aviv': 'Israel', 'jerusalém': 'Israel'
};

// ===== Datas =====
// Trabalha com strings "AAAA-MM-DD" (formato do <input type="date">) em UTC,
// para que somar dias nunca "pule" um dia por causa de fuso ou horário de verão.
function hojeLocalISO() {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${agora.getFullYear()}-${mes}-${dia}`;
}

function somarDias(dataISO, dias) {
    const [ano, mes, dia] = dataISO.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia + dias));
    return data.toISOString().split('T')[0];
}

// Quantidade de dias da viagem contando o primeiro e o último (10/03 a 11/03 = 2 dias)
function diasEntre(inicioISO, fimISO) {
    const [a1, m1, d1] = inicioISO.split('-').map(Number);
    const [a2, m2, d2] = fimISO.split('-').map(Number);
    return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000) + 1;
}

class CreateItineraryManager {
    constructor() {
        this.currentStep = 1;
        this.formData = {
            destino: '',
            duracao: '',
            pessoas: '',
            dataInicio: '',
            dataFim: '',
            interesses: [],
            orcamento: 'moderado',
            origem: '',
            orcamentoValor: ''
        };

        this.setupEventListeners();
        this.updateProgressBar();
        this.debugApiKey();
        this.checkAuth();
        this.setupDateLimits();
        this.preencherParaEdicao();
    }

    // "Ajustar preferências" na página de resultado abre criar.html?editar=<id>
    preencherParaEdicao() {
        const editar = new URLSearchParams(window.location.search).get('editar');
        if (!editar) return;

        let dados = null;

        try {
            if (editar === 'sessao') {
                dados = JSON.parse(sessionStorage.getItem('viajai_editar') || 'null');
                sessionStorage.removeItem('viajai_editar');
            } else {
                const salvo = JSON.parse(localStorage.getItem(editar) || 'null');
                if (salvo) {
                    const roteiro = salvo.roteiro || {};
                    dados = {
                        destino: salvo.destino || roteiro.destino,
                        duracao: salvo.duracao || roteiro.duracao,
                        pessoas: salvo.pessoas || roteiro.pessoas,
                        dataInicio: salvo.dataInicio,
                        dataFim: salvo.dataFim,
                        interesses: salvo.interesses || roteiro.interesses,
                        orcamento: salvo.orcamento || roteiro.orcamento,
                        origem: salvo.origem || roteiro.origem,
                        orcamentoValor: salvo.orcamentoValor || roteiro.orcamentoValor
                    };
                }
            }
        } catch (e) {
            console.warn('Não foi possível carregar os dados para edição:', e);
        }

        if (!dados) return;

        const hoje = hojeLocalISO();
        const setValor = (id, valor) => {
            const el = document.getElementById(id);
            if (el && valor !== undefined && valor !== null && valor !== '') el.value = valor;
        };

        setValor('destino', dados.destino);
        setValor('duracaoDias', dados.duracao);
        setValor('qtdPessoas', dados.pessoas);
        setValor('origem', dados.origem);
        setValor('orcamentoValor', dados.orcamentoValor);

        // Datas que já passaram não são reaproveitadas
        if (dados.dataInicio && dados.dataInicio >= hoje) setValor('dataInicio', dados.dataInicio);
        if (dados.dataFim && dados.dataFim >= hoje) setValor('dataFim', dados.dataFim);

        (dados.interesses || []).forEach(valor => {
            const cb = document.querySelector(`input[name="interesses"][value="${valor}"]`);
            if (cb) cb.checked = true;
        });

        if (dados.orcamento) {
            const radio = document.querySelector(`input[name="orcamento"][value="${dados.orcamento}"]`);
            if (radio) radio.checked = true;
        }

        // Se só uma das datas antigas ainda vale, descarta as duas (evita par incompleto)
        const campoInicio = document.getElementById('dataInicio');
        const campoFim = document.getElementById('dataFim');
        if (campoInicio && campoFim && (!campoInicio.value || !campoFim.value)) {
            campoInicio.value = '';
            campoFim.value = '';
        }
        this.sincronizarDatas('inicio');

        this.formData = {
            destino: document.getElementById('destino')?.value || '',
            duracao: document.getElementById('duracaoDias')?.value || '',
            pessoas: document.getElementById('qtdPessoas')?.value || '',
            dataInicio: document.getElementById('dataInicio')?.value || '',
            dataFim: document.getElementById('dataFim')?.value || '',
            interesses: Array.from(document.querySelectorAll('input[name="interesses"]:checked')).map(cb => cb.value),
            orcamento: document.querySelector('input[name="orcamento"]:checked')?.value || 'moderado',
            origem: document.getElementById('origem')?.value || '',
            orcamentoValor: document.getElementById('orcamentoValor')?.value || ''
        };

        this.updateSummary();
    }

    setupDateLimits() {
        const hoje = hojeLocalISO();
        const dataInicio = document.getElementById('dataInicio');
        const dataFim = document.getElementById('dataFim');

        if (dataInicio) {
            dataInicio.min = hoje;
        }

        if (dataFim) {
            dataFim.min = hoje;
        }
    }

    checkAuth() {
        // Não permitir que usuários não logados iniciem a criação de um roteiro.
        // Usa onAuthStateChanged pois o estado de login do Firebase é assíncrono.
        auth.onAuthStateChanged((user) => {
            if (!user) {
                alert('Você precisa estar logado para gerar um roteiro. Faça login ou cadastre-se para continuar.');
                window.location.href = 'login.html';
            }
        });
    }

    debugApiKey() {
        const chave = window.OPENAI_API_KEY;

        if (!chave || chave === 'COLE_SUA_CHAVE_AQUI') {
            console.warn('⚠️ Chave da OpenAI não configurada (veja js/config-openai.example.js).');
        } else {
            console.log('✅ Chave da OpenAI configurada');
        }
    }

    setupEventListeners() {
        const form = document.getElementById('createForm');

        const nextButtons = document.querySelectorAll('.next-step');
        const prevButtons = document.querySelectorAll('.prev-step');

        nextButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();

                if (this.validateStep(this.currentStep)) {
                    const nextStep = parseInt(btn.getAttribute('data-next'));
                    this.goToStep(nextStep);
                }
            });
        });

        prevButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();

                const prevStep = parseInt(btn.getAttribute('data-prev'));
                this.goToStep(prevStep);
            });
        });

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateItinerary();
            });
        }

        const destinoInput = document.getElementById('destino');

        if (destinoInput) {
            destinoInput.addEventListener('input', (e) => {
                this.showSuggestions(e.target.value);
                this.formData.destino = e.target.value;
                this.updateSummary();
            });
        }

        const origemInput = document.getElementById('origem');

        if (origemInput) {
            origemInput.addEventListener('input', (e) => {
                this.formData.origem = e.target.value;
                this.updateSummary();
            });
        }

        const orcamentoValorInput = document.getElementById('orcamentoValor');

        if (orcamentoValorInput) {
            orcamentoValorInput.addEventListener('input', (e) => {
                this.formData.orcamentoValor = e.target.value;
                this.updateSummary();
            });
        }

        const duracaoDias = document.getElementById('duracaoDias');
        const dataInicio = document.getElementById('dataInicio');
        const dataFim = document.getElementById('dataFim');

        // Mudou a duração: recalcula a data de término a partir da data de início
        if (duracaoDias) {
            duracaoDias.addEventListener('input', (e) => {
                this.formData.duracao = e.target.value;
                this.sincronizarDatas('duracao');
                this.updateSummary();
            });
        }

        const qtdPessoas = document.getElementById('qtdPessoas');

        if (qtdPessoas) {
            qtdPessoas.addEventListener('input', (e) => {
                this.formData.pessoas = e.target.value;
                this.updateSummary();
            });
        }

        // Escolheu a data de início: preenche a de término com base na duração
        if (dataInicio) {
            dataInicio.addEventListener('change', () => {
                this.sincronizarDatas('inicio');
                this.updateSummary();
            });
        }

        // Escolheu a data de término: ajusta a duração (ou a data de início)
        if (dataFim) {
            dataFim.addEventListener('change', () => {
                this.sincronizarDatas('fim');
                this.updateSummary();
            });
        }

        document.querySelectorAll('input[name="interesses"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.formData.interesses = Array.from(
                    document.querySelectorAll('input[name="interesses"]:checked')
                ).map(cb => cb.value);

                this.updateSummary();
            });
        });

        document.querySelectorAll('input[name="orcamento"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.formData.orcamento = e.target.value;
                this.updateSummary();
            });
        });

        this.updateSummary();
    }

    // Mantém duração, data de início e data de término coerentes entre si.
    // "origem" indica qual campo o usuário acabou de alterar.
    sincronizarDatas(origem) {
        const campoDuracao = document.getElementById('duracaoDias');
        const campoInicio = document.getElementById('dataInicio');
        const campoFim = document.getElementById('dataFim');
        const dicaDatas = document.getElementById('dicaDatas');

        if (!campoDuracao || !campoInicio || !campoFim) return;

        const hoje = hojeLocalISO();
        const duracao = Number(campoDuracao.value);
        const duracaoValida = Number.isInteger(duracao) && duracao >= 1 && duracao <= MAX_DIAS;
        let aviso = '';

        if (origem === 'inicio' || origem === 'duracao') {
            if (campoInicio.value && duracaoValida) {
                campoFim.value = somarDias(campoInicio.value, duracao - 1);
            }
        } else if (origem === 'fim' && campoFim.value) {
            if (campoInicio.value) {
                const dias = diasEntre(campoInicio.value, campoFim.value);

                if (dias < 1) {
                    aviso = 'A data de término não pode ser antes da data de início.';
                    campoFim.value = duracaoValida ? somarDias(campoInicio.value, duracao - 1) : campoInicio.value;
                } else if (dias > MAX_DIAS) {
                    aviso = `A viagem pode ter no máximo ${MAX_DIAS} dias.`;
                    campoFim.value = somarDias(campoInicio.value, MAX_DIAS - 1);
                    campoDuracao.value = MAX_DIAS;
                } else {
                    campoDuracao.value = dias;
                }
            } else if (duracaoValida) {
                // Só informou a data de término: calcula a de início pela duração
                const inicio = somarDias(campoFim.value, -(duracao - 1));
                if (inicio >= hoje) campoInicio.value = inicio;
            }
        }

        // Limites do calendário: término entre o início e o máximo de dias permitido
        campoInicio.min = hoje;
        campoFim.min = campoInicio.value || hoje;
        campoFim.max = campoInicio.value ? somarDias(campoInicio.value, MAX_DIAS - 1) : '';

        this.formData.duracao = campoDuracao.value;
        this.formData.dataInicio = campoInicio.value;
        this.formData.dataFim = campoFim.value;

        if (dicaDatas) {
            dicaDatas.textContent = aviso || (campoInicio.value && campoFim.value
                ? `Viagem de ${this.formatarData(campoInicio.value)} a ${this.formatarData(campoFim.value)} (${campoDuracao.value} dia${Number(campoDuracao.value) > 1 ? 's' : ''}).`
                : 'Opcional. Ao escolher a data de início, a de término é preenchida pela duração.');
            dicaDatas.classList.toggle('aviso', Boolean(aviso));
        }
    }

    showSuggestions(value) {
        const suggestionsDiv = document.getElementById('suggestions');

        if (!suggestionsDiv) return;

        suggestionsDiv.innerHTML = '';

        if (value.length < 2) return;

        const popularDestinos = [
            'Paris, França',
            'Rio de Janeiro, Brasil',
            'Tóquio, Japão',
            'Barcelona, Espanha',
            'Nova York, EUA',
            'Roma, Itália',
            'Londres, Reino Unido',
            'Amsterdã, Holanda',
            'Dubai, EAU',
            'Singapura',
            'Curitiba, Brasil',
            'Florianópolis, Brasil',
            'Gramado, Brasil',
            'Buenos Aires, Argentina',
            'Santiago, Chile'
        ];

        const filtered = popularDestinos.filter(destino =>
            destino.toLowerCase().includes(value.toLowerCase())
        );

        filtered.forEach(destino => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = destino;

            div.addEventListener('click', () => {
                const destinoInput = document.getElementById('destino');

                if (destinoInput) {
                    destinoInput.value = destino;
                }

                this.formData.destino = destino;
                suggestionsDiv.innerHTML = '';
                this.updateSummary();
            });

            suggestionsDiv.appendChild(div);
        });
    }

    validateStep(step) {
        switch (step) {
            case 1:
                return this.validateDestino() && this.validateOrigem();

            case 2:
                return this.validateDuracaoEPessoas();

            case 3:
                return this.validateInteresses();

            case 4:
                return this.validateOrcamento();

            default:
                return true;
        }
    }

    validateOrcamento() {
        const selecionado = document.querySelector('input[name="orcamento"]:checked');

        if (!selecionado) {
            this.showError('Selecione um orçamento para continuar');
            return false;
        }

        const valorBruto = (document.getElementById('orcamentoValor')?.value || '').trim();

        if (valorBruto !== '') {
            const valor = Number(valorBruto);

            if (!isFinite(valor) || valor <= 0 || valor > 1000000) {
                this.showError('Informe um valor em reais maior que zero (ou deixe o campo em branco)');
                return false;
            }

            this.formData.orcamentoValor = String(Math.round(valor));
        } else {
            this.formData.orcamentoValor = '';
        }

        this.formData.orcamento = selecionado.value;
        this.updateSummary();
        return true;
    }

    validateOrigem() {
        const valor = (document.getElementById('origem')?.value || '').trim();

        if (valor.length < 2) {
            this.showError('Informe a cidade de onde você sai (ex: Brusque, SC)');
            return false;
        }

        this.formData.origem = valor;
        this.updateSummary();
        return true;
    }

    validateDestino() {
        const destinoInput = document.getElementById('destino');
        const valor = (destinoInput?.value || '').trim();

        if (!valor || valor.length < 3) {
            this.showError('Destino deve ter pelo menos 3 caracteres');
            return false;
        }

        const normalizado = this.normalizarTexto(valor);

        // Bloquear se o usuário informou apenas o nome de um país
        if (PAISES_CONHECIDOS.includes(normalizado)) {
            this.showError(`Inclua também a cidade, não apenas o país. Ex: "Paris, ${valor}"`);
            return false;
        }

        // Se digitou só o nome de uma cidade conhecida (sem o país), completa automaticamente
        if (!valor.includes(',')) {
            const paisDaCidade = CIDADE_PARA_PAIS[normalizado];

            if (paisDaCidade) {
                const destinoCompleto = `${valor}, ${paisDaCidade}`;
                destinoInput.value = destinoCompleto;
                this.formData.destino = destinoCompleto;
                this.updateSummary();
                return true;
            }
        }

        this.formData.destino = valor;
        this.updateSummary();
        return true;
    }

    normalizarTexto(texto) {
        return texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    validateDuracaoEPessoas() {
        const duracao = document.getElementById('duracaoDias')?.value || '';
        const pessoas = document.getElementById('qtdPessoas')?.value || '';
        const dataInicio = document.getElementById('dataInicio')?.value || '';
        const dataFim = document.getElementById('dataFim')?.value || '';

        if (!duracao || isNaN(duracao) || !Number.isInteger(Number(duracao)) || Number(duracao) < 1 || Number(duracao) > MAX_DIAS) {
            this.showError(`A duração deve ser um número inteiro entre 1 e ${MAX_DIAS} dias`);
            return false;
        }

        if (!pessoas || isNaN(pessoas) || Number(pessoas) < 1 || Number(pessoas) > 50) {
            this.showError('Informe a quantidade de pessoas que vão viajar');
            return false;
        }

        if ((dataInicio && !dataFim) || (!dataInicio && dataFim)) {
            this.showError('Preencha as duas datas ou deixe as duas em branco');
            return false;
        }

        if (dataInicio && dataInicio < hojeLocalISO()) {
            this.showError('A data de início não pode estar no passado');
            return false;
        }

        if (dataInicio && dataFim && diasEntre(dataInicio, dataFim) < 1) {
            this.showError('A data de término não pode ser anterior à data de início');
            return false;
        }

        if (dataInicio && dataFim && diasEntre(dataInicio, dataFim) !== Number(duracao)) {
            this.showError(`As datas somam ${diasEntre(dataInicio, dataFim)} dia(s), mas a duração informada é ${duracao}. Ajuste uma das duas.`);
            return false;
        }

        this.formData.duracao = duracao;
        this.formData.pessoas = pessoas;
        this.formData.dataInicio = dataInicio;
        this.formData.dataFim = dataFim;
        this.updateSummary();
        return true;
    }

    validateInteresses() {
        const interesses = Array.from(
            document.querySelectorAll('input[name="interesses"]:checked')
        ).map(cb => cb.value);

        if (interesses.length === 0) {
            this.showError('Selecione pelo menos um interesse');
            return false;
        }

        this.formData.interesses = interesses;
        this.updateSummary();
        return true;
    }

    goToStep(step) {
        const formSteps = document.querySelectorAll('.form-step');
        const maxStep = formSteps.length;

        if (step < 1 || step > maxStep) return;

        formSteps.forEach(formStep => {
            formStep.classList.remove('active');
        });

        const targetStep = document.querySelector(`.form-step[data-step="${step}"]`);

        if (targetStep) {
            targetStep.classList.add('active');
        }

        this.currentStep = step;
        this.updateProgressBar();
        this.updateSummary();

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    updateProgressBar() {
        const progressSteps = document.querySelectorAll('.progress-steps .step');
        const totalSteps = progressSteps.length;

        progressSteps.forEach(stepElement => {
            const stepNumber = parseInt(stepElement.getAttribute('data-step'));

            stepElement.classList.remove('active', 'completed');

            if (stepNumber < this.currentStep) {
                stepElement.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                stepElement.classList.add('active');
            }
        });

        const mobileStepText = document.getElementById('mobileStepText');

        if (mobileStepText) {
            const activeStep = document.querySelector(`.progress-steps .step[data-step="${this.currentStep}"] .step-label`);
            const label = activeStep ? activeStep.textContent : '';
            mobileStepText.textContent = `Passo ${this.currentStep} de ${totalSteps} — ${label}`;
        }
    }

    updateSummary() {
        const summaryDestino = document.getElementById('summaryDestino');
        const summaryDuracao = document.getElementById('summaryDuracao');
        const summaryPessoas = document.getElementById('summaryPessoas');
        const summaryInteresses = document.getElementById('summaryInteresses');
        const summaryPeriodo = document.getElementById('summaryPeriodo');
        const summaryPeriodoWrapper = document.getElementById('summaryPeriodoWrapper');

        if (summaryDestino) {
            summaryDestino.textContent = this.formData.destino || '-';
        }

        const summaryOrigem = document.getElementById('summaryOrigem');

        if (summaryOrigem) {
            summaryOrigem.textContent = this.formData.origem || '-';
        }

        if (summaryDuracao) {
            summaryDuracao.textContent = this.formData.duracao
                ? `${this.formData.duracao} dia${Number(this.formData.duracao) > 1 ? 's' : ''}`
                : '-';
        }

        if (summaryPessoas) {
            summaryPessoas.textContent = this.formData.pessoas
                ? `${this.formData.pessoas} pessoa${Number(this.formData.pessoas) > 1 ? 's' : ''}`
                : '-';
        }

        if (summaryPeriodo && summaryPeriodoWrapper) {
            if (this.formData.dataInicio && this.formData.dataFim) {
                summaryPeriodo.textContent = `${this.formatarData(this.formData.dataInicio)} a ${this.formatarData(this.formData.dataFim)}`;
                summaryPeriodoWrapper.classList.remove('hidden');
            } else {
                summaryPeriodoWrapper.classList.add('hidden');
            }
        }

        if (summaryInteresses) {
            summaryInteresses.textContent = this.formData.interesses.length > 0
                ? this.formData.interesses.join(', ')
                : '-';
        }

        const summaryOrcamento = document.getElementById('summaryOrcamento');

        if (summaryOrcamento) {
            const labels = { economico: '💸 Econômico', moderado: '💰 Moderado', luxo: '💎 Luxo' };
            const valor = numeroSeguro(this.formData.orcamentoValor);
            summaryOrcamento.textContent = (labels[this.formData.orcamento] || '-')
                + (valor ? ` · até R$ ${valor.toLocaleString('pt-BR')} no total` : '');
        }
    }

    formatarData(dataISO) {
        const [ano, mes, dia] = dataISO.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    showError(message) {
        alert('⚠️ ' + message);
    }

    async generateItinerary() {
        const user = firebase.auth().currentUser;

        if (!user) {
            alert('Você precisa estar logado para gerar um roteiro');
            window.location.href = 'login.html';
            return;
        }

        if (!window.OPENAI_API_KEY || window.OPENAI_API_KEY === 'COLE_SUA_CHAVE_AQUI') {
            alert('❌ Chave da OpenAI não configurada. Crie o arquivo js/config-openai.js (modelo: js/config-openai.example.js) e cole a sua chave.');
            console.error('window.OPENAI_API_KEY não está definida');
            return;
        }

        try {
            const btnGenerate = document.getElementById('btnGenerate');
            const generateText = document.getElementById('generateText');
            const generateLoader = document.getElementById('generateLoader');

            if (btnGenerate) {
                btnGenerate.disabled = true;
            }

            if (generateText) {
                generateText.classList.add('hidden');
            }

            if (generateLoader) {
                generateLoader.classList.remove('hidden');
            }

            console.log('📍 Iniciando geração de roteiro...');
            console.log('Usuário logado:', user.uid);
            console.log('Destino:', this.formData.destino);
            console.log('Duração:', this.formData.duracao);
            console.log('Pessoas:', this.formData.pessoas);
            console.log('Interesses:', this.formData.interesses);

            // 1) Busca lugares que existem de verdade no destino (OpenStreetMap).
            //    Se falhar, segue sem a lista (a IA sugere de memória, como antes).
            this.atualizarTextoCarregando(`Buscando lugares reais em ${this.formData.destino.split(',')[0]}...`);
            let lugares = null;

            try {
                lugares = await buscarLugaresReais(this.formData.destino);
                console.log(`📍 Lugares reais encontrados: ${lugares.atracoes.length} atrações, ${lugares.restaurantes.length} restaurantes, ${lugares.cafes.length} cafés`);

                if (lugares.atracoes.length + lugares.restaurantes.length + lugares.cafes.length === 0) {
                    lugares = null;
                }
            } catch (erroLugares) {
                console.warn('⚠️ Não foi possível buscar lugares reais. Gerando sem a lista:', erroLugares.message);
            }

            // 2) Pede o roteiro à IA
            this.atualizarTextoCarregando('Montando seu roteiro com IA...');

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: MODELO_OPENAI,
                    messages: [
                        {
                            role: 'system',
                            content: 'Você é um especialista em planejamento de viagens. Responda somente com JSON válido, sem markdown, sem texto antes ou depois.'
                        },
                        {
                            role: 'user',
                            content: this.buildPrompt(lugares)
                        }
                    ],
                    response_format: {
                        type: 'json_object'
                    },
                    // Baixo (0.4): a IA inventa menos e segue melhor as regras
                    temperature: 0.4,
                    max_tokens: 10000
                })
            });

            console.log('API Response Status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Erro da API:', errorData);

                let errorMessage = 'Erro ao gerar roteiro';

                if (errorData.error?.message) {
                    errorMessage = errorData.error.message;
                }

                if (response.status === 401) {
                    errorMessage = '❌ Chave OpenAI inválida ou expirada';
                } else if (response.status === 429) {
                    errorMessage = '⚠️ Limite de requisições atingido. Tente novamente em alguns minutos.';
                } else if (response.status === 500) {
                    errorMessage = '⚠️ Servidor OpenAI indisponível. Tente novamente.';
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('✅ Resposta OpenAI recebida');

            const content = data.choices[0].message.content;
            console.log('Conteúdo recebido da IA:', content);

            let itinerary;

            try {
                let cleanContent = content.trim();

                cleanContent = cleanContent
                    .replace(/^```json/i, '')
                    .replace(/^```/i, '')
                    .replace(/```$/i, '')
                    .trim();

                itinerary = JSON.parse(cleanContent);
            } catch (e) {
                console.error('Erro ao fazer parse JSON:', e);
                console.error('Conteúdo que veio da IA:', content);
                throw new Error('JSON inválido recebido da IA. Veja o console para conferir a resposta.');
            }

            console.log('✅ JSON parseado com sucesso');

            // 3) Confere os lugares escolhidos pela IA e anexa a localização real
            if (lugares) {
                enriquecerComLugaresReais(itinerary, lugares);
                const fonte = itinerary.fonteLugares;
                console.log(`✅ Lugares verificados no mapa: ${fonte.verificados} de ${fonte.total}`);
            }

            // 4) Soma os custos estimados e confere se passou do limite informado
            calcularCustos(itinerary, this.formData);

            const docId = await this.saveItinerary(itinerary);
            console.log('✅ Roteiro salvo com ID:', docId);

            window.location.href = `resultado.html?id=${docId}`;

        } catch (error) {
            console.error('❌ Erro ao gerar roteiro:', error);
            alert('❌ Erro: ' + error.message);

        } finally {
            const btnGenerate = document.getElementById('btnGenerate');
            const generateText = document.getElementById('generateText');
            const generateLoader = document.getElementById('generateLoader');

            if (btnGenerate) {
                btnGenerate.disabled = false;
            }

            if (generateText) {
                generateText.classList.remove('hidden');
            }

            if (generateLoader) {
                generateLoader.classList.add('hidden');
                generateLoader.textContent = 'Gerando...';
            }
        }
    }

    atualizarTextoCarregando(texto) {
        const generateLoader = document.getElementById('generateLoader');
        if (generateLoader) generateLoader.textContent = texto;
    }

    buildPrompt(lugares = null) {
        const periodo = (this.formData.dataInicio && this.formData.dataFim)
            ? `\nA viagem ocorrerá entre ${this.formatarData(this.formData.dataInicio)} e ${this.formatarData(this.formData.dataFim)}. Leve esse período em consideração (estação do ano, clima, eventos ou datas comemorativas relevantes no destino).\n`
            : '';

        const orcamentoLabels = {
            economico: 'ECONÔMICO (priorize opções baratas, gratuitas ou de baixo custo, lugares populares e acessíveis)',
            moderado: 'MODERADO (equilíbrio entre custo e conforto, meio-termo entre popular e sofisticado)',
            luxo: 'LUXO (priorize experiências premium, restaurantes renomados e locais mais exclusivos)'
        };
        const orcamentoDescricao = orcamentoLabels[this.formData.orcamento] || orcamentoLabels.moderado;

        // Origem e valor em reais: a IA precisa saber de onde a pessoa sai e quanto pode gastar
        const origem = (this.formData.origem || '').trim();
        const valorTotal = numeroSeguro(this.formData.orcamentoValor);
        const qtdPessoas = Number(this.formData.pessoas) || 1;
        const qtdDias = Number(this.formData.duracao) || 1;
        const valorPorPessoaDia = valorTotal ? Math.round(valorTotal / qtdPessoas / qtdDias) : 0;

        const linhaOrcamentoValor = valorTotal
            ? `- Valor total do grupo para passeios, comida e transporte local: R$ ${valorTotal} (sem passagem e sem hospedagem). Isso dá cerca de R$ ${valorPorPessoaDia} por pessoa por dia.
- A SOMA de todos os custos estimados NÃO pode passar de R$ ${valorTotal}. Se o valor for baixo para o destino, prefira opções gratuitas ou baratas (praças, mirantes, feiras, igrejas, transporte público) em vez de estourar o limite.
- O nível de orçamento (${this.formData.orcamento}) define o estilo; o valor em reais é o limite.`
            : `- O valor em reais não foi informado: siga o nível de orçamento (${this.formData.orcamento}) e estime custos médios coerentes com ele.`;

        const blocoViajante = `SOBRE O VIAJANTE E O ORÇAMENTO:
- O viajante sai de: ${origem || 'não informado'}. Considere a distância e o tempo de viagem: o dia 1 deve começar só depois da chegada (poucas atividades, mais tarde) e o último dia deve terminar com folga antes da volta (nada marcado nas últimas horas).
${linhaOrcamentoValor}
- Estime TODOS os custos em reais (R$), convertendo da moeda local, e sempre para o grupo inteiro (${qtdPessoas} pessoa${qtdPessoas > 1 ? 's' : ''}).`;

        const regrasRealismo = `REGRAS PARA O ROTEIRO SER REAL:
- Cada dia fica em uma região só, na ordem do caminho (sem ir e voltar pela cidade).
- Em "comoChegar", diga como ir do ponto anterior até a atividade (meio de transporte e tempo aproximado).
- Respeite horário de funcionamento e dias fechados (museus, mercados e igrejas costumam ter horários e dias fechados). Se não souber, escreva "confirmar horário" na descrição.
- Em "reserva", responda "sim" se precisa reservar ou comprar ingresso antes, ou "não".
- Passeios em outra ilha ou cidade ocupam o dia inteiro; não encaixe outras atividades grandes junto.
- Deixe de 1h30 a 2h para cada atividade e considere o tempo de deslocamento entre elas.
- "custoEstimado" é um número em reais para o grupo todo (use 0 para o que é grátis). "refeicoesCustos" é o gasto estimado de cada refeição para o grupo todo. "transporteLocalDia" é o gasto estimado com transporte local no dia.
- Se você não tiver uma ideia razoável do preço de algo, use null no custo. Não invente valores.
- Valores são estimativas: avise isso em pelo menos uma dica do roteiro.

ERROS PARA EVITAR:
- Não coloque um jantar em uma ilha ou cidade vizinha (ex.: Burano) num dia em que a pessoa está no centro, nem o contrário.
- Não descreva um museu como sendo de um tema que não é o dele (ex.: museu de ciências como "história da cidade").
- Concertos, shows e eventos: escreva "confirmar programação"; não afirme que acontecem em dia e hora certos.
- Lugares famosos e caros (ex.: cafés históricos, passeios turísticos exclusivos) não combinam com orçamento econômico.
- Não repita o mesmo lugar em dias diferentes.

ANTES DE RESPONDER, CONFIRA:
- A soma dos custos é menor que o valor total informado?
- Cada dia fica em uma região só?
- O dia 1 e o último dia estão leves?
- Nenhum lugar se repete e nenhum nome foi inventado?`;

        // Com lista de lugares reais: a IA só pode escolher entre eles
        const regrasLocais = lugares ? `LUGARES REAIS DISPONÍVEIS EM ${this.formData.destino.toUpperCase()} (dados do OpenStreetMap):
${formatarLugaresParaPrompt(lugares)}

REGRAS OBRIGATÓRIAS SOBRE OS LOCAIS:
- As atividades devem usar lugares DESTA LISTA. Coloque o ID do lugar em "lugarId" e use o nome do lugar em "nome" (pode acrescentar a ação, ex: "Visita ao Museu X").
- Escolha os lugares que combinam com os interesses (${this.formData.interesses.join(', ')}) e com o orçamento.
- Café, almoço e jantar devem ser estabelecimentos DESTA LISTA, com o nome escrito exatamente igual. Coloque os IDs em "refeicoesIds".
- Evite repetir o mesmo lugar em dias diferentes. Se a lista acabar, pode repetir restaurantes ou sugerir uma atividade livre SEM nome de estabelecimento (ex: "Caminhada pelo centro histórico") com "lugarId" vazio.
- NUNCA invente nomes de lugares, restaurantes ou cafés que não estejam na lista.
- Se não houver cafés na lista, use uma padaria/restaurante da lista ou escreva "Café da manhã na hospedagem".
- Organize cada dia com lugares próximos entre si quando possível (mesmo bairro/região).` : `MUITO IMPORTANTE SOBRE OS LOCAIS:
- Use nomes REAIS e conhecidos de lugares, restaurantes e cafés que existem de fato em ${this.formData.destino} — nunca invente nomes genéricos ou fictícios (não use algo como "uma boutique local" ou "um restaurante típico" sem nome).
- Em "cafe", sugira um café ou cafeteria real e conhecida, próxima à atividade principal daquele dia, compatível com o orçamento informado.
- Em "almoco" e "jantar", sugira um restaurante real e conhecido, coerente com o orçamento informado (${this.formData.orcamento}).
- Se não tiver certeza do nome exato de um estabelecimento, prefira descrever a atividade sem inventar um nome (ex: "Almoço no centro histórico").`;

        return `Crie um roteiro de viagem para ${this.formData.destino} com duração de ${this.formData.duracao} dias, para ${this.formData.pessoas} pessoa${Number(this.formData.pessoas) > 1 ? 's' : ''}.
${periodo}
Os interesses do viajante são: ${this.formData.interesses.join(', ')}.
O orçamento da viagem é: ${orcamentoDescricao}.

A quantidade de pessoas DEVE aparecer e influenciar o roteiro.
Na descrição do roteiro, mencione claramente que ele foi pensado para ${this.formData.pessoas} pessoa${Number(this.formData.pessoas) > 1 ? 's' : ''}.
Nas atividades, refeições e dicas, considere se a viagem é individual, em casal, família ou grupo, e sempre respeite o nível de orçamento informado.

${blocoViajante}

${regrasLocais}

${regrasRealismo}

Retorne somente um JSON válido, sem markdown, sem explicação e sem texto antes ou depois.

IMPORTANTE:
- Gere exatamente ${this.formData.duracao} dias.
- Para cada dia, gere de 2 a 4 atividades (menos no dia da chegada e no dia da volta).
- Use descrições curtas.
- Não escreva textos longos.
- O JSON precisa estar completo e válido.
- A descrição precisa citar a quantidade de pessoas.
- As dicas precisam considerar a quantidade de pessoas.
- As refeições precisam ser adequadas para ${this.formData.pessoas} pessoa${Number(this.formData.pessoas) > 1 ? 's' : ''} e para o orçamento (${this.formData.orcamento}).

Use exatamente esta estrutura:

{
    "titulo": "Nome do roteiro",
    "destino": "${this.formData.destino}",
    "duracao": ${this.formData.duracao},
    "pessoas": ${this.formData.pessoas},
    "orcamento": "${this.formData.orcamento}",
    "descricao": "Descrição breve mencionando que o roteiro foi pensado para ${this.formData.pessoas} pessoa${Number(this.formData.pessoas) > 1 ? 's' : ''}",
    "dias": [
        {
            "dia": 1,
            "titulo": "Título do dia",
            "atividades": [
                {
                    "horario": "09:00",
                    "nome": "Nome da atividade",
                    "descricao": "Descrição curta considerando a viagem para ${this.formData.pessoas} pessoa${Number(this.formData.pessoas) > 1 ? 's' : ''}",
                    "custoEstimado": 0,
                    "comoChegar": "Como ir do ponto anterior (transporte e tempo)",
                    "reserva": "sim ou não",
                    "local": "Bairro ou região"${lugares ? `,
                    "lugarId": "ID da lista (ex: A3) ou vazio se for atividade livre"` : ''}
                }
            ],
            "refeicoes": {
                "cafe": "${lugares ? 'Nome exato de um café da lista' : 'Nome real de um café/cafeteria conhecido perto da atividade do dia, adequado ao orçamento'}",
                "almoco": "${lugares ? 'Nome exato de um restaurante da lista' : `Nome real de um restaurante conhecido, adequado ao orçamento (${this.formData.orcamento})`}",
                "jantar": "${lugares ? 'Nome exato de um restaurante da lista' : `Nome real de um restaurante conhecido, adequado ao orçamento (${this.formData.orcamento})`}"
            },${lugares ? `
            "refeicoesIds": { "cafe": "C1", "almoco": "R2", "jantar": "R5" },` : ''}
            "refeicoesCustos": { "cafe": 0, "almoco": 0, "jantar": 0 },
            "transporteLocalDia": 0,
            "dicas": "Dica curta considerando a viagem para ${this.formData.pessoas} pessoa${Number(this.formData.pessoas) > 1 ? 's' : ''}"
        }
    ]
}

Retorne APENAS o JSON puro.`;
    }

    async saveItinerary(itinerary) {
        try {
            console.log('💾 Salvando roteiro no localStorage...');

            const localId = 'local_' + Date.now();

            const roteiroData = {
                id: localId,
                titulo: itinerary.titulo || 'Roteiro sem título',
                destino: this.formData.destino,
                duracao: Number(this.formData.duracao),
                pessoas: Number(this.formData.pessoas),
                interesses: this.formData.interesses,
                orcamento: this.formData.orcamento,
                origem: this.formData.origem || '',
                orcamentoValor: numeroSeguro(this.formData.orcamentoValor),
                dataInicio: this.formData.dataInicio || '',
                dataFim: this.formData.dataFim || '',
                descricao: itinerary.descricao || '',
                dias: itinerary.dias || [],
                roteiro: {
                    ...itinerary,
                    id: localId,
                    destino: this.formData.destino,
                    duracao: Number(this.formData.duracao),
                    pessoas: Number(this.formData.pessoas),
                    interesses: this.formData.interesses,
                    orcamento: this.formData.orcamento,
                    origem: this.formData.origem || '',
                    orcamentoValor: numeroSeguro(this.formData.orcamentoValor)
                },
                dataCriacao: new Date().toISOString(),
                compartilhado: false
            };

            localStorage.setItem(localId, JSON.stringify(roteiroData));

            console.log('✅ Roteiro salvo localmente com ID:', localId);

            return localId;

        } catch (erro) {
            console.error('❌ Erro ao salvar localmente:', erro);
            throw new Error('Erro ao salvar roteiro localmente: ' + erro.message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.createManager = new CreateItineraryManager();
    console.log('✅ CreateItineraryManager inicializado');
});