// js/lugares-reais.js
// Busca lugares que EXISTEM de verdade no destino antes de pedir o roteiro à IA.
//
// Por quê: o modelo da OpenAI não consulta a internet. Em cidades menores ele não
// conhece os estabelecimentos e acaba inventando nomes. Então primeiro buscamos
// pontos turísticos, restaurantes e cafés reais no OpenStreetMap (mapa aberto,
// gratuito e sem chave) e mandamos essa lista para a IA escolher.
//
// Serviços usados (ambos aceitam chamadas direto do navegador):
//  - Nominatim: encontra a cidade e suas coordenadas
//  - Overpass:  lista os lugares com nome dentro de um raio em volta da cidade

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URLS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
];
const CACHE_LUGARES_PREFIXO = 'viajai_lugares_v1:';
const CACHE_LUGARES_VALIDADE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

const LIMITE_ATRACOES = 45;
const LIMITE_RESTAURANTES = 30;
const LIMITE_CAFES = 15;

// Tradução dos tipos do OpenStreetMap para português (vai no prompt e na tela)
const TIPOS_LUGAR = {
    museum: 'museu', attraction: 'atração turística', viewpoint: 'mirante', gallery: 'galeria de arte',
    zoo: 'zoológico', aquarium: 'aquário', theme_park: 'parque temático', artwork: 'arte pública',
    park: 'parque', garden: 'jardim', nature_reserve: 'reserva natural',
    monument: 'monumento', memorial: 'memorial', castle: 'castelo', church: 'igreja',
    ruins: 'ruínas', building: 'prédio histórico', fort: 'forte', city_gate: 'portão histórico',
    place_of_worship: 'igreja/templo', theatre: 'teatro', marketplace: 'mercado',
    arts_centre: 'centro cultural', beach: 'praia', peak: 'morro/pico', waterfall: 'cachoeira',
    restaurant: 'restaurante', cafe: 'café'
};

const COZINHAS = {
    italian: 'italiana', pizza: 'pizzaria', japanese: 'japonesa', sushi: 'japonesa', chinese: 'chinesa',
    brazilian: 'brasileira', regional: 'regional', german: 'alemã', portuguese: 'portuguesa',
    french: 'francesa', mexican: 'mexicana', burger: 'hambúrguer', steak_house: 'churrascaria',
    barbecue: 'churrasco', seafood: 'frutos do mar', vegetarian: 'vegetariana', vegan: 'vegana',
    arab: 'árabe', lebanese: 'libanesa', indian: 'indiana', thai: 'tailandesa', spanish: 'espanhola',
    coffee_shop: 'cafeteria', bakery: 'padaria', ice_cream: 'sorveteria', international: 'internacional'
};

// ---------- utilidades ----------

function comTempoLimite(promessa, ms, mensagem) {
    return Promise.race([
        promessa,
        new Promise((_, reject) => setTimeout(() => reject(new Error(mensagem)), ms))
    ]);
}

