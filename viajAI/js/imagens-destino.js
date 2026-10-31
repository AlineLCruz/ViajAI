// js/imagens-destino.js
// Imagens dos lugares (atividades, destinos e cards do painel).
//
// Como funciona:
// 1. Cada imagem nasce com um "placeholder" local (um SVG com degradê e emoji),
//    gerado no próprio navegador — por isso nunca aparece imagem quebrada.
// 2. Em seguida buscamos uma foto real do lugar na API pública da Wikipédia
//    (não precisa de chave e permite chamadas direto do navegador).
// 3. Quando a foto carrega, ela substitui o placeholder. Se não achar ou der
//    erro, o placeholder continua.
// As buscas ficam em cache no localStorage para não repetir requisições.

const CACHE_IMAGENS_CHAVE = 'viajai_imagens_v1';
const CACHE_IMAGENS_MAX = 400;
const BUSCAS_SIMULTANEAS = 4;

// ---------- Placeholder local ----------

const EMOJIS_POR_PALAVRA = [
    // Comida primeiro: "almoço no Time Out Market" deve virar 🍽️, não outra coisa
    [/almoco|jantar|restaurante|bistro|mercado|market|feira|gastronom|comida/, '🍽️'],
    [/museu|museum|galeria|arte/, '🏛️'],
    [/castelo|castle|fortaleza|forte|palacio|palace/, '🏰'],
    [/igreja|catedral|basilica|mosteiro|templo|church|cathedral|monastery|temple/, '⛪'],
    [/montanha|trilha|serra|mountain|trail|mirante|miradouro/, '⛰️'],
    [/parque|jardim|bosque|floresta|park|garden/, '🌳'],
    [/cafe|cafeteria|padaria|confeitaria|coffee/, '☕'],
    [/praia|beach|\bmar\b|ilha|island/, '🏖️'],
    [/\bbar\b|pub|noite|balada|show|musica/, '🎶'],
    [/compras|shopping|loja|rua|avenida/, '🛍️'],
    [/cachoeira|lago|rio|waterfall|lake|river/, '💧'],
    [/torre|tower|ponte|bridge|monumento/, '🗼'],
    [/hotel|hospedagem|pousada/, '🏨']
];

const PALETAS = [
    ['#2D8659', '#7FC8A0'],
    ['#B85C1F', '#F2B279'],
    ['#1F6F8B', '#8FD3E8'],
    ['#6B4FA0', '#C3B1E8'],
    ['#8A6D1F', '#E8D48F'],
    ['#A03A5A', '#F0A6BD']
];

