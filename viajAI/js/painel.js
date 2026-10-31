// Gerenciador do Dashboard
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.trips = [];
        this.activeTab = 'explorar';
        this.checkAuth();
        this.setupEventListeners();
    }

    checkAuth() {
        // Aguardar o Firebase confirmar o estado de autenticação antes de decidir,
        // já que authManager.currentUser ainda pode estar vazio nesse momento
        // (o listener onAuthStateChanged é assíncrono).
        auth.onAuthStateChanged((user) => {
            if (!user) {
                // Redirecionar para home se não autenticado
                window.location.href = 'indice.html';
                return;
            }
            this.currentUser = user;
            this.loadTrips();
        });
    }

    setupEventListeners() {
        const btnCreateNew = document.getElementById('btnCreateNew');
        const btnLogout = document.getElementById('btnLogout');

        if (btnCreateNew) {
            btnCreateNew.addEventListener('click', () => {
                window.location.href = 'criar.html';
            });
        }

        if (btnLogout) {
            btnLogout.addEventListener('click', async () => {
                await authManager.logout();
                window.location.href = 'indice.html';
            });
        }

        // Navegação por abas (Explorar / Minhas Viagens / Favoritos)
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });
    }

    switchTab(tab) {
        this.activeTab = tab;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-tab') === tab);
        });

        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        const panel = document.getElementById(`panel${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
        if (panel) panel.classList.remove('hidden');

        const titles = {
            explorar: ['Explorar', 'Sugestões para sua próxima aventura.'],
            viagens: ['Minhas Viagens', 'Todos os roteiros que você já criou.'],
            favoritos: ['Favoritos', 'Os roteiros que você marcou como favoritos.']
        };

        const dashboardTitle = document.getElementById('dashboardTitle');
        const dashboardSubtitle = document.getElementById('dashboardSubtitle');

        if (dashboardTitle && titles[tab]) dashboardTitle.textContent = titles[tab][0];
        if (dashboardSubtitle && titles[tab]) dashboardSubtitle.textContent = titles[tab][1];
    }

    // Lê todos os roteiros salvos localmente (mesmo formato usado em criar.js/resultado.js)
    loadTrips() {
        this.trips = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            if (!key || !key.startsWith('local_')) continue;

            try {
                const data = JSON.parse(localStorage.getItem(key));
                const roteiro = data.roteiro || {};

                this.trips.push({
                    id: data.id || key,
                    titulo: roteiro.titulo || data.destino || 'Roteiro sem título',
                    destino: data.destino || roteiro.destino || '',
                    duracao: data.duracao || roteiro.duracao || '',
                    interesses: data.interesses || roteiro.interesses || [],
                    orcamento: data.orcamento || roteiro.orcamento || 'moderado',
                    favorito: data.favorito || false,
                    dataCriacao: data.dataCriacao || data.dataAtualizacao || new Date().toISOString()
                });
            } catch (e) {
                console.warn('Roteiro local inválido, ignorando:', key);
            }
        }

        // Mais recentes primeiro
        this.trips.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));

        this.renderExplorar();
        this.renderTrips(this.trips, 'tripsGrid', 'Você ainda não criou nenhum roteiro.');
        this.renderTrips(this.trips.filter(t => t.favorito), 'favoritesGrid', 'Você ainda não favoritou nenhum roteiro. Abra um roteiro e toque em "Favoritar".');
    }

    renderExplorar() {
        const aiInsightText = document.getElementById('aiInsightText');
        if (!aiInsightText) return;

        if (this.trips.length === 0) {
            aiInsightText.textContent = 'Crie seu primeiro roteiro para começarmos a sugerir novos destinos com base no seu perfil de viagem!';
            return;
        }

        // Sugestão simples baseada no interesse mais frequente entre os roteiros salvos
        const contagem = {};
        this.trips.forEach(trip => {
            (trip.interesses || []).forEach(interesse => {
                contagem[interesse] = (contagem[interesse] || 0) + 1;
            });
        });

        const interesseTop = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a])[0];

        if (interesseTop) {
            aiInsightText.textContent = `Notamos que você tem preferência por ${interesseTop}. Que tal explorar um novo destino com esse perfil na sua próxima viagem?`;
        } else {
            aiInsightText.textContent = 'Continue criando roteiros para recebermos sugestões cada vez mais personalizadas para você!';
        }
    }

    renderTrips(list, containerId, emptyMessage) {
        const grid = document.getElementById(containerId);
        if (!grid) return;

        grid.innerHTML = '';

        if (list.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🧳</div>
                    <p>${emptyMessage}</p>
                    <button class="btn-primary" id="btnEmptyCreate_${containerId}">✨ Criar roteiro</button>
                </div>
            `;

            const btnEmpty = document.getElementById(`btnEmptyCreate_${containerId}`);
            if (btnEmpty) {
                btnEmpty.addEventListener('click', () => window.location.href = 'criar.html');
            }
            return;
        }

        list.forEach(trip => {
            const cidade = cidadeDoDestino(trip.destino);
            const imagemHTML = htmlImagem({
                termos: [cidade, trip.destino],
                alt: trip.titulo,
                classe: 'trip-image',
                largura: 400,
                altura: 300
            });
            const tripCard = document.createElement('div');
            tripCard.className = 'trip-card';
            tripCard.innerHTML = `
                ${imagemHTML}
                <div class="trip-overlay">
                    <div class="trip-badge">${trip.favorito ? '❤️ FAVORITO' : (trip.duracao ? trip.duracao + ' DIAS' : 'ROTEIRO')}</div>
                    <div class="trip-info">
                        <div class="trip-date">${new Date(trip.dataCriacao).toLocaleDateString('pt-BR')}</div>
                        <h3 class="trip-title">${trip.titulo}</h3>
                    </div>
                </div>
            `;
            tripCard.addEventListener('click', () => {
                window.location.href = `resultado.html?id=${trip.id}`;
            });
            grid.appendChild(tripCard);
        });

        carregarImagensReais(grid);

        // Card "Novo Destino" ao final da grade
        const newDestinationCard = document.createElement('div');
        newDestinationCard.className = 'new-destination';
        newDestinationCard.innerHTML = `
            <div class="new-destination-icon">➕</div>
            <div class="new-destination-text">Novo Destino</div>
            <div class="new-destination-desc">Para onde será sua próxima aventura?</div>
        `;
        newDestinationCard.addEventListener('click', () => {
            window.location.href = 'criar.html';
        });
        grid.appendChild(newDestinationCard);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});
