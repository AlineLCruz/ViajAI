// Demonstração - JavaScript

// Dados de exemplo para roteiros
const roteirosExemplo = {
    'Paris, França': {
        dias: [
            {
                dia: 1,
                titulo: 'Chegada e Exploração',
                atividades: [
                    '09:00 - Chegada no aeroporto CDG',
                    '12:00 - Check-in no hotel',
                    '14:00 - Almoço em café tradicional',
                    '16:00 - Visita à Torre Eiffel',
                    '19:00 - Jantar com vista do Trocadéro'
                ]
            },
            {
                dia: 2,
                titulo: 'Museus e Cultura',
                atividades: [
                    '09:00 - Café da manhã no hotel',
                    '10:00 - Museu do Louvre (Mona Lisa)',
                    '13:00 - Almoço no Marais',
                    '15:00 - Catedral de Notre-Dame',
                    '18:00 - Passeio pelo Île de la Cité'
                ]
            },
            {
                dia: 3,
                titulo: 'Champs-Élysées e Arredores',
                atividades: [
                    '09:00 - Café da manhã',
                    '10:00 - Passeio nos Champs-Élysées',
                    '12:00 - Compras nas butiques',
                    '14:00 - Almoço em bistrô',
                    '16:00 - Arc do Triunfo e vista panorâmica'
                ]
            },
            {
                dia: 4,
                titulo: 'Versailles',
                atividades: [
                    '08:00 - Saída para Versailles',
                    '10:00 - Palácio de Versailles',
                    '12:30 - Almoço no jardim',
                    '14:00 - Exploração dos Jardins',
                    '17:00 - Retorno a Paris'
                ]
            },
            {
                dia: 5,
                titulo: 'Montmartre e Despedida',
                atividades: [
                    '09:00 - Café da manhã',
                    '10:00 - Basílica de Sacré-Cœur',
                    '11:30 - Exploração de Montmartre',
                    '13:00 - Almoço tradicional',
                    '15:00 - Últimas compras e souvenirs'
                ]
            }
        ],
        hoteis: [
            { nome: 'Le Marais Boutique', preco: '€€€', rating: '⭐⭐⭐⭐⭐' },
            { nome: 'Hotel Eiffel Seine', preco: '€€€', rating: '⭐⭐⭐⭐⭐' },
            { nome: 'Montmartre Charm', preco: '€€', rating: '⭐⭐⭐⭐' }
        ]
    },
    'Rio de Janeiro, Brasil': {
        dias: [
            {
                dia: 1,
                titulo: 'Chegada e Copacabana',
                atividades: [
                    '10:00 - Chegada no aeroporto',
                    '13:00 - Check-in e almoço',
                    '15:00 - Praia de Copacabana',
                    '17:00 - Pôr do sol na praia',
                    '19:00 - Jantar à beira-mar'
                ]
            },
            {
                dia: 2,
                titulo: 'Cristo Redentor e Pão de Açúcar',
                atividades: [
                    '08:00 - Café da manhã',
                    '09:00 - Subida ao Cristo Redentor',
                    '11:30 - Almoço com vista',
                    '14:00 - Pão de Açúcar (bondinho)',
                    '17:00 - Passeio pelo Botafogo'
                ]
            },
            {
                dia: 3,
                titulo: 'Ipanema e Lagoa',
                atividades: [
                    '09:00 - Café da manhã',
                    '10:00 - Praia de Ipanema',
                    '12:00 - Almoço em restaurante local',
                    '14:00 - Lagoa Rodrigo de Freitas',
                    '16:00 - Cicloturismo ao redor da lagoa'
                ]
            },
            {
                dia: 4,
                titulo: 'Floresta da Tijuca',
                atividades: [
                    '08:00 - Saída cedo para floresta',
                    '09:00 - Trilha na Floresta da Tijuca',
                    '12:00 - Piquenique na natureza',
                    '14:00 - Cachoeira da Cascatinha',
                    '16:00 - Retorno ao hotel'
                ]
            },
            {
                dia: 5,
                titulo: 'Centro e Cultura',
                atividades: [
                    '09:00 - Café da manhã',
                    '10:00 - Centro histórico do Rio',
                    '12:00 - Museu de Arte do Rio',
                    '14:00 - Almoço tradicional',
                    '16:00 - Últimas compras e souvenirs'
                ]
            }
        ],
        hoteis: [
            { nome: 'Copacabana Palace', preco: '€€€€', rating: '⭐⭐⭐⭐⭐' },
            { nome: 'Ipanema Beachfront', preco: '€€€', rating: '⭐⭐⭐⭐⭐' },
            { nome: 'Botafogo Charm', preco: '€€', rating: '⭐⭐⭐⭐' }
        ]
    },
    'Tóquio, Japão': {
        dias: [
            {
                dia: 1,
                titulo: 'Chegada e Shibuya',
                atividades: [
                    '14:00 - Chegada no aeroporto Narita',
                    '17:00 - Check-in e descanso',
                    '19:00 - Exploração de Shibuya',
                    '20:00 - Cruzamento de Shibuya',
                    '21:00 - Jantar em restaurante local'
                ]
            },
            {
                dia: 2,
                titulo: 'Templos e Asakusa',
                atividades: [
                    '08:00 - Café da manhã',
                    '09:00 - Templo Senso-ji',
                    '11:00 - Rua Nakamise (compras)',
                    '13:00 - Almoço tradicional',
                    '15:00 - Exploração de Asakusa'
                ]
            },
            {
                dia: 3,
                titulo: 'Palácio Imperial e Ginza',
                atividades: [
                    '09:00 - Café da manhã',
                    '10:00 - Palácio Imperial',
                    '12:00 - Almoço em Ginza',
                    '14:00 - Compras em Ginza',
                    '17:00 - Torre de Tóquio'
                ]
            },
            {
                dia: 4,
                titulo: 'Akihabara e Tecnologia',
                atividades: [
                    '09:00 - Café da manhã',
                    '10:00 - Akihabara (eletrônicos)',
                    '12:00 - Almoço em Akihabara',
                    '14:00 - Lojas de anime e games',
                    '17:00 - Passeio por Harajuku'
                ]
            },
            {
                dia: 5,
                titulo: 'Dia Livre e Despedida',
                atividades: [
                    '09:00 - Café da manhã',
                    '10:00 - Dia livre para explorar',
                    '13:00 - Almoço em local favorito',
                    '15:00 - Últimas compras',
                    '18:00 - Preparação para partida'
                ]
            }
        ],
        hoteis: [
            { nome: 'Shinjuku Luxury', preco: '€€€€', rating: '⭐⭐⭐⭐⭐' },
            { nome: 'Asakusa Traditional', preco: '€€€', rating: '⭐⭐⭐⭐⭐' },
            { nome: 'Shibuya Modern', preco: '€€', rating: '⭐⭐⭐⭐' }
        ]
    }
};

