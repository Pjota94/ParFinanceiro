# 💑 Par Financeiro

Sistema financeiro para casais que querem organizar as finanças com **transparência e amor**.

## ✨ Funcionalidades

- **Cadastro do Casal** — Cada pessoa tem seu próprio login com senha
- **Rendas** — Registre os ganhos individuais de cada mês (salário, freelance, investimentos...)
- **Gastos** — Acompanhe as despesas por categoria, com suporte a gastos compartilhados
- **Metas & Sonhos** — Definam objetivos financeiros juntos (viagem, casa, casamento...) com progresso visual
- **Dashboard** — Visão geral com gráficos, saldo, taxa de poupança e histórico dos últimos 6 meses
- **Transparência total** — Cada um vê os lançamentos do(a) parceiro(a)

## 🛠️ Tecnologias

Aplicação **full-stack num único projeto Next.js** (frontend + API no mesmo app):

- Next.js 16.2.12 (App Router) — páginas e rotas de API em `src/app/api/*`
- React 19 + TypeScript
- Tailwind CSS v4
- Banco SQLite via **libsql/Turso** (`@libsql/client`)
- JWT para autenticação, bcryptjs para senhas
- Recharts (gráficos), Axios (cliente HTTP)

## 🚀 Como executar (desenvolvimento)

```bash
cd frontend
npm install
cp .env.example .env   # defina um JWT_SECRET; deixe TURSO_* em branco para usar arquivo local
npm run dev            # http://localhost:5173
```

Sem `TURSO_DATABASE_URL`, o banco é um arquivo SQLite local em `frontend/data/parfinanceiro.db`.
Abra `http://localhost:5173` e clique em **"Cadastrar casal"** para criar a primeira conta.

## ☁️ Deploy (Vercel + Turso)

Um único projeto na Vercel, com **Root Directory = `frontend`**.

1. Crie um banco no [Turso](https://turso.tech) e gere a URL (`libsql://...`) e o token.
2. Na Vercel, em Environment Variables (Production), defina:
   - `JWT_SECRET` — gere com `openssl rand -hex 32`
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
3. Faça o deploy. Teste em `/api/health` — o campo `missingEnv` deve vir vazio.
4. Cadastre a conta do casal e então defina `ALLOW_REGISTRATION=false` (e redeploy) para travar novos cadastros.

As tabelas são criadas automaticamente na primeira requisição.

## 📁 Estrutura do Projeto

```
ParFinanceiro/
└── frontend/
    ├── data/                # Banco SQLite local (dev, gerado automaticamente)
    └── src/
        ├── app/
        │   ├── api/         # Rotas da API: auth, incomes, expenses, goals, dashboard, health
        │   ├── (app)/       # Páginas protegidas: dashboard, rendas, gastos, emprestimos, metas
        │   ├── login/ cadastro/
        │   └── layout.tsx
        ├── server/          # db (libsql) e auth (JWT) — código server-side
        ├── components/      # Layout e UI reutilizáveis
        ├── contexts/        # AuthContext
        ├── hooks/           # usePeriod, useSort, useTheme...
        ├── views/           # Telas (Dashboard, Incomes, Expenses, Goals, Login, Register)
        ├── services/        # Cliente HTTP (axios, baseURL /api)
        └── types/           # Tipos TypeScript
```

## 🔐 Segurança

- Senhas armazenadas com hash bcrypt
- Autenticação via JWT (7 dias)
- Cada casal só acessa seus próprios dados
- Cada pessoa só edita/deleta seus próprios lançamentos
- `JWT_SECRET` obrigatório em produção; cadastro pode ser travado com `ALLOW_REGISTRATION=false`

---

Feito com 💜 para casais que se amam e querem crescer juntos financeiramente.
