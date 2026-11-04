const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'parfinanceiro.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    -- Tabela de casais
    CREATE TABLE IF NOT EXISTS couples (
      id TEXT PRIMARY KEY,
      couple_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabela de usuários (membros do casal)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#8B5CF6',
      role TEXT DEFAULT 'member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
    );

    -- Tabela de rendas mensais
    CREATE TABLE IF NOT EXISTS incomes (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT DEFAULT 'salário',
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Tabela de gastos
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      is_shared INTEGER DEFAULT 0,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      date TEXT,
      notes TEXT,
      -- Tipo do gasto: normal | cartao | financiamento | emprestimo
      expense_type TEXT DEFAULT 'normal',
      -- Recorrência: unico | fixo | parcelado
      recurrence TEXT DEFAULT 'unico',
      -- Cartão de crédito: banco escolhido
      credit_card_bank TEXT,
      -- Parcelamento: total de parcelas (NULL = sem limite definido)
      total_installments INTEGER,
      -- Parcela atual (para financiamento/empréstimo)
      current_installment INTEGER DEFAULT 1,
      -- Agrupador de parcelas do mesmo contrato de empréstimo/financiamento
      loan_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Tabela de metas e sonhos
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      category TEXT DEFAULT 'sonho',
      priority TEXT DEFAULT 'média',
      deadline TEXT,
      status TEXT DEFAULT 'ativo',
      color TEXT DEFAULT '#8B5CF6',
      icon TEXT DEFAULT '⭐',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
    );

    -- Tabela de contribuições para metas
    CREATE TABLE IF NOT EXISTS goal_contributions (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  console.log('✅ Banco de dados inicializado com sucesso!');
}

// Migração: adiciona colunas novas em bancos de dados existentes sem recriar a tabela
function runMigrations() {
  const migrations = [
    { col: 'expense_type',         sql: "ALTER TABLE expenses ADD COLUMN expense_type TEXT DEFAULT 'normal'" },
    { col: 'recurrence',           sql: "ALTER TABLE expenses ADD COLUMN recurrence TEXT DEFAULT 'unico'" },
    { col: 'credit_card_bank',     sql: "ALTER TABLE expenses ADD COLUMN credit_card_bank TEXT" },
    { col: 'total_installments',   sql: "ALTER TABLE expenses ADD COLUMN total_installments INTEGER" },
    { col: 'current_installment',  sql: "ALTER TABLE expenses ADD COLUMN current_installment INTEGER DEFAULT 1" },
    { col: 'loan_id',              sql: "ALTER TABLE expenses ADD COLUMN loan_id TEXT" },
  ];

  const existing = db.prepare("PRAGMA table_info(expenses)").all().map((c) => c.name);

  for (const { col, sql } of migrations) {
    if (!existing.includes(col)) {
      db.exec(sql);
      console.log(`  🔄 Migração aplicada: expenses.${col}`);
    }
  }
}

initializeDatabase();
runMigrations();

module.exports = db;
