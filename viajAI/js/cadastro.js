// Cadastro - JavaScript

const cadastroForm = document.getElementById('cadastroForm');
const googleSignupBtn = document.getElementById('googleSignupBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const areaFormulario = document.getElementById('areaFormulario');
const painelSucesso = document.getElementById('cadastroSucesso');
const tituloSucesso = document.getElementById('cadastroSucessoTitulo');
const textoSucesso = document.getElementById('cadastroSucessoTexto');
const btnIrPainel = document.getElementById('btnIrPainel');

// Tempo que a mensagem de sucesso fica na tela antes de ir para o painel
const TEMPO_REDIRECIONAMENTO_MS = 2500;
// Se o Firebase não responder nesse tempo, avisamos o usuário em vez de ficar travado
const TEMPO_LIMITE_CADASTRO_MS = 20000;

// Enquanto true, o listener de "já está logado" não redireciona sozinho
// (o próprio fluxo de cadastro mostra a mensagem e redireciona)
let cadastroEmAndamento = false;

// Envio do formulário de cadastro
cadastroForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('emailCadastro').value.trim();
    const senha = document.getElementById('senhaCadastro').value;
    const senhaConfirm = document.getElementById('senhaConfirm').value;
    const termos = document.getElementById('termos').checked;

    // Validações
    if (!nome || !email || !senha || !senhaConfirm) {
        mostrarErro('Por favor, preencha todos os campos');
        return;
    }

    if (senha.length < 6) {
        mostrarErro('A senha deve ter no mínimo 6 caracteres');
        return;
    }

    if (senha !== senhaConfirm) {
        mostrarErro('As senhas não conferem');
        return;
    }

    if (!termos) {
        mostrarErro('Você deve concordar com os Termos de Serviço');
        return;
    }

    await fazerCadastro(nome, email, senha);
});

// Cadastro com Google
googleSignupBtn.addEventListener('click', async () => {
    await cadastroComGoogle();
});

// Botão "Ir para o meu painel" da tela de sucesso
btnIrPainel.addEventListener('click', irParaPainel);

// Função de cadastro com email e senha
async function fazerCadastro(nome, email, senha) {
    if (cadastroEmAndamento) return;
    cadastroEmAndamento = true;

    mostrarCarregamento(true);
    limparMensagem();

    try {
        // 1) Cria a conta. O Firebase já deixa a pessoa logada automaticamente.
        const resultado = await comTempoLimite(
            firebase.auth().createUserWithEmailAndPassword(email, senha),
            TEMPO_LIMITE_CADASTRO_MS
        );
        const user = resultado.user;

        console.log('✓ Cadastro realizado com sucesso! Usuário já está logado:', user.uid);

        // 2) A conta já existe. Daqui para frente nada pode impedir a mensagem de sucesso.
        try {
            await user.updateProfile({ displayName: nome });
        } catch (erroNome) {
            console.warn('Não foi possível salvar o nome no perfil:', erroNome.message);
        }

        // Perfil no Firestore em segundo plano (sem await: se o banco demorar, não trava a tela)
        if (typeof authManager !== 'undefined') {
            authManager.salvarPerfilUsuario(user, { displayName: nome });
        }

        guardarUsuarioLocal(user, nome);
        mostrarCadastroConcluido(nome, 'Cadastro feito com sucesso!');
    } catch (error) {
        cadastroEmAndamento = false;
        console.error('✗ Erro ao fazer cadastro:', error.code, error.message);
        mostrarErro(traduzirErroCadastro(error));
    } finally {
        mostrarCarregamento(false);
    }
}

// Função de cadastro com Google
async function cadastroComGoogle() {
    if (cadastroEmAndamento) return;
    cadastroEmAndamento = true;

    mostrarCarregamento(true);
    limparMensagem();

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const resultado = await firebase.auth().signInWithPopup(provider);
        const user = resultado.user;
        const contaNova = !!(resultado.additionalUserInfo && resultado.additionalUserInfo.isNewUser);

        console.log('✓ Login com Google concluído. Conta nova?', contaNova);

        if (contaNova && typeof authManager !== 'undefined') {
            authManager.salvarPerfilUsuario(user);
        }

        const nome = user.displayName || (user.email ? user.email.split('@')[0] : 'você');
        guardarUsuarioLocal(user, nome);
        mostrarCadastroConcluido(
            nome,
            contaNova ? 'Cadastro feito com sucesso!' : 'Você já tinha conta, então entramos nela!'
        );
    } catch (error) {
        cadastroEmAndamento = false;
        console.error('✗ Erro ao fazer cadastro com Google:', error.code, error.message);

        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            mostrarErro(traduzirErroCadastro(error, 'Google'));
        }
    } finally {
        mostrarCarregamento(false);
    }
}

