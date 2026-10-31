// js/exportar-pdf.js
// Gera um arquivo PDF de verdade a partir do roteiro, usando a biblioteca html2pdf.js.
// A biblioteca só é baixada quando o usuário clica em "Exportar PDF".
// Se ela não carregar (sem internet, por exemplo), abre a janela de impressão
// do navegador, onde é possível escolher "Salvar como PDF".

const HTML2PDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

function escaparHTML(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function carregarHtml2Pdf() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = HTML2PDF_URL;
        script.onload = () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error('html2pdf indisponível'));
        script.onerror = () => reject(new Error('Não foi possível carregar o html2pdf'));
        document.head.appendChild(script);
    });
}

function montarHTMLDoRoteiro(roteiro, rodape) {
    const labelsOrcamento = { economico: 'Econômico', moderado: 'Moderado', luxo: 'Luxo' };
    const e = escaparHTML;

    let html = `
        <div style="font-family: Arial, sans-serif; color: #1f2937; font-size: 12px; line-height: 1.5;">
            <h1 style="color: #2D8659; font-size: 22px; margin: 0 0 8px;">${e(roteiro.titulo || 'Roteiro de viagem')}</h1>
            <p style="margin: 0 0 4px;"><strong>Destino:</strong> ${e(roteiro.destino)}</p>
            <p style="margin: 0 0 4px;"><strong>Duração:</strong> ${e(roteiro.duracao)} dia(s)
                ${roteiro.pessoas ? ` · <strong>Pessoas:</strong> ${e(roteiro.pessoas)}` : ''}
                ${roteiro.orcamento ? ` · <strong>Orçamento:</strong> ${e(labelsOrcamento[roteiro.orcamento] || roteiro.orcamento)}` : ''}
            </p>
            ${roteiro.descricao ? `<p style="margin: 8px 0 0;">${e(roteiro.descricao)}</p>` : ''}
    `;

    (roteiro.dias || []).forEach(dia => {
        const refeicoes = dia.refeicoes || {};

        html += `
            <div style="page-break-inside: avoid; margin-top: 18px;">
                <h2 style="color: #B85C1F; font-size: 16px; margin: 0 0 8px;">Dia ${e(dia.dia)}: ${e(dia.titulo)}</h2>
        `;

        (dia.atividades || []).forEach(atividade => {
            html += `
                <div style="margin: 6px 0; padding: 8px 10px; background: #f3f4f6; border-radius: 6px;">
                    <strong>${e(atividade.horario)} - ${e(atividade.nome)}</strong><br>
                    Local: ${e(atividade.local)}<br>
                    ${e(atividade.descricao)}
                </div>
            `;
        });

        html += `
                ${[['Café', refeicoes.cafe], ['Almoço', refeicoes.almoco], ['Jantar', refeicoes.jantar]]
                    .filter(([, valor]) => valor)
                    .map(([rotulo, valor]) => `<p style="margin: 2px 0;"><strong>${rotulo}:</strong> ${e(valor)}</p>`)
                    .join('')}
                ${dia.dicas ? `<p style="margin: 6px 0 0;"><strong>Dica:</strong> ${e(dia.dicas)}</p>` : ''}
            </div>
        `;
    });

    html += `
            <p style="margin-top: 24px; color: #6b7280; font-size: 10px;">${e(rodape || 'Roteiro gerado pela ViajAI')}</p>
        </div>
    `;

    return html;
}

function nomeArquivoPDF(roteiro) {
    const base = (roteiro.titulo || roteiro.destino || 'roteiro')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

    return `${base || 'roteiro'}.pdf`;
}

function imprimirComoPDF(html, titulo) {
    const janela = window.open('', '_blank');

    if (!janela) {
        alert('Não foi possível abrir a janela de impressão. Permita pop-ups para este site e tente novamente.');
        return;
    }

    janela.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escaparHTML(titulo)}</title></head><body style="margin: 24px;">${html}</body></html>`);
    janela.document.close();
    janela.focus();
    janela.print();
}

async function exportarRoteiroPDF(roteiro, botao, rodape) {
    if (!roteiro) return;

    const textoOriginal = botao ? botao.textContent : '';
    const html = montarHTMLDoRoteiro(roteiro, rodape);
    let elemento = null;

    if (botao) {
        botao.disabled = true;
        botao.textContent = 'Gerando PDF...';
    }

    try {
        const html2pdf = await carregarHtml2Pdf();

        // O elemento precisa estar na página para ser "fotografado";
        // fica atrás do conteúdo e é removido logo depois.
        // O wrapper fica fora da tela; o conteúdo interno (sem posicionamento)
        // é o que o html2pdf copia para gerar o PDF.
        elemento = document.createElement('div');
        elemento.style.cssText = 'position: fixed; left: -10000px; top: 0;';
        const conteudo = document.createElement('div');
        conteudo.style.cssText = 'width: 720px; background: #fff;';
        conteudo.innerHTML = html;
        elemento.appendChild(conteudo);
        document.body.appendChild(elemento);

        await html2pdf()
            .set({
                margin: 12,
                filename: nomeArquivoPDF(roteiro),
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, scrollX: 0, scrollY: 0 }, // evita PDF em branco quando a página está rolada
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            })
            .from(conteudo)
            .save();
    } catch (erro) {
        console.warn('Falha ao gerar PDF direto, abrindo impressão:', erro.message);
        imprimirComoPDF(html, roteiro.titulo || 'Roteiro');
    } finally {
        if (elemento) elemento.remove();

        if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    }
}
