// js/menu-mobile.js
// No celular (até 768px) o menu de navegação vira um botão "Menu" que abre e fecha a lista de links.
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header');
    const nav = header ? header.querySelector('.nav') : null;

    if (!header || !nav) return;

    if (!nav.id) nav.id = 'menuPrincipal';

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'menu-toggle';
    botao.setAttribute('aria-controls', nav.id);
    botao.setAttribute('aria-expanded', 'false');
    botao.innerHTML = '<span class="menu-toggle-icone" aria-hidden="true">☰</span> Menu';

    nav.parentNode.insertBefore(botao, nav);

    const definirAberto = (aberto) => {
        header.classList.toggle('menu-aberto', aberto);
        botao.setAttribute('aria-expanded', String(aberto));
        botao.querySelector('.menu-toggle-icone').textContent = aberto ? '✕' : '☰';
    };

    botao.addEventListener('click', () => {
        definirAberto(!header.classList.contains('menu-aberto'));
    });

    // Fecha ao escolher um link, ao apertar Esc ou ao voltar para a tela grande
    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => definirAberto(false));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && header.classList.contains('menu-aberto')) {
            definirAberto(false);
            botao.focus();
        }
    });

    window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
        if (e.matches) definirAberto(false);
    });
});
