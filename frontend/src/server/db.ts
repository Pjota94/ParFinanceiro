import { createClient, type InArgs } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';

// Produção: Turso (TURSO_DATABASE_URL=libsql://... + TURSO_AUTH_TOKEN).
// Desenvolvimento: arquivo SQLite local em frontend/data/parfinanceiro.db.
// Em serverless (Vercel) o filesystem é somente leitura, exceto /tmp.
function resolveUrl(): string {
  const configured = process.env.TURSO_DATABASE_URL;
  if (configured) return configured;

  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const dir = isServerless ? '/tmp' : path.join(process.cwd(), 'data');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error('[db] não foi possível criar diretório de dados:', (err as Error).message);
  }
  return 'file:' + path.join(dir, 'parfinanceiro.db');
}

const client = createClient({
  url: resolveUrl(),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

type Row = Record<string, unknown>;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS couples (
    id TEXT PRIMARY KEY,
    couple_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
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
    expense_type TEXT DEFAULT 'normal',
    recurrence TEXT DEFAULT 'unico',
    credit_card_bank TEXT,
    total_installments INTEGER,
    current_installment INTEGER DEFAULT 1,
    loan_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
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
  const migrations = [
    { col: 'expense_type', sql: "ALTER TABLE expenses ADD COLUMN expense_type TEXT DEFAULT 'normal'" },
    { col: 'recurrence', sql: "ALTER TABLE expenses ADD COLUMN recurrence TEXT DEFAULT 'unico'" },
    { col: 'credit_card_bank', sql: 'ALTER TABLE expenses ADD COLUMN credit_card_bank TEXT' },
    { col: 'total_installments', sql: 'ALTER TABLE expenses ADD COLUMN total_installments INTEGER' },
    { col: 'current_installment', sql: 'ALTER TABLE expenses ADD COLUMN current_installment INTEGER DEFAULT 1' },
    { col: 'loan_id', sql: 'ALTER TABLE expenses ADD COLUMN loan_id TEXT' },
    // Último mês (ano*12 + mês-1) em que um gasto fixo ainda aparece; NULL = sem fim
    { col: 'recurrence_end', sql: 'ALTER TABLE expenses ADD COLUMN recurrence_end INTEGER' },
  ];
  const userInfo = await client.execute('PRAGMA table_info(users)');
  if (!userInfo.rows.some((r) => r.name === 'avatar_url')) {
    await client.execute('ALTER TABLE users ADD COLUMN avatar_url TEXT');
  }
  const info = await client.execute('PRAGMA table_info(expenses)');
  const existing = info.rows.map((r) => r.name as string);
  for (const { col, sql } of migrations) {
    if (!existing.includes(col)) {
      await client.execute(sql);
    }
  }
}

// Inicialização única, disparada na primeira query (também em serverless)
let readyPromise: Promise<void> | undefined;
function ready(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await client.executeMultiple('PRAGMA foreign_keys = ON;');
      await client.executeMultiple(SCHEMA);
      await runMigrations();
    })().catch((err) => {
      readyPromise = undefined; // permite nova tentativa
      throw err;
    });
  }
  return readyPromise;
}

async function run(sql: string, args: InArgs = []) {
  await ready();
  return client.execute({ sql, args });
}

/** Primeira linha como objeto, ou undefined. */
export async function get<T = Row>(sql: string, args: InArgs = []): Promise<T | undefined> {
  const r = await run(sql, args);
  return (r.rows[0] as T | undefined) ?? undefined;
}

/** Todas as linhas como objetos. */
export async function all<T = Row>(sql: string, args: InArgs = []): Promise<T[]> {
  const r = await run(sql, args);
  return r.rows as unknown as T[];
}

/** Executa um comando de escrita. Retorna o número de linhas afetadas. */
export async function exec(sql: string, args: InArgs = []): Promise<{ changes: number }> {
  const r = await run(sql, args);
  return { changes: r.rowsAffected };
}

/** Várias escritas numa única transação. */
export async function batch(statements: { sql: string; args: InArgs }[]) {
  await ready();
  return client.batch(statements, 'write');
}
