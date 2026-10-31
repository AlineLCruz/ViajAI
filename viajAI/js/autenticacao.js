// Gerenciamento de Autenticação Firebase

// ===== Botão de "olhinho" para mostrar/ocultar a senha =====
const ICONE_OLHO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONE_OLHO_FECHADO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function adicionarBotoesVerSenha(raiz = document) {
    raiz.querySelectorAll('input[type="password"]:not([data-ver-senha])').forEach(input => {
        input.setAttribute('data-ver-senha', '1');

        const wrapper = document.createElement('div');
        wrapper.className = 'campo-senha';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'btn-ver-senha';
        botao.setAttribute('aria-label', 'Mostrar senha');
        botao.setAttribute('aria-pressed', 'false');
        botao.innerHTML = ICONE_OLHO;

        botao.addEventListener('click', () => {
            const mostrando = input.type === 'text';
            input.type = mostrando ? 'password' : 'text';
            botao.innerHTML = mostrando ? ICONE_OLHO : ICONE_OLHO_FECHADO;
            botao.setAttribute('aria-label', mostrando ? 'Mostrar senha' : 'Ocultar senha');
            botao.setAttribute('aria-pressed', String(!mostrando));
            input.focus();
        });

        wrapper.appendChild(botao);
    });
}

document.addEventListener('DOMContentLoaded', () => adicionarBotoesVerSenha());

// ===== Recuperação de senha =====
async function enviarEmailRecuperacaoSenha(email) {
    const emailLimpo = String(email || '').trim();

    if (!emailLimpo) {
        throw Object.assign(new Error('Informe seu email'), { code: 'viajai/sem-email' });
    }

    auth.languageCode = 'pt-BR';
    await auth.sendPasswordResetEmail(emailLimpo);
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.setupAuthStateListener();
    }

    setupAuthStateListener() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateUIBasedOnAuth();
        });
    }

    async registerWithEmail(email, password, displayName) {
        try {
            // Criar usuário
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Atualizar perfil com nome
            await userCredential.user.updateProfile({
                displayName: displayName
            });

            // Salvar dados adicionais no Firestore (não bloqueia o cadastro se falhar)
            await this.salvarPerfilUsuario(userCredential.user, { displayName });

            console.log("Usuário registrado com sucesso!");
            return userCredential.user;
        } catch (error) {
            console.error("Erro ao registrar:", error.message);
            throw error;
        }
    }

    // Grava o perfil do usuário no Firestore. Se o Firestore não estiver
    // disponível ou as regras bloquearem, apenas registra no console:
    // a conta já foi criada no Firebase Auth e o usuário pode seguir.
    async salvarPerfilUsuario(user, extras = {}) {
        if (!window.db) return;

        try {
            await window.db.collection('users').doc(user.uid).set({
                email: user.email || '',
                displayName: extras.displayName || user.displayName || '',
                photoURL: user.photoURL || '',
                createdAt: new Date()
            }, { merge: true });
        } catch (error) {
            console.warn('Não foi possível salvar o perfil no Firestore:', error.message);
        }
    }

    async loginWithEmail(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log("Login realizado com sucesso!");
            return userCredential.user;
        } catch (error) {
            console.error("Erro ao fazer login:", error.message);
            throw error;
        }
    }

    async logout() {
        try {
            await auth.signOut();
            // Limpa a sessão salva pelas páginas de login/cadastro
            localStorage.removeItem('usuarioLogado');
            console.log("Logout realizado com sucesso!");
        } catch (error) {
            console.error("Erro ao fazer logout:", error.message);
            throw error;
        }
    }

    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            
            // Verificar se é novo usuário
            if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
                await this.salvarPerfilUsuario(result.user);
            }

            console.log("Login com Google realizado com sucesso!");
            return result.user;
        } catch (error) {
            console.error("Erro ao fazer login com Google:", error.message);
            throw error;
        }
    }

    traduzirErroAuth(error) {
        const codigo = error && error.code ? error.code : '';

        switch (codigo) {
            case 'auth/invalid-login-credentials':
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Email ou senha incorretos. Se você criou a conta com o Google, use "Entrar com Google". Esqueceu a senha? Clique em "Esqueci minha senha".';
            case 'viajai/sem-email':
                return 'Digite seu email no campo acima para recuperar a senha.';
            case 'auth/email-already-in-use':
                return 'Este email já está cadastrado. Faça login ou utilize outro email.';
            case 'auth/invalid-email':
                return 'Email inválido. Verifique e tente novamente.';
            case 'auth/weak-password':
                return 'Senha muito fraca. Use pelo menos 6 caracteres.';
            case 'auth/user-disabled':
                return 'Esta conta foi desativada.';
            case 'auth/too-many-requests':
                return 'Muitas tentativas. Aguarde um momento e tente novamente.';
            case 'auth/network-request-failed':
                return 'Falha de conexão. Verifique sua internet e tente novamente.';
            default:
                return 'Não foi possível concluir a operação. Tente novamente.';
        }
    }

    updateUIBasedOnAuth() {
        const btnLogin = document.getElementById('btnLogin');
        const btnCadastro = document.getElementById('btnCadastro');

        if (this.currentUser) {
            // Usuário autenticado
            if (btnLogin) {
                btnLogin.textContent = this.currentUser.displayName || 'Minha Conta';
                btnLogin.onclick = () => { window.location.href = 'painel.html'; };
            }
            if (btnCadastro) {
                btnCadastro.textContent = 'Sair';
                btnCadastro.onclick = () => this.logout();
            }
        } else {
            // Usuário não autenticado
            if (btnLogin) {
                btnLogin.textContent = 'Entrar';
                btnLogin.onclick = () => this.showAuthModal('login');
            }
            if (btnCadastro) {
                btnCadastro.textContent = 'Cadastro';
                btnCadastro.onclick = () => this.showAuthModal('register');
            }
        }
    }

    showAuthModal(type) {
        const modal = document.getElementById('authModal');
        const container = document.getElementById('authContainer');

        if (type === 'login') {
            container.innerHTML = `
                <h2>Fazer Login</h2>
                <form id="loginForm">
                    <div class="form-group">
                        <label for="loginEmail">Email:</label>
                        <input type="email" id="loginEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Senha:</label>
                        <input type="password" id="loginPassword" required>
                    </div>
                    <p style="text-align: right; margin: -4px 0 16px; font-size: 13px;">
                        <a href="#" id="esqueciSenhaModal" style="color: var(--primary);">Esqueci minha senha</a>
                    </p>
                    <button type="submit" class="btn-primary" style="width: 100%;">Entrar</button>
                    <button type="button" class="btn-secondary" style="width: 100%; margin-top: 12px;" id="googleLoginBtn">
                        Entrar com Google
                    </button>
                    <p style="text-align: center; margin-top: 16px; font-size: 14px;">
                        Não tem conta? <a href="#" onclick="authManager.showAuthModal('register'); return false;" style="color: var(--primary); cursor: pointer;">Cadastre-se</a>
                    </p>
                </form>
            `;

            document.getElementById('loginForm').onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                
                try {
                    await this.loginWithEmail(email, password);
                    modal.classList.add('hidden');
                } catch (error) {
                    alert(this.traduzirErroAuth(error));
                }
            };

            document.getElementById('esqueciSenhaModal').onclick = async (e) => {
                e.preventDefault();
                try {
                    await enviarEmailRecuperacaoSenha(document.getElementById('loginEmail').value);
                    alert('Se existir uma conta com este email, enviamos um link para criar uma nova senha. Confira também a caixa de spam.');
                } catch (error) {
                    alert(this.traduzirErroAuth(error));
                }
            };

            document.getElementById('googleLoginBtn').onclick = async () => {
                try {
                    await this.loginWithGoogle();
                    modal.classList.add('hidden');
                } catch (error) {
                    if (error.code !== 'auth/popup-closed-by-user') {
                        alert(this.traduzirErroAuth(error));
                    }
                }
            };
        } else {
            container.innerHTML = `
                <h2>Criar Conta</h2>
                <form id="registerForm">
                    <div class="form-group">
                        <label for="registerName">Nome:</label>
                        <input type="text" id="registerName" required>
                    </div>
                    <div class="form-group">
                        <label for="registerEmail">Email:</label>
                        <input type="email" id="registerEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="registerPassword">Senha:</label>
                        <input type="password" id="registerPassword" required>
                    </div>
                    <button type="submit" class="btn-primary" style="width: 100%;">Cadastrar</button>
                    <button type="button" class="btn-secondary" style="width: 100%; margin-top: 12px;" id="googleRegisterBtn">
                        Cadastrar com Google
                    </button>
                    <p style="text-align: center; margin-top: 16px; font-size: 14px;">
                        Já tem conta? <a href="#" onclick="authManager.showAuthModal('login'); return false;" style="color: var(--primary); cursor: pointer;">Faça login</a>
                    </p>
                </form>
            `;

            document.getElementById('registerForm').onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('registerName').value;
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                
                try {
                    await this.registerWithEmail(email, password, name);
                    modal.classList.add('hidden');
                } catch (error) {
                    alert(this.traduzirErroAuth(error));
                }
            };

            document.getElementById('googleRegisterBtn').onclick = async () => {
                try {
                    await this.loginWithGoogle();
                    modal.classList.add('hidden');
                } catch (error) {
                    if (error.code !== 'auth/popup-closed-by-user') {
                        alert(this.traduzirErroAuth(error));
                    }
                }
            };
        }

        adicionarBotoesVerSenha(container);
        modal.classList.remove('hidden');
    }
}

