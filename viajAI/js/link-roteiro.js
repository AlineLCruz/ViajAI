// js/link-roteiro.js
// Plano B do compartilhamento: quando o Firestore não responde, o roteiro inteiro
// vai compactado dentro do próprio link (depois do "#"), então o link abre em
// qualquer dispositivo sem precisar de banco de dados.
// Formato: compartilhado.html#r=<prefixo><dados em base64url>
//   prefixo "z" = JSON compactado com deflate | "j" = JSON sem compactação

function bytesParaBase64Url(bytes) {
    let binario = '';
    const bloco = 0x8000;
    for (let i = 0; i < bytes.length; i += bloco) {
        binario += String.fromCharCode.apply(null, bytes.subarray(i, i + bloco));
    }
    return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlParaBytes(texto) {
    const base64 = texto.replace(/-/g, '+').replace(/_/g, '/');
    const binario = atob(base64 + '==='.slice((base64.length + 3) % 4));
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
}

async function transformarBytes(bytes, stream) {
    const resposta = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await resposta.arrayBuffer());
}

async function codificarRoteiroParaLink(roteiro) {
    const bytes = new TextEncoder().encode(JSON.stringify(roteiro));

    if (typeof CompressionStream === 'function') {
        const compactado = await transformarBytes(bytes, new CompressionStream('deflate'));
        return 'z' + bytesParaBase64Url(compactado);
    }

    return 'j' + bytesParaBase64Url(bytes);
}

async function decodificarRoteiroDoLink(codigo) {
    const tipo = codigo.charAt(0);
    let bytes = base64UrlParaBytes(codigo.slice(1));

    if (tipo === 'z') {
        if (typeof DecompressionStream !== 'function') {
            throw new Error('Navegador sem suporte a descompactação');
        }
        bytes = await transformarBytes(bytes, new DecompressionStream('deflate'));
    } else if (tipo !== 'j') {
        throw new Error('Link de roteiro inválido');
    }

    return JSON.parse(new TextDecoder().decode(bytes));
}
