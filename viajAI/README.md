# ViajAI — Gerador de Roteiros de Viagem com IA

Site que gera roteiros de viagem personalizados, dia a dia, usando a API da OpenAI. O usuário informa destino, cidade de origem, duração, número de pessoas, datas, interesses e orçamento (nível e, se quiser, um valor total em reais), e recebe um roteiro com atividades, refeições e dicas, que pode salvar, favoritar, compartilhar por link e exportar em PDF.

## Tecnologias

- **Front-end:** HTML5, CSS3 e JavaScript puro (sem frameworks)
- **IA:** OpenAI Chat Completions (`gpt-4o`, resposta em JSON; o modelo é trocado em `MODELO_OPENAI`, no topo de `js/criar.js`)
- **Lugares reais:** OpenStreetMap (Nominatim para achar a cidade e Overpass para listar os lugares), gratuito e sem chave
- **Fotos:** API pública da Wikipédia
- **Autenticação:** Firebase Authentication (email/senha e Google)
- **Banco de dados:** Firebase Firestore (roteiros compartilhados e perfis de usuário)
- **Armazenamento local:** `localStorage` (histórico e favoritos do usuário no navegador)
- **PDF:** [html2pdf.js](https://github.com/eKoopmans/html2pdf.js), carregado via CDN só quando o usuário exporta

## Funcionalidades

- Página inicial com apresentação do produto
- Cadastro e login com email/senha ou conta Google (ao cadastrar, aparece "Cadastro feito com sucesso!", a pessoa já fica logada e é levada ao painel), com botão para mostrar a senha e "Esqueci minha senha" (email de redefinição do Firebase)
- Criação de roteiro em 5 etapas: destino e origem → duração/pessoas/datas → interesses → orçamento (nível + valor em R$, opcional) → resumo
  - A cidade de origem faz a IA planejar a chegada (dia 1 mais leve) e a volta (último dia com folga)
  - Com o valor em R$, a IA estima o custo de cada atividade, refeição e do transporte local; o site soma tudo e avisa se passou do limite (os valores são estimativas, sem passagem e hospedagem)
  - O roteiro traz como chegar em cada atividade e marca o que precisa de reserva ou ingresso antecipado
  - Completa o país automaticamente para cidades conhecidas (ex.: "Lisboa" → "Lisboa, Portugal")
  - Duração limitada a 15 dias para a resposta da IA não ser cortada
  - Datas sincronizadas com a duração: ao escolher a data de início, a de término é preenchida sozinha (e mudar a data de término ajusta a duração)
- **Lugares reais:** antes de chamar a IA, o site busca no OpenStreetMap pontos turísticos, restaurantes e cafés que existem de verdade na cidade e manda essa lista para a IA, que só pode escolher entre eles. Cada lugar confirmado ganha um link "Ver no mapa" (Google Maps), e o roteiro mostra quantos lugares foram confirmados. Se o OpenStreetMap estiver fora do ar, o roteiro é gerado do jeito antigo
- Página de resultado com atividades, refeições e dicas de cada dia, com fotos reais dos lugares (API pública da Wikipédia; enquanto carrega, ou se não houver foto, aparece uma ilustração local)
- Salvar e favoritar roteiros (painel "Minhas Viagens" e "Favoritos")
- **Compartilhar:** publica o roteiro no Firestore e gera um link curto `compartilhado.html?id=...`. Se o Firestore não responder em 8 segundos, gera um link com o roteiro compactado dentro dele (`compartilhado.html#r=...`). Os dois abrem em qualquer dispositivo, mesmo sem login
- **Exportar PDF:** baixa um arquivo `.pdf` com o roteiro (se a biblioteca não carregar, abre a impressão do navegador para "Salvar como PDF")
- **Reservar hospedagem:** abre a busca no Booking já com destino, datas e número de pessoas
- **Ajustar preferências:** volta ao formulário com os dados do roteiro preenchidos para gerar uma nova versão
- Página de demonstração (`demonstracao.html`)
- Layout responsivo, com menu recolhível no celular

## Estrutura do projeto

```
viajAI/
├── index.html              # Redireciona para indice.html
├── indice.html             # Página inicial
├── login.html              # Login
├── cadastro.html           # Cadastro
├── criar.html              # Formulário em etapas para gerar o roteiro
├── resultado.html          # Roteiro gerado (salvar, favoritar, compartilhar, PDF)
├── painel.html             # Painel do usuário (Explorar, Minhas Viagens, Favoritos)
├── compartilhado.html      # Visualização pública de um roteiro compartilhado
├── demonstracao.html       # Demonstração do produto
├── firestore.rules         # Regras de segurança do Firestore
├── CONFIGURAR-CHAVE-OPENAI.md # Passo a passo para configurar a chave da OpenAI
├── estilos/                # CSS de cada página + principal.css (global)
├── imagens/                # Logos
└── js/
    ├── config-firebase.js  # Inicializa Firebase (auth + db). Pode ir para o GitHub
    ├── config-openai.example.js # Modelo do arquivo da chave da OpenAI (vai para o GitHub)
    ├── config-openai.js    # Chave da OpenAI de verdade. SÓ no seu computador (está no .gitignore)
    ├── autenticacao.js     # Login/cadastro pelo modal e estado do usuário no cabeçalho
    ├── login.js            # Página de login
    ├── cadastro.js         # Página de cadastro
    ├── criar.js            # Formulário, validações, prompt e chamada à OpenAI
    ├── resultado.js        # Exibição do roteiro e ações (compartilhar, PDF, reservar...)
    ├── compartilhado.js    # Carrega o roteiro público do Firestore
    ├── painel.js           # Lista roteiros salvos e favoritos
    ├── exportar-pdf.js     # Geração do PDF (usado em resultado e compartilhado)
    ├── menu-mobile.js      # Botão "Menu" que abre a navegação no celular
    ├── imagens-destino.js  # Fotos dos lugares (Wikipédia) com ilustração reserva que nunca quebra
    ├── lugares-reais.js    # Busca lugares reais no OpenStreetMap e confere as escolhas da IA
    ├── link-roteiro.js     # Compacta o roteiro dentro do link (plano B do compartilhamento)
    ├── principal.js        # Página inicial: leva o formulário e o botão final para criar.html
    └── demonstracao.js     # Scripts da página de demonstração
```

## Como os dados são guardados

| Dado | Onde fica | Por quê |
|---|---|---|
| Conta do usuário | Firebase Authentication | Login seguro com email/senha e Google |
| Perfil | Firestore, coleção `users` | Dados extras do usuário |
| Roteiros criados e favoritos | `localStorage` do navegador | Acesso rápido, sem custo de banco |
| Roteiros compartilhados | Firestore, coleção `roteiros` | O link precisa abrir em qualquer dispositivo |