function distanciaKm(lat1, lon1, lat2, lon2) {
    const rad = x => x * Math.PI / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizarNome(texto) {
    return String(texto || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function lerCacheLugares(chave) {
    try {
        const salvo = JSON.parse(localStorage.getItem(CACHE_LUGARES_PREFIXO + chave) || 'null');
        if (salvo && Date.now() - salvo.quando < CACHE_LUGARES_VALIDADE_MS) return salvo.dados;
    } catch (e) { /* ignora cache inválido */ }
    return null;
}

function salvarCacheLugares(chave, dados) {
    try {
        localStorage.setItem(CACHE_LUGARES_PREFIXO + chave, JSON.stringify({ quando: Date.now(), dados }));
    } catch (e) { /* localStorage cheio: segue sem cache */ }
}

// ---------- 1. encontrar a cidade ----------

async function geocodificarCidade(destino) {
    const url = `${NOMINATIM_URL}?` + new URLSearchParams({
        q: destino,
        format: 'jsonv2',
        limit: '1',
        'accept-language': 'pt-BR'
    });

    const resposta = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resposta.ok) throw new Error(`Nominatim respondeu ${resposta.status}`);

    const [lugar] = await resposta.json();
    if (!lugar) throw new Error(`Destino "${destino}" não encontrado no mapa`);

    const lat = Number(lugar.lat);
    const lon = Number(lugar.lon);

    // Raio de busca proporcional ao tamanho da cidade (entre 3 e 15 km)
    let raioKm = 6;
    if (Array.isArray(lugar.boundingbox) && lugar.boundingbox.length === 4) {
        const [sul, norte, oeste, leste] = lugar.boundingbox.map(Number);
        const diagonal = distanciaKm(sul, oeste, norte, leste);
        raioKm = Math.min(15, Math.max(3, diagonal / 3));
    }

    return { lat, lon, raioKm, nome: lugar.display_name || destino };
}

// ---------- 2. listar lugares reais em volta ----------

function montarConsultaOverpass(lat, lon, raioMetros) {
    const r = `(around:${raioMetros},${lat},${lon})`;
    return `[out:json][timeout:25];
(
  nwr["tourism"~"^(museum|attraction|viewpoint|gallery|zoo|aquarium|theme_park)$"]["name"]${r};
  nwr["historic"~"^(monument|memorial|castle|church|ruins|building|fort|city_gate)$"]["name"]${r};
  nwr["leisure"~"^(park|garden|nature_reserve)$"]["name"]${r};
  nwr["amenity"~"^(theatre|marketplace|arts_centre)$"]["name"]${r};
  nwr["amenity"="place_of_worship"]["name"]["wikidata"]${r};
  nwr["natural"~"^(beach|peak|waterfall)$"]["name"]${r};
)->.atracoes;
.atracoes out center tags 400;
nwr["amenity"="restaurant"]["name"]${r}->.restaurantes;
.restaurantes out center tags 250;
nwr["amenity"="cafe"]["name"]${r}->.cafes;
.cafes out center tags 120;`;
}

async function consultarOverpass(consulta) {
    let ultimoErro = null;

    for (const url of OVERPASS_URLS) {
        try {
            const resposta = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(consulta)
            });
            if (!resposta.ok) throw new Error(`Overpass respondeu ${resposta.status}`);
            return await resposta.json();
        } catch (erro) {
            ultimoErro = erro; // tenta o próximo servidor
        }
    }

    throw ultimoErro || new Error('Overpass indisponível');
}

function tipoDoLugar(tags) {
    const chave = tags.tourism || tags.historic || tags.leisure || tags.natural || tags.amenity;
    return TIPOS_LUGAR[chave] || 'ponto de interesse';
}

function categoriaDoLugar(tags) {
    if (tags.amenity === 'restaurant') return 'restaurante';
    if (tags.amenity === 'cafe') return 'cafe';
    return 'atracao';
}

// Quanto mais "conhecido" o lugar, maior a nota (Wikipédia/Wikidata contam muito)
function pontuarLugar(tags, distancia) {
    let nota = 0;
    if (tags.wikidata) nota += 5;
    if (tags.wikipedia) nota += 3;
    if (tags.tourism === 'museum' || tags.tourism === 'attraction' || tags.tourism === 'viewpoint') nota += 2;
    if (tags.website || tags['contact:website']) nota += 1;
    if (tags.opening_hours) nota += 1;
    if (tags.cuisine) nota += 1;
    return nota - distancia * 0.15; // leve preferência pelo que é mais central
}

function converterElemento(elemento, centro) {
    const tags = elemento.tags || {};
    const lat = elemento.lat ?? (elemento.center && elemento.center.lat);
    const lon = elemento.lon ?? (elemento.center && elemento.center.lon);
    if (!tags.name || lat == null || lon == null) return null;

    const distancia = distanciaKm(centro.lat, centro.lon, lat, lon);
    const cozinha = (tags.cuisine || '').split(';').map(c => COZINHAS[c.trim()]).filter(Boolean)[0] || '';

    return {
        nome: tags['name:pt'] || tags.name,
        categoria: categoriaDoLugar(tags),
        tipo: tipoDoLugar(tags),
        cozinha,
        bairro: tags['addr:suburb'] || tags['addr:neighbourhood'] || '',
        wikipedia: (tags.wikipedia || '').replace(/^[a-z-]+:/, ''),
        lat: Number(lat.toFixed(6)),
        lon: Number(lon.toFixed(6)),
        nota: pontuarLugar(tags, distancia)
    };
}

