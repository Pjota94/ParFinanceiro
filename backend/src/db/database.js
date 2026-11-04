const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

// Produção: Turso (TURSO_DATABASE_URL=libsql://... + TURSO_AUTH_TOKEN).
// Desenvolvimento: arquivo SQLite local em backend/data/parfinanceiro.db.
let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const dir = path.join(__dirname, '../../data');
  fs.mkdirSync(dir, { recursive: true });
  url = 'file:' + path.join(dir, 'parfinanceiro.db');
}

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

// Converte a linha do libsql em objeto simples ({ coluna: valor })
function toObject(columns, row) {
  const obj = {};
  columns.forEach((c, i) => { obj[c] = row[i]; });
  return obj;
}

const SCHEMA = `
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
  `;

async function runMigrations() {
  // Adiciona colunas novas em bancos existentes sem recriar a tabela
  const migrations = [
    { col: 'expense_type',         sql: "ALTER TABLE expenses ADD COLUMN expense_type TEXT DEFAULT 'normal'" },
    { col: 'recurrence',           sql: "ALTER TABLE expenses ADD COLUMN recurrence TEXT DEFAULT 'unico'" },
    { col: 'credit_card_bank',     sql: "ALTER TABLE expenses ADD COLUMN credit_card_bank TEXT" },
    { col: 'total_installments',   sql: "ALTER TABLE expenses ADD COLUMN total_installments INTEGER" },
    { col: 'current_installment',  sql: "ALTER TABLE expenses ADD COLUMN current_installment INTEGER DEFAULT 1" },
    { col: 'loan_id',              sql: "ALTER TABLE expenses ADD COLUMN loan_id TEXT" },
  ];

  const info = await client.execute('PRAGMA table_info(expenses)');
  const existing = info.rows.map((r) => r.name);

  for (const { col, sql } of migrations) {
    if (!existing.includes(col)) {
      await client.execute(sql);
      console.log(`  🔄 Migração aplicada: expenses.${col}`);
    }
  }
}

// Inicialização única (também serve em ambiente serverless: roda na 1ª requisição)
let readyPromise;
function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await client.executeMultiple('PRAGMA foreign_keys = ON;');
      await client.executeMultiple(SCHEMA);
      await runMigrations();
      console.log('✅ Banco de dados inicializado com sucesso!');
    })().catch((err) => {
      readyPromise = undefined; // permite nova tentativa
      throw err;
    });
  }
  return readyPromise;
}

async function exec(sql, args = []) {
  await ready();
  return client.execute({ sql, args });
}

/**
 * API assíncrona parecida com a do better-sqlite3:
 *   await db.prepare(sql).get(...args)  -> objeto | undefined
 *   await db.prepare(sql).all(...args)  -> array de objetos
 *   await db.prepare(sql).run(...args)  -> { changes }
 */
function prepare(sql) {
  return {
    async get(...args) {
      const r = await exec(sql, args);
      return r.rows[0] ? toObject(r.columns, r.rows[0]) : undefined;
    },
    async all(...args) {
      const r = await exec(sql, args);
      return r.rows.map((row) => toObject(r.columns, row));
    },
    async run(...args) {
      const r = await exec(sql, args);
      return { changes: r.rowsAffected };
    },
  };
}

/** Executa vários comandos numa única transação. statements: [{ sql, args }] */
async function batch(statements) {
  await ready();
  return client.batch(statements, 'write');
}

module.exports = { prepare, batch, ready };