// Inicializar gerenciador de autenticação
const authManager = new AuthManager();

// Fechar modal ao clicar no X
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.modal-close');

    // Páginas como login.html e cadastro.html não têm o modal
    if (!modal) return;

    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }

    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    };
});

// Adicionar estilos para o modal
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    #authContainer h2 {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 24px;
        color: var(--text-primary);
    }

    #authContainer .form-group {
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
    }

    #authContainer label {
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--text-primary);
        font-size: 14px;
    }

    #authContainer input {
        padding: 12px 16px;
        border: 1px solid var(--neutral-gray);
        border-radius: var(--border-radius);
        font-size: 14px;
        font-family: 'Plus Jakarta Sans', sans-serif;
    }

    #authContainer input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(45, 134, 89, 0.1);
    }

    .campo-senha {
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .campo-senha input {
        padding-right: 48px !important;
    }

    .btn-ver-senha {
        position: absolute;
        right: 6px;
        top: 50%;
        transform: translateY(-50%);
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        border-radius: 6px;
        color: #64748B;
        cursor: pointer;
        padding: 0;
    }

    .btn-ver-senha:hover,
    .btn-ver-senha:focus-visible {
        color: var(--primary, #2D8659);
        background: rgba(45, 134, 89, 0.08);
        outline: none;
    }

    #authContainer p a {
        text-decoration: none;
        font-weight: 600;
    }

    #authContainer p a:hover {
        text-decoration: underline;
    }
`;
document.head.appendChild(styleSheet);