function selecionarMelhores(lugares, categoria, limite, prefixo) {
    const vistos = new Set();

    return lugares
        .filter(l => l.categoria === categoria)
        .sort((a, b) => b.nota - a.nota)
        .filter(l => {
            const chave = normalizarNome(l.nome);
            if (!chave || vistos.has(chave)) return false;
            vistos.add(chave);
            return true;
        })
        .slice(0, limite)
        .map((l, i) => ({ ...l, id: `${prefixo}${i + 1}` }));
}

// Função principal. Retorna null se não conseguir (o roteiro é gerado do jeito antigo).
async function buscarLugaresReais(destino) {
    const chaveCache = normalizarNome(destino);
    const emCache = lerCacheLugares(chaveCache);
    if (emCache) return emCache;

    const cidade = await comTempoLimite(geocodificarCidade(destino), 10000, 'Tempo esgotado ao localizar a cidade');
    const consulta = montarConsultaOverpass(cidade.lat, cidade.lon, Math.round(cidade.raioKm * 1000));
    const dados = await comTempoLimite(consultarOverpass(consulta), 30000, 'Tempo esgotado ao buscar lugares');

    const todos = (dados.elements || [])
        .map(el => converterElemento(el, cidade))
        .filter(Boolean);

    const resultado = {
        cidade: { lat: cidade.lat, lon: cidade.lon, nome: cidade.nome },
        atracoes: selecionarMelhores(todos, 'atracao', LIMITE_ATRACOES, 'A'),
        restaurantes: selecionarMelhores(todos, 'restaurante', LIMITE_RESTAURANTES, 'R'),
        cafes: selecionarMelhores(todos, 'cafe', LIMITE_CAFES, 'C')
    };

    // Só guarda no cache se achou algo útil
    if (resultado.atracoes.length + resultado.restaurantes.length > 0) {
        salvarCacheLugares(chaveCache, resultado);
    }

    return resultado;
}

// Texto compacto para colocar no prompt da IA
function formatarLugaresParaPrompt(lugares) {
    const linha = l => {
        const detalhes = [l.tipo, l.cozinha, l.bairro && `bairro ${l.bairro}`].filter(Boolean).join(', ');
        return `${l.id} | ${l.nome} | ${detalhes}`;
    };

    return [
        'PONTOS TURÍSTICOS E PASSEIOS:',
        ...(lugares.atracoes.length ? lugares.atracoes.map(linha) : ['(nenhum encontrado)']),
        '',
        'RESTAURANTES:',
        ...(lugares.restaurantes.length ? lugares.restaurantes.map(linha) : ['(nenhum encontrado)']),
        '',
        'CAFÉS:',
        ...(lugares.cafes.length ? lugares.cafes.map(linha) : ['(nenhum encontrado)'])
    ].join('\n');
}

