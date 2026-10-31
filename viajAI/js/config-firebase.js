// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAWtkSqWiUt942xIfmh06QhVm9sXVG7H_g",
  authDomain: "viajai-4413b.firebaseapp.com",
  projectId: "viajai-4413b",
  storageBucket: "viajai-4413b.firebasestorage.app",
  messagingSenderId: "983468661218",
  appId: "1:983468661218:web:dfffe8980bb3c55e18c1bb",
  measurementId: "G-RXRZN4P6M4"
};

// Inicializar Firebase
let app;
let auth;
let db = null;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();

    // Firestore (usado para salvar/compartilhar roteiros).
    // Só existe nas páginas que carregam o firebase-firestore-compat.js.
    if (typeof firebase.firestore === 'function') {
        db = firebase.firestore();
        try {
            // Ajuda em redes, antivírus e bloqueadores que travam a conexão padrão do Firestore
            db.settings({ experimentalAutoDetectLongPolling: true });
        } catch (e) {
            console.warn('Não foi possível ajustar as configurações do Firestore:', e.message);
        }
    }
    
    // Configurar persistência de autenticação
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch((error) => {
            console.error("Erro ao configurar persistência:", error);
        });
    
    console.log('✓ Firebase inicializado com sucesso!');
} catch (error) {
    console.error('✗ Erro ao inicializar Firebase:', error);
    console.warn('⚠️ Configure suas credenciais do Firebase em js/config-firebase.js');
    console.warn('📖 Veja a seção "Firebase" do README.md para instruções');
}

// Exportar para uso em outros arquivos
window.firebaseApp = app;
window.firebaseAuth = auth;
window.db = db;