// ===== Tela de sucesso =====
function mostrarCadastroConcluido(nome, titulo) {
    limparMensagem();

    tituloSucesso.textContent = titulo;
    textoSucesso.textContent = `Você já está logado como ${nome}. Estamos te levando para o seu painel...`;

    areaFormulario.style.display = 'none';
    painelSucesso.classList.add('show');
    if (painelSucesso.scrollIntoView) painelSucesso.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(irParaPainel, TEMPO_REDIRECIONAMENTO_MS);
}

function irParaPainel() {
    window.location.href = 'painel.html';
}

function guardarUsuarioLocal(user, nome) {
    try {
        localStorage.setItem('usuarioLogado', JSON.stringify({
            uid: user.uid,
            email: user.email,
            nome: nome,
            foto: user.photoURL || ''
        }));
    } catch (e) {
        console.warn('Não foi possível guardar o usuário no navegador:', e.message);
    }
}

// ===== Erros =====
function traduzirErroCadastro(error, origem = 'email') {
    const codigo = (error && error.code) || '';

    const mensagens = {
        'auth/email-already-in-use': 'Este email já está registrado. Faça login!',
        'auth/invalid-email': 'Email inválido. Confira e tente de novo.',
        'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres.',
        'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente de novo.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento e tente de novo.',
        'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.',
        'auth/operation-not-allowed': `Cadastro por ${origem === 'Google' ? 'Google' : 'email e senha'} indisponível no momento (auth/operation-not-allowed).`,
        'auth/unauthorized-domain': 'Este endereço do site não está autorizado para login (auth/unauthorized-domain).',
        'auth/operation-not-supported-in-this-environment': 'O login não funciona abrindo o arquivo direto do computador (file://). Abra o site por um servidor, como o Live Server do VS Code, ou pelo endereço publicado.',
        'viajai/tempo-esgotado': 'O cadastro demorou demais. Verifique sua conexão e tente de novo. Se a conta chegou a ser criada, use a página de login.'
    };

    // Dicas para quem mantém o site (aparecem só no console)
    const dicasParaDev = {
        'auth/operation-not-allowed': 'Firebase Console > Authentication > Sign-in method: ative "E-mail/senha" (e "Google", se usar).',
        'auth/unauthorized-domain': 'Firebase Console > Authentication > Settings > Domínios autorizados: adicione o domínio do site (e "localhost" para testes).'
    };
    if (dicasParaDev[codigo]) console.warn('💡 Dica:', dicasParaDev[codigo]);

    if (mensagens[codigo]) return mensagens[codigo];

    if (window.location.protocol === 'file:') {
        return mensagens['auth/operation-not-supported-in-this-environment'];
    }

    return `Não foi possível concluir o cadastro (código: ${codigo || 'desconhecido'}). Tente de novo.`;
}

// Rejeita se a promessa demorar mais que "ms" milissegundos
function comTempoLimite(promessa, ms) {
    let timer;
    const limite = new Promise((_, rejeitar) => {
        timer = setTimeout(() => {
            rejeitar(Object.assign(new Error('Tempo esgotado'), { code: 'viajai/tempo-esgotado' }));
        }, ms);
    });

    return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

// ===== Mensagens na tela (a caixa fica no topo do cartão) =====
function mostrarErro(mensagem) {
    errorMessage.textContent = '❌ ' + mensagem;
    errorMessage.classList.remove('hidden', 'sucesso');
    errorMessage.classList.add('show');
    if (errorMessage.scrollIntoView) errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function limparMensagem() {
    errorMessage.classList.add('hidden');
    errorMessage.classList.remove('show', 'sucesso');
}

function mostrarCarregamento(ativo) {
    if (ativo) {
        loadingSpinner.classList.add('show');
        cadastroForm.style.opacity = '0.5';
        cadastroForm.style.pointerEvents = 'none';
    } else {
        loadingSpinner.classList.remove('show');
        cadastroForm.style.opacity = '1';
        cadastroForm.style.pointerEvents = 'auto';
    }
}

// Avisa logo de cara quando o site foi aberto direto do arquivo (o Firebase não funciona assim)
if (window.location.protocol === 'file:') {
    mostrarErro('Você abriu o site direto do arquivo (file://). O cadastro e o login precisam de um servidor: use o Live Server do VS Code ou o endereço publicado.');
}

// Verificar se já está logado
// (usa o estado real do Firebase, e não o localStorage, que pode estar desatualizado)
// Só a primeira verificação conta: depois disso quem redireciona é o
// próprio fluxo de cadastro (que mostra a mensagem de sucesso antes).
let verificacaoInicialFeita = false;
firebase.auth().onAuthStateChanged((user) => {
    if (verificacaoInicialFeita || cadastroEmAndamento) return;
    verificacaoInicialFeita = true;

    if (user) {
        irParaPainel();
    } else {
        localStorage.removeItem('usuarioLogado');
    }
});

console.log('✓ Script de cadastro carregado');
