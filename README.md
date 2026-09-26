# ZONABET — Plataforma de Apostas Desportivas (Moçambola & Futebol Internacional)

Plataforma completa de apostas desportivas focada em futebol (Moçambola, Ligas Provinciais e Competições Internacionais), concebida com arquitetura full-stack (React + Express), segurança financeira em Meticais (MZN), controlo de concorrência atómico e painel administrativo para gestão manual de jogos, odds e liquidações.

Esta aplicação opera em **modo de demonstração 100% em memória**, sem necessidade de base de dados externa, garantindo portabilidade total e execução imediata em qualquer ambiente Node.js.

---

## 1. Principais Funcionalidades

### Apostadores (Frontoffice)
- **Registo e Autenticação:** Autenticação segura com senhas criptografadas via `bcryptjs` e sessões gerenciadas por JWT.
- **Jogos & Mercados 1X2:** Confrontos com cotações atualizadas para Casa (1), Empate (X) e Fora (2).
- **Boletim de Apostas Interativo:**
  - Adição dinâmica com 1 clique.
  - Suporte a Apostas Simples e Múltiplas com cálculo automático de odds acumuladas e retorno potencial.
  - Congelamento estrito de odds no momento em que a aposta é submetida.
  - Interface responsiva com design mobile-first e PWA offline-ready.
- **Carteira em MZN:**
  - Saldo em tempo real com proteção contra saldo negativo via serialização por Mutex.
  - Recarga e levantamento com cálculo automático de taxas e auditoria.
- **Histórico e Livro-Razão (Ledger):**
  - Histórico detalhado de bilhetes (`PENDING`, `WON`, `LOST`, `VOID`).
  - Extrato com rastreabilidade de saldo anterior, saldo posterior, tipo e identificador de auditoria.

### Painel Administrativo (Backoffice)
- **Dashboard de Gestão:** Métricas de usuários, jogos, bilhetes ativos, volume de apostas e prémios pagos.
- **Gestão de Jogos e Odds:**
  - Criação de novos jogos (competição, equipas, data/hora e odds iniciais).
  - Alteração de odds em tempo real com o jogo em aberto.
  - Bloqueio e encerramento de mercados.
- **Liquidação Atómica de Resultados:**
  - Introdução do resultado final (golos casa vs fora).
  - Distribuição automática e instantânea de prémios para os apostadores vencedores.
  - Idempotência estrita: bloqueio contra liquidação duplicada de jogos já finalizados.
- **Cancelamento e Reembolso (VOID):** Cancelamento de partidas com devolução integral do montante apostado.
- **Gestão de Usuários:** Bloqueio/desbloqueio e ajustes manuais de saldo devidamente auditados.

---

## 2. Requisitos do Sistema

- **Node.js:** Versão 18, 20 ou 22 LTS
- **Gerenciador de Pacotes:** `npm` (compatível com lockfile v3 padrão)
- **Base de Dados:** Nenhuma (Armazenamento em memória volátil para demonstração)

---

## 3. Instalação e Configuração

### 1. Clonar o repositório e instalar dependências:
```bash
git clone <URL_DO_REPOSITORIO>
cd zonabet
npm install
```

### 2. Configurar Variáveis de Ambiente:
Copie o arquivo de exemplo e configure suas credenciais:
```bash
cp .env.example .env
```

Edite o `.env` com seus valores:
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=gere_uma_chave_longa_e_aleatoria_aqui
```

---

## 4. Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor fullstack em modo de desenvolvimento (porta 3000) |
| `npm run build` | Compila o frontend Vite para `dist/` e o backend para `dist/server.cjs` |
| `npm run build:client` | Compila apenas o frontend estático para `dist/` |
| `npm run build:server` | Compila apenas o backend para `dist/server.cjs` |
| `npm start` | Executa o servidor de produção compilado (`node dist/server.cjs`) |
| `npm test` | Executa a suíte de testes automatizados com 19 cenários |
| `npm run lint` | Valida tipagens TypeScript com `tsc --noEmit` |

---

## 5. Como Executar Localmente

### Modo Desenvolvimento:
```bash
npm run dev
```
Acesse: `http://localhost:3000`

### Modo Produção:
```bash
npm run build
npm start
```
Acesse: `http://localhost:3000`

---

## 6. Guia de Deploy

### Opção A: Deploy com Docker (Qualquer VPS, Render, Railway, Fly.io, Cloud Run)
O projeto inclui um `Dockerfile` multi-stage otimizado:

```bash
docker build -t zonabet:latest .
docker run -d -p 3000:3000 --env-file .env zonabet:latest
```

Ou usando Docker Compose:
```bash
docker compose up --build -d
```

### Opção B: Deploy no Render / Railway / DigitalOcean / VPS
1. Conecte o repositório GitHub à plataforma.
2. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:** Adicione as variáveis descritas no `.env.example`.

---

## 7. Deploy no Cloudflare (Instruções e Limitações)

### Entendendo a Arquitetura no Cloudflare
O ZONABET é um aplicativo **full-stack** composto por:
1. **Frontend:** Single Page Application (SPA) React com Vite.
2. **Backend:** Servidor Node.js Express com controle de concorrência em memória (`async-mutex`) e rotas REST `/api/*`.

### Limitações do Cloudflare Pages (Serverless Edge)
- O **Cloudflare Pages** padrão hospeda arquivos estáticos e executa funções em V8 Edge Isolates (não é um processo contínuo Node.js com `server.listen`).
- Servidores Express contínuos com `app.listen()` não rodam nativamente dentro de um worker simples do Cloudflare Pages sem adaptação para o runtime Edge.

### Como Fazer Deploy Utilizando o Cloudflare com Sucesso:

#### Arquitetura Recomendada (Desacoplada):
1. **Frontend no Cloudflare Pages:**
   - **Build command:** `npm run build:client`
   - **Build output directory:** `dist`
   - **Environment variable no Cloudflare:** Defina `JWT_SECRET`.
2. **Backend Node.js em Hospedagem Contínua:**
   - Faça deploy do backend Express no **Render**, **Railway**, **Fly.io** ou **VPS**.
   - Configure o domínio do backend no frontend.

#### Arquitetura Unificada (Cloudflare como Proxy/CDN):
- Faça o deploy da aplicação completa (usando o `Dockerfile` ou `npm run build && npm start`) em qualquer servidor ou container (ex.: VPS, Fly.io, Railway).
- Aponte o domínio no Cloudflare ativando o **Proxy (Nuvem Laranja)**. O Cloudflare fornecerá proteção DDoS, SSL gratuito, compressão Brotli e cache CDN para os assets estáticos gerados em `dist/`.

---

## 8. Contas de Demonstração

| Perfil | Email | Palavra-passe |
|---|---|---|
| **Administrador** | `admin@example.com` | `Admin123!ChangeMe` |
| **Apostador Teste** | `apostador@exemplo.co.mz` | `Apostador123!` |

---

## 9. Conformidade e Segurança

- Nenhum token, chave secreta ou credencial real está gravado no código ou no versionamento Git.
- Todos os segredos devem ser configurados exclusivamente via variáveis de ambiente (`.env`).
- As transações financeiras e apostas operam com integridade concorrencial estrita para proteção da banca e do apostador.