// Depois que a IA responde: confere os IDs, corrige nomes e anexa a localização
function enriquecerComLugaresReais(roteiro, lugares) {
    const porId = {};
    [...lugares.atracoes, ...lugares.restaurantes, ...lugares.cafes].forEach(l => { porId[l.id] = l; });

    const localizacao = l => ({ nome: l.nome, lat: l.lat, lon: l.lon, tipo: l.tipo, wikipedia: l.wikipedia || '' });

    // Se a IA esquecer o ID, tenta achar o lugar pelo nome (ex.: "Visita ao Museu X" -> "Museu X")
    const acharPorNome = (texto, candidatos) => {
        const alvo = normalizarNome(texto);
        if (alvo.length < 4) return null;
        return candidatos.find(l => {
            const nome = normalizarNome(l.nome);
            return nome.length >= 4 && (alvo.includes(nome) || nome.includes(alvo));
        }) || null;
    };
    const todosLugares = [...lugares.atracoes, ...lugares.restaurantes, ...lugares.cafes];
    const estabelecimentos = [...lugares.restaurantes, ...lugares.cafes];
    let verificados = 0;
    let total = 0;

    (roteiro.dias || []).forEach(dia => {
        (dia.atividades || []).forEach(atividade => {
            total++;
            const lugar = porId[String(atividade.lugarId || '').trim().toUpperCase()]
                || acharPorNome(atividade.nome, todosLugares);

            if (lugar) {
                verificados++;
                atividade.lugarReal = localizacao(lugar);
                if (!atividade.local || /local espec[ií]fico/i.test(atividade.local)) {
                    atividade.local = lugar.bairro || lugar.tipo;
                }
            }
            delete atividade.lugarId;
        });

        const ids = dia.refeicoesIds || {};
        dia.refeicoes = dia.refeicoes || {};
        dia.refeicoesReais = {};

        ['cafe', 'almoco', 'jantar'].forEach(refeicao => {
            total++;
            const lugar = porId[String(ids[refeicao] || '').trim().toUpperCase()]
                || acharPorNome(dia.refeicoes[refeicao], estabelecimentos);

            if (lugar) {
                verificados++;
                // Usa o nome exato do mapa (evita a IA "enfeitar" ou errar o nome)
                dia.refeicoes[refeicao] = lugar.nome + (lugar.cozinha ? ` (${lugar.cozinha})` : '');
                dia.refeicoesReais[refeicao] = localizacao(lugar);
            }
        });

        delete dia.refeicoesIds;
    });

    roteiro.fonteLugares = {
        nome: 'OpenStreetMap',
        verificados,
        total
    };

    return roteiro;
}

// Link do Google Maps para um lugar com coordenadas
function linkMapa(lugar) {
    if (!lugar || lugar.lat == null || lugar.lon == null) return '';
    // Coordenadas exatas: o pino cai no lugar certo mesmo em cidades com nomes repetidos
    return `https://www.google.com/maps/search/?api=1&query=${lugar.lat},${lugar.lon}`;
}

// ---------- exibição (resultado.html e compartilhado.html) ----------

// lugar: dados do mapa (ou vazio). roteiro: para saber se ele foi gerado com a lista real.
// nomeSugerido: texto que a IA escreveu (para não marcar "na hospedagem" como suspeito).
function htmlLinkMapa(lugar, roteiro = null, nomeSugerido = '') {
    const url = linkMapa(lugar);
    if (url) {
        return `<a class="link-mapa" href="${url}" target="_blank" rel="noopener">🗺️ Ver no mapa</a>`;
    }

    // Roteiro feito com a lista do mapa, mas este nome não bateu com nenhum lugar real
    const ehEstabelecimento = nomeSugerido && !/hospedagem|hotel|pousada|livre|n[aã]o informad/i.test(nomeSugerido);
    if (roteiro && roteiro.fonteLugares && ehEstabelecimento) {
        return '<span class="lugar-nao-confirmado" title="Sugestão da IA que não foi encontrada no mapa">não confirmado no mapa</span>';
    }

    return '';
}

// Selo abaixo da descrição: "✓ 12 de 14 lugares confirmados no mapa"
function mostrarSeloLugaresVerificados(roteiro, elementoReferencia) {
    if (!elementoReferencia || !elementoReferencia.parentNode) return;

    const existente = elementoReferencia.parentNode.querySelector('.selo-lugares');
    if (existente) existente.remove();

    const fonte = roteiro && roteiro.fonteLugares;
    if (!fonte || !fonte.total) return;

    const selo = document.createElement('p');
    selo.className = 'selo-lugares';
    selo.textContent = `✓ ${fonte.verificados} de ${fonte.total} lugares confirmados no mapa (${fonte.nome})`;
    elementoReferencia.insertAdjacentElement('afterend', selo);
}
