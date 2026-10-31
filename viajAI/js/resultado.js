// Gerenciador da Página de Resultado
class ResultManager {
    constructor() {
        this.itinerary = null;
        this.itineraryId = null;
        this.loadItinerary();
    }

    loadItinerary() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        if (!id) {
            this.loadMockItinerary();
            return;
        }

        this.itineraryId = id;

        if (id.startsWith('local_')) {
            this.fetchLocalItinerary(id);
        } else {
            this.fetchItinerary();
        }
    }

    fetchLocalItinerary(id) {
        try {
            console.log('📦 Buscando roteiro local:', id);

            const savedData = localStorage.getItem(id);

            if (!savedData) {
                console.error('Roteiro local não encontrado');
                this.loadMockItinerary();
                return;
            }

            const data = JSON.parse(savedData);

            this.itinerary = data.roteiro || data;
            this.itinerary.id = data.id || id;
            this.itinerary.interesses = data.interesses || this.itinerary.interesses || [];
            this.itinerary.destino = data.destino || this.itinerary.destino;
            this.itinerary.duracao = data.duracao || this.itinerary.duracao;
            this.itinerary.descricao = data.descricao || this.itinerary.descricao || '';
            this.itinerary.orcamento = data.orcamento || this.itinerary.orcamento || 'moderado';
            this.itinerary.favorito = data.favorito || false;
            this.itinerary.pessoas = data.pessoas || this.itinerary.pessoas || '';
            this.itinerary.dataInicio = data.dataInicio || this.itinerary.dataInicio || '';
            this.itinerary.dataFim = data.dataFim || this.itinerary.dataFim || '';
            this.itinerary.idCompartilhado = data.idCompartilhado || this.itinerary.idCompartilhado || '';
            this.itinerary.dias = this.itinerary.dias || [];
            this.itinerary.origem = data.origem || this.itinerary.origem || '';
            this.itinerary.orcamentoValor = data.orcamentoValor || this.itinerary.orcamentoValor || 0;

            console.log('✅ Roteiro local carregado:', this.itinerary);

            this.renderItinerary();

        } catch (error) {
            console.error('Erro ao buscar roteiro local:', error);
            this.loadMockItinerary();
        }
    }

    async fetchItinerary() {
        try {
            console.log('🔥 Buscando roteiro no Firestore...');

            let doc = await db.collection('roteiros').doc(this.itineraryId).get();

            if (doc.exists) {
                const data = doc.data();

                this.itinerary = data.roteiro || data;
                this.itinerary.id = doc.id;
                this.itinerary.interesses = data.interesses || this.itinerary.interesses || [];
                this.itinerary.destino = data.destino || this.itinerary.destino;
                this.itinerary.duracao = data.duracao || this.itinerary.duracao;

                this.renderItinerary();
                return;
            }

            console.warn('Roteiro não encontrado no Firestore. Carregando exemplo.');
            this.loadMockItinerary();

        } catch (error) {
            console.error('Erro ao buscar roteiro:', error);
            this.loadMockItinerary();
        }
    }

    loadMockItinerary() {
        this.itinerary = {
            titulo: 'Roteiro de Exemplo',
            destino: 'Paris, França',
            duracao: 2,
            descricao: 'Exemplo de roteiro para demonstração.',
            interesses: ['cultura', 'gastronomia'],
            orcamento: 'moderado',
            favorito: false,
            dias: [
                {
                    dia: 1,
                    titulo: 'Imersão Cultural',
                    atividades: [
                        {
                            horario: '09:00',
                            nome: 'Museu do Louvre',
                            descricao: 'Visita a um dos museus mais famosos do mundo.',
                            local: 'Museu do Louvre',
                            rating: 4.8
                        },
                        {
                            horario: '14:00',
                            nome: 'Caminhada pelo Centro',
                            descricao: 'Passeio pelos principais pontos turísticos.',
                            local: 'Centro de Paris',
                            rating: 4.7
                        }
                    ],
                    refeicoes: {
                        cafe: 'Café de Flore, Saint-Germain-des-Prés',
                        almoco: 'Le Comptoir du Relais',
                        jantar: 'Bistrot Paul Bert'
                    },
                    dicas: 'Use roupas confortáveis e reserve ingressos com antecedência.'
                }
            ]
        };

        this.renderItinerary();
    }

    renderItinerary() {
        if (!this.itinerary) {
            this.loadMockItinerary();
            return;
        }

        const title = document.getElementById('itineraryTitle');
        const description = document.getElementById('itineraryDescription');
        const interestChips = document.getElementById('interestChips');
        const itineraryDays = document.getElementById('itineraryDays');

        if (title) {
            title.textContent = this.itinerary.titulo || 'Roteiro gerado';
        }

        if (description) {
            description.textContent = this.itinerary.descricao || '';
        }

        mostrarSeloLugaresVerificados(this.itinerary, description);
        this.mostrarResumoCustos(description);

        if (interestChips) {
            interestChips.innerHTML = '';

            const interesses = this.itinerary.interesses || [];

            interesses.forEach(interesse => {
                const chip = document.createElement('div');
                chip.className = 'interest-chip';
                chip.textContent = interesse.charAt(0).toUpperCase() + interesse.slice(1);
                interestChips.appendChild(chip);
            });
        }

        const budgetReadonly = document.getElementById('budgetReadonly');

        if (budgetReadonly) {
            const labels = { economico: '💸 Econômico', moderado: '💰 Moderado', luxo: '💎 Luxo' };
            budgetReadonly.textContent = (labels[this.itinerary.orcamento] || '💰 Moderado')
                + (Number(this.itinerary.orcamentoValor) ? ` · até R$ ${Number(this.itinerary.orcamentoValor).toLocaleString('pt-BR')}` : '');
        }

        const btnFavorite = document.getElementById('btnFavorite');

        if (btnFavorite) {
            btnFavorite.textContent = this.itinerary.favorito ? '❤️ Favoritado' : '🤍 Favoritar';
        }

        if (!itineraryDays) return;

        itineraryDays.innerHTML = '';

        const dias = this.itinerary.dias || [];
        const temCustos = (Number(this.itinerary.custoTotalEstimado) || 0) > 0;
        const fmtReais = n => 'R$ ' + Number(n).toLocaleString('pt-BR');
        const htmlCusto = (valor, classe) => {
            if (!temCustos) return '';
            if (valor === undefined || valor === null) return `<div class="${classe}">💰 Preço não informado</div>`;
            return `<div class="${classe}">💰 ${Number(valor) > 0 ? '~' + fmtReais(valor) : 'Grátis'}</div>`;
        };

        dias.forEach(dia => {
            const daySection = document.createElement('div');
            daySection.className = 'day-section';

            let activitiesHTML = '<div class="activities-grid">';

            const atividades = dia.atividades || [];

            atividades.forEach((atividade, idx) => {
                const cidade = cidadeDoDestino(this.itinerary.destino);
                // Busca do mais específico (nome do lugar + cidade) ao mais genérico (cidade)
                const imagemHTML = htmlImagem({
                    termos: [
                        atividade.lugarReal && atividade.lugarReal.wikipedia,
                        atividade.lugarReal ? `${atividade.lugarReal.nome} ${cidade}` : '',
                        atividade.nome ? `${atividade.nome} ${cidade}` : '',
                        atividade.local ? `${atividade.local} ${cidade}` : '',
                        cidade
                    ],
                    alt: atividade.nome || 'Atividade',
                    largura: 300,
                    altura: 220
                });

                activitiesHTML += `
                    <div class="activity-card">
                        <div class="activity-image">
                            ${imagemHTML}
                        </div>
                        <div class="activity-info">
                            <div class="activity-time">${atividade.horario || ''}</div>
                            <div class="activity-name">${escaparHTML(atividade.nome || 'Atividade')}</div>
                            <div class="activity-location">📍 ${escaparHTML(atividade.local || 'Local não informado')}</div>
                            ${htmlLinkMapa(atividade.lugarReal)}
                            ${atividade.comoChegar ? `<div class="activity-extra">🚶 ${escaparHTML(atividade.comoChegar)}</div>` : ''}
                            ${atividade.reserva === true ? '<div class="activity-extra">🎟️ Reserve ou compre o ingresso antes</div>' : ''}
                            ${htmlCusto(atividade.custoEstimado, 'activity-extra')}
                        </div>
                    </div>
                `;
            });

            activitiesHTML += '</div>';

            const refeicoes = dia.refeicoes || {};
            const refeicoesReais = dia.refeicoesReais || {};

            daySection.innerHTML = `
                <div class="day-header">
                    <div class="day-badge">Dia ${dia.dia || ''}</div>
                    <h2>${dia.titulo || 'Dia do roteiro'}</h2>
                </div>

                ${activitiesHTML}

                <div class="meals-section">
                    <h4>Refeições</h4>
                    <div class="meals-grid">
                        <div class="meal-item">
                            <div class="meal-label">Café</div>
                            <div class="meal-name">${escaparHTML(refeicoes.cafe || 'Sugestão não informada')}</div>
                            ${htmlCusto((dia.refeicoesCustos || {}).cafe, 'meal-cost')}
                            ${htmlLinkMapa(refeicoesReais.cafe, this.itinerary, refeicoes.cafe)}
                        </div>
                        <div class="meal-item">
                            <div class="meal-label">Almoço</div>
                            <div class="meal-name">${escaparHTML(refeicoes.almoco || 'Sugestão não informada')}</div>
                            ${htmlCusto((dia.refeicoesCustos || {}).almoco, 'meal-cost')}
                            ${htmlLinkMapa(refeicoesReais.almoco, this.itinerary, refeicoes.almoco)}
                        </div>
                        <div class="meal-item">
                            <div class="meal-label">Jantar</div>
                            <div class="meal-name">${escaparHTML(refeicoes.jantar || 'Sugestão não informada')}</div>
                            ${htmlCusto((dia.refeicoesCustos || {}).jantar, 'meal-cost')}
                            ${htmlLinkMapa(refeicoesReais.jantar, this.itinerary, refeicoes.jantar)}
                        </div>
                    </div>
                </div>

                ${temCustos && dia.custoTotalDia ? `<div class="day-cost">💰 Custo estimado do dia: <strong>${fmtReais(dia.custoTotalDia)}</strong>${dia.transporteLocalDia ? ` (inclui ~${fmtReais(dia.transporteLocalDia)} de transporte local)` : ''}</div>` : ''}

                <div class="tips-section">
                    <h4>💡 Dicas Importantes</h4>
                    <p>${dia.dicas || 'Sem dicas adicionais.'}</p>
                </div>
            `;

            itineraryDays.appendChild(daySection);
        });

        carregarImagensReais(itineraryDays);
        this.setupEventListeners();
    }

    // Mostra o custo total estimado (e avisa se passou do limite que a pessoa informou)
    mostrarResumoCustos(descricaoEl) {
        const anterior = document.getElementById('resumoCustos');
        if (anterior) anterior.remove();

        const total = Number(this.itinerary.custoTotalEstimado) || 0;
        if (!total || !descricaoEl) return;

        const limite = Number(this.itinerary.orcamentoValor) || 0;
        const fmt = n => 'R$ ' + Number(n).toLocaleString('pt-BR');

        const caixa = document.createElement('div');
        caixa.id = 'resumoCustos';
        caixa.className = 'resumo-custos' + (this.itinerary.acimaDoOrcamento ? ' acima' : '');

        const linha1 = document.createElement('div');
        linha1.textContent = `💰 Custo estimado para o grupo: ${fmt(total)}` + (limite ? ` (seu limite: ${fmt(limite)})` : '');
        caixa.appendChild(linha1);

        if (this.itinerary.acimaDoOrcamento) {
            const aviso = document.createElement('div');
            aviso.textContent = '⚠️ A estimativa passou do seu limite. Gere de novo com um valor maior ou troque alguns passeios.';
            caixa.appendChild(aviso);
        }

        const semPreco = Number(this.itinerary.custosSemPreco) || 0;
        if (semPreco > 0) {
            const faltam = document.createElement('div');
            faltam.textContent = `ℹ️ ${semPreco} ite${semPreco > 1 ? 'ns' : 'm'} sem preço informado ${semPreco > 1 ? 'não entram' : 'não entra'} nessa soma.`;
            caixa.appendChild(faltam);
        }

        const nota = document.createElement('small');
        nota.textContent = 'Passeios, comida e transporte local, sem passagem e hospedagem. São estimativas feitas pela IA: confirme preços e horários antes de reservar.';
        caixa.appendChild(nota);

        descricaoEl.insertAdjacentElement('afterend', caixa);
    }

    setupEventListeners() {
        const btnSave = document.getElementById('btnSave');
        const btnShare = document.getElementById('btnShare');
        const btnExport = document.getElementById('btnExport');
        const btnFinalize = document.getElementById('btnFinalize');
        const btnEdit = document.getElementById('btnEdit');
        const btnNewItinerary = document.getElementById('btnNewItinerary');

        if (btnSave) {
            btnSave.onclick = () => this.saveItinerary();
        }

        const btnFavorite = document.getElementById('btnFavorite');

        if (btnFavorite) {
            btnFavorite.onclick = () => this.toggleFavorite();
        }

        this.setupHotelLinks();

        if (btnShare) {
            btnShare.onclick = () => this.shareItinerary();
        }

        if (btnExport) {
            btnExport.onclick = () => this.exportToPDF();
        }

        if (btnFinalize) {
            btnFinalize.onclick = () => this.finalizeAndBook();
        }

        if (btnEdit) {
            btnEdit.onclick = () => this.editItinerary();
        }

        if (btnNewItinerary) {
            btnNewItinerary.onclick = () => window.location.href = 'criar.html';
        }
    }

    async saveItinerary() {
        try {
            const btn = document.getElementById('btnSave');

            if (btn) {
                btn.textContent = 'Salvando...';
                btn.disabled = true;
            }

            const localId = this.itinerary.id || 'local_' + Date.now();

            this.itinerary.id = localId;

            const existente = localStorage.getItem(localId);
            const base = existente ? JSON.parse(existente) : {};

            localStorage.setItem(localId, JSON.stringify({
                ...base,
                id: localId,
                roteiro: this.itinerary,
                interesses: this.itinerary.interesses || [],
                destino: this.itinerary.destino || '',
                duracao: this.itinerary.duracao || '',
                descricao: this.itinerary.descricao || '',
                orcamento: this.itinerary.orcamento || 'moderado',
                favorito: this.itinerary.favorito || base.favorito || false,
                dataAtualizacao: new Date().toISOString(),
                dataCriacao: base.dataCriacao || new Date().toISOString()
            }));

            alert('Roteiro salvo localmente com sucesso!');

            if (btn) {
                btn.textContent = '💾 Roteiro Salvo';
                btn.disabled = false;
            }

        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar roteiro');

            const btn = document.getElementById('btnSave');

            if (btn) {
                btn.textContent = 'Salvar';
                btn.disabled = false;
            }
        }
    }

    async toggleFavorite() {
        const btn = document.getElementById('btnFavorite');

        try {
            // Garante que o roteiro já esteja salvo antes de favoritar
            const localId = this.itinerary.id || 'local_' + Date.now();
            this.itinerary.id = localId;

            const novoValor = !this.itinerary.favorito;
            this.itinerary.favorito = novoValor;

            const existente = localStorage.getItem(localId);
            const base = existente ? JSON.parse(existente) : {};

            localStorage.setItem(localId, JSON.stringify({
                ...base,
                id: localId,
                roteiro: this.itinerary,
                interesses: this.itinerary.interesses || [],
                destino: this.itinerary.destino || '',
                duracao: this.itinerary.duracao || '',
                descricao: this.itinerary.descricao || '',
                orcamento: this.itinerary.orcamento || 'moderado',
                favorito: novoValor,
                dataAtualizacao: new Date().toISOString(),
                dataCriacao: base.dataCriacao || new Date().toISOString()
            }));

            if (btn) {
                btn.textContent = novoValor ? '❤️ Favoritado' : '🤍 Favoritar';
            }

        } catch (error) {
            console.error('Erro ao favoritar:', error);
            alert('Não foi possível favoritar o roteiro.');
        }
    }

    setupHotelLinks() {
        const destino = this.itinerary?.destino || '';
        const hotelButtons = document.querySelectorAll('#hotelsGrid .hotel-card button');

        hotelButtons.forEach(btn => {
            btn.onclick = () => {
                const query = encodeURIComponent(destino);
                window.open(`https://www.booking.com/searchresults.html?ss=${query}`, '_blank');
            };
        });
    }

    // Publica o roteiro no Firestore (coleção "roteiros") para que o link
    // funcione em qualquer dispositivo. Retorna o ID do documento público.
    async publicarRoteiro() {
        // Roteiro que já veio do Firestore: o próprio ID já é público
        if (this.itineraryId && !this.itineraryId.startsWith('local_')) {
            return this.itineraryId;
        }

        if (this.itinerary.idCompartilhado) {
            return this.itinerary.idCompartilhado;
        }

        if (!window.db) {
            throw new Error('Firestore não está disponível nesta página.');
        }

        const user = firebase.auth().currentUser;
        const dados = {
            ...this.dadosParaCompartilhar(),
            userId: user ? user.uid : null,
            compartilhado: true,
            dataCriacao: new Date().toISOString()
        };

        const docRef = await window.db.collection('roteiros').add(dados);

        // Guarda o ID público junto do roteiro local, para não publicar duas vezes
        this.itinerary.idCompartilhado = docRef.id;

        const localId = this.itinerary.id;
        const existente = localId ? localStorage.getItem(localId) : null;

        if (existente) {
            const base = JSON.parse(existente);
            base.idCompartilhado = docRef.id;
            base.compartilhado = true;
            if (base.roteiro) base.roteiro.idCompartilhado = docRef.id;
            localStorage.setItem(localId, JSON.stringify(base));
        }

        return docRef.id;
    }

    // Dados do roteiro que vão para o link compartilhado
    dadosParaCompartilhar() {
        const user = firebase.auth().currentUser;

        // JSON.parse(JSON.stringify()) remove campos "undefined", que o Firestore não aceita
        return JSON.parse(JSON.stringify({
            titulo: this.itinerary.titulo || 'Roteiro de viagem',
            destino: this.itinerary.destino || '',
            duracao: this.itinerary.duracao || '',
            pessoas: this.itinerary.pessoas || '',
            orcamento: this.itinerary.orcamento || 'moderado',
            interesses: this.itinerary.interesses || [],
            descricao: this.itinerary.descricao || '',
            dias: this.itinerary.dias || [],
            fonteLugares: this.itinerary.fonteLugares || null,
            autorNome: user ? (user.displayName || '') : ''
        }));
    }

    // Gera o link de compartilhamento.
    // 1º tenta o Firestore (link curto). Se ele não responder em 8s ou recusar,
    // usa o plano B: o roteiro vai compactado dentro do próprio link.
    async gerarLinkCompartilhamento() {
        const base = new URL('compartilhado.html', window.location.href).href;

        if (sessionStorage.getItem('viajai_firestore_indisponivel') !== '1') {
            try {
                const tempoEsgotado = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Tempo esgotado ao conectar no Firestore')), 8000);
                });
                const idPublico = await Promise.race([this.publicarRoteiro(), tempoEsgotado]);
                return `${base}?id=${encodeURIComponent(idPublico)}`;
            } catch (error) {
                console.warn(
                    '⚠️ Não foi possível salvar o roteiro no Firestore. Usando link com o roteiro embutido.\n' +
                    'Para links curtos: crie o banco em Firebase Console > Firestore Database e publique as regras do arquivo firestore.rules.\n',
                    error
                );
                // Evita esperar de novo nesta sessão
                sessionStorage.setItem('viajai_firestore_indisponivel', '1');
            }
        }

        const codigo = await codificarRoteiroParaLink(this.dadosParaCompartilhar());
        return `${base}#r=${codigo}`;
    }

    async shareItinerary() {
        const btn = document.getElementById('btnShare');
        const textoOriginal = btn ? btn.textContent : '';

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Gerando link...';
        }

        let shareUrl;

        try {
            shareUrl = await this.gerarLinkCompartilhamento();
        } catch (error) {
            console.error('Erro ao gerar link:', error);
            alert('Não foi possível gerar o link de compartilhamento. Tente novamente.');
            return;
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = textoOriginal;
            }
        }

        const texto = `Confira meu roteiro de viagem para ${this.itinerary.destino}!`;

        if (navigator.share) {
            try {
                await navigator.share({ title: this.itinerary.titulo, text: texto, url: shareUrl });
                return;
            } catch (error) {
                // Usuário fechou a janela de compartilhamento: não faz nada
                if (error && error.name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            alert('Link copiado! Qualquer pessoa com este link pode ver o roteiro.');
        } catch (error) {
            // Sem acesso à área de transferência: mostra o link para copiar manualmente
            prompt('Copie o link do seu roteiro:', shareUrl);
        }
    }

    exportToPDF() {
        exportarRoteiroPDF(this.itinerary, document.getElementById('btnExport'));
    }

    // Abre a busca de hospedagem no Booking já com destino, datas e pessoas
    finalizeAndBook() {
        const params = new URLSearchParams({ ss: this.itinerary.destino || '' });

        if (this.itinerary.dataInicio && this.itinerary.dataFim) {
            params.set('checkin', this.itinerary.dataInicio);
            params.set('checkout', this.itinerary.dataFim);
        }

        if (this.itinerary.pessoas) {
            params.set('group_adults', this.itinerary.pessoas);
        }

        window.open(`https://www.booking.com/searchresults.html?${params.toString()}`, '_blank', 'noopener');
    }

    // Volta para o formulário com as preferências deste roteiro já preenchidas
    editItinerary() {
        const id = this.itinerary.id || this.itineraryId;

        if (id && localStorage.getItem(id)) {
            window.location.href = `criar.html?editar=${encodeURIComponent(id)}`;
        } else {
            // Roteiro de exemplo ou vindo de outro dispositivo: guarda os dados para o formulário
            sessionStorage.setItem('viajai_editar', JSON.stringify({
                destino: this.itinerary.destino,
                duracao: this.itinerary.duracao,
                pessoas: this.itinerary.pessoas,
                interesses: this.itinerary.interesses,
                orcamento: this.itinerary.orcamento,
                origem: this.itinerary.origem,
                orcamentoValor: this.itinerary.orcamentoValor
            }));
            window.location.href = 'criar.html?editar=sessao';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ResultManager();
});