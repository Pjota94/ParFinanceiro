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

**Backend:**
- Node.js + Express
- SQLite (via better-sqlite3)
- JWT para autenticação
- bcryptjs para senhas

**Frontend:**
- React + TypeScript
- Next.js 16.2.12 (App Router) + Tailwind CSS v4
- Recharts (gráficos)
- React Router DOM
- Axios

## 🚀 Como executar

### 1. Instalar dependências

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 2. Configurar o backend

```bash
cp backend/.env.example backend/.env
# Edite o .env e defina um JWT_SECRET seguro
```

### 3. Iniciar em desenvolvimento

**Terminal 1 — Backend:**
```bash
cd backend && npm run dev
# Roda em http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
# Roda em http://localhost:5173
```

### 4. Acesse o sistema

Abra `http://localhost:5173` e clique em **"Cadastrar casal"** para criar a primeira conta.

## 📁 Estrutura do Projeto

```
ParFinanceiro/
├── backend/
│   ├── src/
│   │   ├── db/          # Configuração do SQLite
│   │   ├── middleware/  # Autenticação JWT
│   │   └── routes/      # auth, incomes, expenses, goals, dashboard
│   └── data/            # Banco de dados (gerado automaticamente)
└── frontend/
    └── src/
        ├── components/  # Layout, UI reutilizáveis
        ├── contexts/    # AuthContext
        ├── hooks/       # usePeriod
        ├── pages/       # Dashboard, Incomes, Expenses, Goals, Login, Register
        ├── services/    # API client (axios)
        └── types/       # TypeScript types
```

## 🔐 Segurança

- Senhas armazenadas com hash bcrypt
- Autenticação via JWT (7 dias)
- Cada casal só acessa seus próprios dados
- Cada pessoa só edita/deleta seus próprios lançamentos

---

Feito com 💜 para casais que se amam e querem crescer juntos financeiramente.
