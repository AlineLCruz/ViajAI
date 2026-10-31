// Gerenciador da Página Compartilhada
// Abre roteiros publicados no Firestore pelo botão "Compartilhar" (resultado.html).
// URL: compartilhado.html?id=<id do documento na coleção "roteiros">
class SharedItineraryManager {
    constructor() {
        this.itinerary = null;
        this.itineraryId = null;
        this.setupEventListeners();
        this.loadItinerary();
    }

    loadItinerary() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const codigoNoLink = window.location.hash.startsWith('#r=') ? window.location.hash.slice(3) : '';

        // Link com o roteiro embutido (plano B, quando o Firestore não estava disponível)
        if (codigoNoLink) {
            this.loadFromLink(codigoNoLink);
            return;
        }

        if (!id) {
            // Sem ID: mostra um roteiro de exemplo (útil para demonstração)
            this.loadMockItinerary();
            return;
        }

        this.itineraryId = id;
        this.fetchItinerary();
    }

    async loadFromLink(codigo) {
        try {
            this.itinerary = await decodificarRoteiroDoLink(codigo);
            this.renderItinerary();
        } catch (error) {
            console.error('Link de roteiro inválido:', error);
            this.showStatus('Não foi possível abrir este roteiro. O link pode estar incompleto — peça para enviarem de novo.', true);
        }
    }

    async fetchItinerary() {
        this.showStatus('Carregando roteiro...');

        try {
            if (!window.db) {
                throw new Error('Firestore não está disponível');
            }

            const doc = await window.db.collection('roteiros').doc(this.itineraryId).get();

            if (!doc.exists) {
                this.showStatus('Roteiro não encontrado. O link pode estar incorreto ou o roteiro foi removido.', true);
                return;
            }

            const data = doc.data();
            this.itinerary = { ...(data.roteiro || {}), ...data, id: doc.id };
            this.renderItinerary();

        } catch (error) {
            console.error('Erro ao buscar roteiro:', error);

            const mensagem = error && error.code === 'permission-denied'
                ? 'Este roteiro não pode ser aberto: as regras do Firestore bloquearam a leitura.'
                : 'Não foi possível carregar o roteiro. Verifique sua conexão e tente novamente.';

            this.showStatus(mensagem, true);
        }
    }

    // Mostra uma mensagem no lugar do roteiro (carregando / erro)
    showStatus(mensagem, erro = false) {
        const title = document.getElementById('itineraryTitle');
        const description = document.getElementById('itineraryDescription');
        const days = document.getElementById('itineraryDays');

        if (title) title.textContent = erro ? 'Ops!' : '';
        if (description) description.textContent = mensagem;
        if (days) days.innerHTML = '';

        document.querySelectorAll('#btnSaveToMyAccount, #btnShareAgain, #btnShare, #btnExport').forEach(btn => {
            btn.disabled = erro || !this.itinerary;
        });
    }

    loadMockItinerary() {
        this.itinerary = {
            titulo: 'Primavera em Paris (exemplo)',
            destino: 'Paris, França',
            duracao: 2,
            pessoas: 2,
            orcamento: 'moderado',
            descricao: 'Roteiro de exemplo para 2 pessoas explorando museus, bistrôs e vistas de Paris.',
            interesses: ['cultura', 'gastronomia'],
            dias: [
                {
                    dia: 1,
                    titulo: 'Imersão Artística',
                    atividades: [
                        { horario: '09:00', nome: 'Museu do Louvre', descricao: 'Comece pela Mona Lisa e explore as galerias de arte francesa.', local: 'Museu do Louvre' },
                        { horario: '14:00', nome: 'Jardim das Tulherias', descricao: 'Caminhada tranquila entre o Louvre e a Place de la Concorde.', local: 'Jardin des Tuileries' }
                    ],
                    refeicoes: { cafe: 'Café de Flore', almoco: 'Le Comptoir du Relais', jantar: 'Bistrot Paul Bert' },
                    dicas: 'Compre o ingresso do Louvre com antecedência para evitar filas.'
                },
                {
                    dia: 2,
                    titulo: 'Vista & Vinhos',
                    atividades: [
                        { horario: '10:00', nome: 'Torre Eiffel', descricao: 'Suba até o topo para vistas panorâmicas de Paris.', local: 'Champ de Mars' },
                        { horario: '15:00', nome: 'Passeio por Le Marais', descricao: 'Lojas, galerias e ruas medievais.', local: 'Le Marais' }
                    ],
                    refeicoes: { cafe: 'Boulangerie local', almoco: 'L\'As du Fallafel', jantar: 'Le Relais de l\'Entrecôte' },
                    dicas: 'Leve um casaco leve para o topo da torre.'
                }
            ]
        };

        this.renderItinerary();
    }

    renderItinerary() {
        const e = escaparHTML;
        const roteiro = this.itinerary;

        document.getElementById('itineraryTitle').textContent = roteiro.titulo || 'Roteiro de viagem';
        document.getElementById('itineraryDescription').textContent = roteiro.descricao || '';
        mostrarSeloLugaresVerificados(roteiro, document.getElementById('itineraryDescription'));
        document.title = `${roteiro.titulo || 'Roteiro'} - ViajAI`;

        const sharedByInfo = document.getElementById('sharedByInfo');
        if (sharedByInfo && roteiro.autorNome) {
            sharedByInfo.innerHTML = `<p style="font-size: 14px; color: var(--text-primary); margin: 0;">${e(roteiro.autorNome)}</p>`;
        }

        const interestChips = document.getElementById('interestChips');
        interestChips.innerHTML = '';
        (roteiro.interesses || []).forEach(interesse => {
            const chip = document.createElement('div');
            chip.className = 'interest-chip';
            chip.textContent = interesse.charAt(0).toUpperCase() + interesse.slice(1);
            interestChips.appendChild(chip);
        });

        const itineraryDays = document.getElementById('itineraryDays');
        itineraryDays.innerHTML = '';

        (roteiro.dias || []).forEach(dia => {
            const refeicoes = dia.refeicoes || {};
            const daySection = document.createElement('div');
            daySection.className = 'day-section';

            const cidade = cidadeDoDestino(roteiro.destino);
            const atividadesHTML = (dia.atividades || []).map(atividade => `
                <div class="activity-card">
                    <div class="activity-image">
                        ${htmlImagem({
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
                        })}
                    </div>
                    <div class="activity-info">
                        <div class="activity-time">${e(atividade.horario)}</div>
                        <div class="activity-name">${e(atividade.nome || 'Atividade')}</div>
                        <div class="activity-location">📍 ${e(atividade.local || 'Local não informado')}</div>
                        ${atividade.descricao ? `<div class="activity-location">${e(atividade.descricao)}</div>` : ''}
                        ${htmlLinkMapa(atividade.lugarReal)}
                    </div>
                </div>
            `).join('');

            daySection.innerHTML = `
                <div class="day-header">
                    <div class="day-badge">Dia ${e(dia.dia)}</div>
                    <h2>${e(dia.titulo || 'Dia do roteiro')}</h2>
                </div>
                <div class="activities-grid">${atividadesHTML}</div>
                <div class="meals-section">
                    <h4>Refeições</h4>
                    <div class="meals-grid">
                        <div class="meal-item">
                            <div class="meal-label">Café</div>
                            <div class="meal-name">${e(refeicoes.cafe || 'Sugestão não informada')}</div>
                            ${htmlLinkMapa((dia.refeicoesReais || {}).cafe, roteiro, refeicoes.cafe)}
                        </div>
                        <div class="meal-item">
                            <div class="meal-label">Almoço</div>
                            <div class="meal-name">${e(refeicoes.almoco || 'Sugestão não informada')}</div>
                            ${htmlLinkMapa((dia.refeicoesReais || {}).almoco, roteiro, refeicoes.almoco)}
                        </div>
                        <div class="meal-item">
                            <div class="meal-label">Jantar</div>
                            <div class="meal-name">${e(refeicoes.jantar || 'Sugestão não informada')}</div>
                            ${htmlLinkMapa((dia.refeicoesReais || {}).jantar, roteiro, refeicoes.jantar)}
                        </div>
                    </div>
                </div>
                <div class="tips-section">
                    <h4>💡 Dicas Importantes</h4>
                    <p>${e(dia.dicas || 'Sem dicas adicionais.')}</p>
                </div>
            `;

            itineraryDays.appendChild(daySection);
        });

        carregarImagensReais(itineraryDays);

        document.querySelectorAll('#btnSaveToMyAccount, #btnShareAgain, #btnShare, #btnExport').forEach(btn => {
            btn.disabled = false;
        });
    }

    setupEventListeners() {
        const irParaCriar = () => { window.location.href = 'criar.html'; };

        ['btnCreateOwn', 'btnCreateNow', 'btnUpgradeCreate'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', irParaCriar);
        });

        const btnSaveToMyAccount = document.getElementById('btnSaveToMyAccount');
        if (btnSaveToMyAccount) btnSaveToMyAccount.addEventListener('click', () => this.saveToMyAccount());

        ['btnShareAgain', 'btnShare'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => this.shareItinerary());
        });

        const btnExport = document.getElementById('btnExport');
        if (btnExport) btnExport.addEventListener('click', () => this.exportToPDF());

        // Botões dos hotéis abrem a busca real no Booking para o destino
        document.querySelectorAll('#hotelsGrid .hotel-card button').forEach(btn => {
            btn.addEventListener('click', () => {
                const destino = this.itinerary ? this.itinerary.destino : '';
                window.open(`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destino || '')}`, '_blank', 'noopener');
            });
        });
    }

    // Copia o roteiro para "Minhas Viagens" do usuário (mesmo formato usado em criar.js)
    saveToMyAccount() {
        if (!this.itinerary) return;

        if (!authManager.currentUser) {
            authManager.showAuthModal('login');
            return;
        }

        const localId = 'local_' + Date.now();
        const roteiro = { ...this.itinerary, id: localId, favorito: true };

        localStorage.setItem(localId, JSON.stringify({
            id: localId,
            titulo: roteiro.titulo,
            destino: roteiro.destino || '',
            duracao: roteiro.duracao || '',
            pessoas: roteiro.pessoas || '',
            interesses: roteiro.interesses || [],
            orcamento: roteiro.orcamento || 'moderado',
            descricao: roteiro.descricao || '',
            dias: roteiro.dias || [],
            roteiro: roteiro,
            favorito: true,
            idCompartilhado: this.itineraryId || '',
            dataCriacao: new Date().toISOString()
        }));

        alert('Roteiro salvo em "Minhas Viagens"!');
        window.location.href = 'painel.html';
    }

    async shareItinerary() {
        if (!this.itinerary) return;

        const shareUrl = window.location.href;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: this.itinerary.titulo,
                    text: `Confira este roteiro de viagem para ${this.itinerary.destino}!`,
                    url: shareUrl
                });
                return;
            } catch (error) {
                if (error && error.name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            alert('Link copiado para a área de transferência!');
        } catch (error) {
            prompt('Copie o link do roteiro:', shareUrl);
        }
    }

    exportToPDF() {
        exportarRoteiroPDF(this.itinerary, document.getElementById('btnExport'), 'Roteiro compartilhado via ViajAI');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SharedItineraryManager();
});
