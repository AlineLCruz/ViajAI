// Login - JavaScript

const loginForm = document.getElementById('loginForm');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');

// Envio do formulário de login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    if (!email || !senha) {
        mostrarErro('Por favor, preencha todos os campos');
        return;
    }

    await fazerLogin(email, senha);
});

// Login com Google
googleLoginBtn.addEventListener('click', async () => {
    await loginComGoogle();
});

// Função de login com email e senha
async function fazerLogin(email, senha) {
    mostrarCarregamento(true);
    limparErro();

    try {
        const resultado = await firebase.auth().signInWithEmailAndPassword(email, senha);
        console.log('✓ Login realizado com sucesso!', resultado.user);
        
        // Salvar informações do usuário
        localStorage.setItem('usuarioLogado', JSON.stringify({
            uid: resultado.user.uid,
            email: resultado.user.email,
            nome: resultado.user.displayName || email.split('@')[0]
        }));

        mostrarSucesso('Login realizado com sucesso! Entrando...');

        // Redirecionar para dashboard
        setTimeout(() => {
            window.location.href = 'painel.html';
        }, 500);
    } catch (error) {
        console.error('✗ Erro ao fazer login:', error);
        
        let mensagem = `Não foi possível entrar (código: ${error.code || 'desconhecido'}). Tente de novo.`;
        
        if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/invalid-credential') {
            mensagem = 'Email ou senha incorretos. Se você criou a conta com o Google, use "Continuar com Google". Esqueceu a senha? Clique em "Esqueci minha senha".';
        } else if (error.code === 'auth/too-many-requests') {
            mensagem = 'Muitas tentativas. Aguarde um momento e tente novamente.';
        } else if (error.code === 'auth/user-not-found') {
            mensagem = 'Usuário não encontrado. Crie uma conta!';
        } else if (error.code === 'auth/wrong-password') {
            mensagem = 'Senha incorreta. Tente novamente!';
        } else if (error.code === 'auth/invalid-email') {
            mensagem = 'Email inválido';
        } else if (error.code === 'auth/user-disabled') {
            mensagem = 'Usuário desativado';
        } else if (error.code === 'auth/network-request-failed') {
            mensagem = 'Falha de conexão. Verifique sua internet e tente de novo.';
        } else if (window.location.protocol === 'file:') {
            mensagem = 'O login não funciona abrindo o arquivo direto do computador (file://). Abra o site por um servidor, como o Live Server do VS Code, ou pelo endereço publicado.';
        }
        
        mostrarErro(mensagem);
    } finally {
        mostrarCarregamento(false);
    }
}

// Função de login com Google
async function loginComGoogle() {
    mostrarCarregamento(true);
    limparErro();

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const resultado = await firebase.auth().signInWithPopup(provider);
        
        console.log('✓ Login com Google realizado!', resultado.user);
        
        // Salvar informações do usuário
        localStorage.setItem('usuarioLogado', JSON.stringify({
            uid: resultado.user.uid,
            email: resultado.user.email,
            nome: resultado.user.displayName,
            foto: resultado.user.photoURL
        }));

        // Redirecionar para dashboard
        setTimeout(() => {
            window.location.href = 'painel.html';
        }, 500);
    } catch (error) {
        console.error('✗ Erro ao fazer login com Google:', error);
        
        if (error.code !== 'auth/popup-closed-by-user') {
            mostrarErro('Erro ao fazer login com Google');
        }
    } finally {
        mostrarCarregamento(false);
    }
}

// Esqueci minha senha: envia o email de redefinição do Firebase
const linkEsqueciSenha = document.getElementById('esqueciSenha');

if (linkEsqueciSenha) {
    linkEsqueciSenha.addEventListener('click', async (e) => {
        e.preventDefault();
        limparErro();

        const email = document.getElementById('email').value.trim();

        if (!email) {
            mostrarErro('Digite seu email no campo acima e clique de novo em "Esqueci minha senha".');
            document.getElementById('email').focus();
            return;
        }

        mostrarCarregamento(true);

        try {
            await enviarEmailRecuperacaoSenha(email);
            mostrarSucesso(`Se existir uma conta com ${email}, enviamos um link para criar uma nova senha. Confira também a caixa de spam.`);
        } catch (error) {
            console.error('Erro ao enviar recuperação de senha:', error);
            mostrarErro(error.code === 'auth/invalid-email'
                ? 'Email inválido.'
                : 'Não foi possível enviar o email agora. Tente novamente em instantes.');
        } finally {
            mostrarCarregamento(false);
        }
    });
}

// Funções auxiliares
function mostrarErro(mensagem) {
    errorMessage.textContent = mensagem;
    errorMessage.classList.remove('hidden', 'sucesso');
    errorMessage.classList.add('show');
}

function mostrarSucesso(mensagem) {
    errorMessage.textContent = mensagem;
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add('show', 'sucesso');
}

function limparErro() {
    errorMessage.classList.add('hidden');
    errorMessage.classList.remove('show');
}

function mostrarCarregamento(ativo) {
    if (ativo) {
        loadingSpinner.classList.add('show');
        loginForm.style.opacity = '0.5';
        loginForm.style.pointerEvents = 'none';
    } else {
        loadingSpinner.classList.remove('show');
        loginForm.style.opacity = '1';
        loginForm.style.pointerEvents = 'auto';
    }
}

// Verificar se já está logado
// (usa o estado real do Firebase, e não o localStorage, que pode estar desatualizado)
// Só a primeira verificação conta: depois disso quem redireciona é o
// próprio fluxo de login/cadastro (que ainda precisa terminar de salvar o nome).
let verificacaoInicialFeita = false;
firebase.auth().onAuthStateChanged((user) => {
    if (verificacaoInicialFeita) return;
    verificacaoInicialFeita = true;

    if (user) {
        window.location.href = 'painel.html';
    } else {
        localStorage.removeItem('usuarioLogado');
    }
});

console.log('✓ Script de login carregado');