function removerAcentos(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

function hashTexto(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        hash = ((hash << 5) - hash + texto.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function imagemPlaceholder(texto, largura = 400, altura = 300) {
    const normalizado = removerAcentos(texto);
    const emoji = (EMOJIS_POR_PALAVRA.find(([regex]) => regex.test(normalizado)) || [null, '📍'])[1];
    const [cor1, cor2] = PALETAS[hashTexto(normalizado || 'viajai') % PALETAS.length];
    const tamanhoEmoji = Math.round(Math.min(largura, altura) * 0.32);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${cor1}"/><stop offset="1" stop-color="${cor2}"/>
        </linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="${tamanhoEmoji}">${emoji}</text>
    </svg>`;

    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

// ---------- Cache ----------

let cacheImagens = null;

function lerCacheImagens() {
    if (cacheImagens) return cacheImagens;
    try {
        cacheImagens = JSON.parse(localStorage.getItem(CACHE_IMAGENS_CHAVE) || '{}');
    } catch (e) {
        cacheImagens = {};
    }
    return cacheImagens;
}

function salvarCacheImagens() {
    try {
        const chaves = Object.keys(cacheImagens);
        if (chaves.length > CACHE_IMAGENS_MAX) {
            chaves.slice(0, chaves.length - CACHE_IMAGENS_MAX).forEach(chave => delete cacheImagens[chave]);
        }
        localStorage.setItem(CACHE_IMAGENS_CHAVE, JSON.stringify(cacheImagens));
    } catch (e) {
        // localStorage cheio ou bloqueado: segue sem cache
    }
}

// ---------- Busca na Wikipédia ----------

async function buscarNaWikipedia(termo, idioma) {
    const url = `https://${idioma}.wikipedia.org/w/api.php?` + new URLSearchParams({
        action: 'query',
        format: 'json',
        origin: '*',
        generator: 'search',
        gsrsearch: termo,
        gsrlimit: '5',
        prop: 'pageimages',
        piprop: 'thumbnail',
        pithumbsize: '640'
    });

    const resposta = await fetch(url);
    if (!resposta.ok) return '';

    const dados = await resposta.json();
    const paginas = Object.values((dados.query && dados.query.pages) || {})
        .sort((a, b) => (a.index || 0) - (b.index || 0));

    // Ignora mapas, bandeiras e brasões (quase sempre arquivos .svg)
    const comFoto = paginas.find(p => p.thumbnail && p.thumbnail.source && !/\.svg/i.test(p.thumbnail.source));
    return comFoto ? comFoto.thumbnail.source : '';
}

async function buscarImagem(termos) {
    const cache = lerCacheImagens();
    const lista = termos.map(t => String(t || '').trim()).filter(Boolean);
    const chave = removerAcentos(lista.join('|'));

    if (!chave) return '';
    if (chave in cache) return cache[chave];

    let encontrada = '';

    try {
        for (const termo of lista) {
            encontrada = await buscarNaWikipedia(termo, 'pt');
            if (encontrada) break;
        }

        if (!encontrada) {
            encontrada = await buscarNaWikipedia(lista[lista.length - 1], 'en');
        }
    } catch (e) {
        // Sem internet ou API fora do ar: não guarda no cache, tenta de novo na próxima
        return '';
    }

    cache[chave] = encontrada;
    salvarCacheImagens();
    return encontrada;
}

// ---------- Uso nas páginas ----------

function escaparAtributo(texto) {
    return String(texto ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Monta a tag <img> já com o placeholder e os termos de busca da foto real.
// termos: do mais específico ao mais genérico. Ex.: ["Castelo de São Jorge Lisboa", "Lisboa"]
function htmlImagem({ termos = [], alt = '', classe = '', largura = 400, altura = 300 }) {
    const textoBase = termos.join(' ');
    return `<img src="${imagemPlaceholder(textoBase, largura, altura)}"
        data-busca="${escaparAtributo(JSON.stringify(termos.filter(Boolean)))}"
        alt="${escaparAtributo(alt)}"
        ${classe ? `class="${escaparAtributo(classe)}"` : ''}
        loading="lazy">`;
}

// Cidade sem o país: "Lisboa, Portugal" -> "Lisboa"
function cidadeDoDestino(destino) {
    return String(destino || '').split(',')[0].trim();
}

// Procura todas as <img data-busca> dentro de "raiz" e troca pelo foto real quando achar
function carregarImagensReais(raiz = document) {
    const imagens = Array.from(raiz.querySelectorAll('img[data-busca]:not([data-imagem-processada])'));
    let proxima = 0;

    // Imagens escritas direto no HTML (sem src) recebem o placeholder na hora
    imagens.forEach(img => {
        if (!img.getAttribute('src')) {
            const rect = img.getBoundingClientRect();
            img.src = imagemPlaceholder(img.dataset.placeholder || img.alt, Math.round(rect.width) || 200, Math.round(rect.height) || 200);
        }
    });

    const processar = async () => {
        while (proxima < imagens.length) {
            const img = imagens[proxima++];
            img.setAttribute('data-imagem-processada', '1');

            let termos = [];
            try {
                termos = JSON.parse(img.getAttribute('data-busca') || '[]');
            } catch (e) {
                continue;
            }

            const url = await buscarImagem(termos);
            if (!url) continue;

            // Só troca depois que a foto carregou de verdade (evita piscar ou quebrar)
            await new Promise(resolve => {
                const teste = new Image();
                teste.onload = () => { img.src = url; resolve(); };
                teste.onerror = () => resolve();
                teste.src = url;
            });
        }
    };

    for (let i = 0; i < BUSCAS_SIMULTANEAS; i++) processar();
}

// Qualquer imagem externa que quebrar (ex.: fotos de hotéis) vira placeholder
document.addEventListener('error', (evento) => {
    const img = evento.target;
    if (img instanceof HTMLImageElement) trocarPorPlaceholder(img);
}, true);

function trocarPorPlaceholder(img) {
    if (img.dataset.placeholderAplicado) return;
    img.dataset.placeholderAplicado = '1';
    img.src = imagemPlaceholder(img.alt || 'viagem', img.width || 400, img.height || 300);
}

document.addEventListener('DOMContentLoaded', () => {
    // Imagens que já quebraram antes deste script carregar
    document.querySelectorAll('img').forEach(img => {
        if (img.complete && img.naturalWidth === 0 && img.getAttribute('src') && !img.src.startsWith('data:')) {
            trocarPorPlaceholder(img);
        }
    });

    carregarImagensReais(document);
});