// Elementos do DOM
const demoForm = document.getElementById('demoForm');
const demoDestino = document.getElementById('demoDestino');
const demoDuracao = document.getElementById('demoDuracao');
const demoOutput = document.getElementById('demoOutput');
const demoPlaceholder = document.getElementById('demoPlaceholder');
const demoItinerary = document.getElementById('demoItinerary');
const demoHotels = document.getElementById('demoHotels');
const demoDestinoTitle = document.getElementById('demoDestinoTitle');
const demoDuracaoInfo = document.getElementById('demoDuracaoInfo');

// Botões de duração
document.querySelectorAll('.duration-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        demoDuracao.value = btn.dataset.days;
    });
});

// Envio do formulário
demoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const destino = demoDestino.value;
    const duracao = demoDuracao.value;
    const interesses = Array.from(document.querySelectorAll('input[name="interesses"]:checked'))
        .map(cb => cb.value);

    if (!destino || !duracao || interesses.length === 0) {
        alert('Por favor, preencha todos os campos!');
        return;
    }

    gerarRoteiro(destino, duracao, interesses);
});

// Gerar roteiro
function gerarRoteiro(destino, duracao, interesses) {
    const roteiro = roteirosExemplo[destino];
    
    if (!roteiro) {
        alert('Roteiro não disponível para este destino');
        return;
    }

    // Atualizar informações
    demoDestinoTitle.textContent = destino;
    demoDuracaoInfo.textContent = `${duracao} dias • Interesses: ${interesses.join(', ')}`;

    // Limpar conteúdo anterior
    demoItinerary.innerHTML = '';
    demoHotels.innerHTML = '';

    // Adicionar dias
    const diasExibir = roteiro.dias.slice(0, parseInt(duracao));
    diasExibir.forEach(dia => {
        const dayElement = document.createElement('div');
        dayElement.className = 'day-item';
        dayElement.innerHTML = `
            <h4>Dia ${dia.dia}: ${dia.titulo}</h4>
            ${dia.atividades.map(atividade => `<p>⏰ ${atividade}</p>`).join('')}
        `;
        demoItinerary.appendChild(dayElement);
    });

    // Adicionar hotéis
    roteiro.hoteis.forEach(hotel => {
        const hotelElement = document.createElement('div');
        hotelElement.className = 'hotel-card';
        hotelElement.innerHTML = `
            <h5>🏨 ${hotel.nome}</h5>
            <p>${hotel.preco}</p>
            <div class="hotel-rating">${hotel.rating}</div>
        `;
        demoHotels.appendChild(hotelElement);
    });

    // Mostrar resultado
    demoPlaceholder.style.display = 'none';
    demoOutput.classList.remove('hidden');

    // Scroll para resultado
    demoOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Carregar exemplo
function loadExample(destino, dias, interesses) {
    demoDestino.value = destino;
    demoDuracao.value = dias;
    
    // Desmarcar todos os checkboxes
    document.querySelectorAll('input[name="interesses"]').forEach(cb => cb.checked = false);
    
    // Marcar os interesses do exemplo
    interesses.forEach(interesse => {
        const checkbox = document.querySelector(`input[name="interesses"][value="${interesse}"]`);
        if (checkbox) checkbox.checked = true;
    });

    // Atualizar botão de duração ativo
    document.querySelectorAll('.duration-btn').forEach(btn => {
        if (btn.dataset.days == dias) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Gerar roteiro
    gerarRoteiro(destino, dias, interesses);
}

// Inicializar
console.log('✨ Demonstração ViajAI carregada com sucesso!');
