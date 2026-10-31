// Página inicial (indice.html)
// A geração de roteiros acontece em criar.html. Aqui só levamos a pessoa até lá.

class ItineraryManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const heroForm = document.getElementById('heroForm');
        if (heroForm) {
            // Se o formulário for enviado (ex.: apertando Enter), vai direto para a criação do roteiro
            heroForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.redirectToCreatePage();
            });
        }

        const btnCTAFinal = document.getElementById('btnCTAFinal');
        if (btnCTAFinal) {
            btnCTAFinal.addEventListener('click', () => {
                if (authManager.currentUser) {
                    this.redirectToCreatePage();
                } else {
                    authManager.showAuthModal('register');
                }
            });
        }
    }

    redirectToCreatePage() {
        window.location.href = 'criar.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ItineraryManager();
});
