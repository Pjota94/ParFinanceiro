export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { get, exec } from '../../../server/db';
import { getAuth, unauthorized } from '../../../server/auth';
import { getMonthExpenses } from '../../../server/projections';

export async function GET(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const m = parseInt(searchParams.get('month') || '') || now.getMonth() + 1;
  const y = parseInt(searchParams.get('year') || '') || now.getFullYear();

  const expenses = await getMonthExpenses(auth.coupleId, m, y);

  const userMap = new Map<string, { user_id: string; user_name: string; avatar_color: string; total: number }>();
  const catMap = new Map<string, { category: string; total: number; count: number }>();
  const typeMap = new Map<string, { expense_type: string; recurrence: string; total: number; count: number }>();
  for (const e of expenses) {
    const u = userMap.get(e.user_id) ?? { user_id: e.user_id, user_name: e.user_name, avatar_color: e.avatar_color, total: 0 };
    u.total += e.amount;
    userMap.set(e.user_id, u);
    const c = catMap.get(e.category) ?? { category: e.category, total: 0, count: 0 };
    c.total += e.amount; c.count += 1;
    catMap.set(e.category, c);
    const tk = `${e.expense_type}|${e.recurrence}`;
    const t = typeMap.get(tk) ?? { expense_type: e.expense_type, recurrence: e.recurrence, total: 0, count: 0 };
    t.total += e.amount; t.count += 1;
    typeMap.set(tk, t);
  }
  const byUser = [...userMap.values()];
  const byCategory = [...catMap.values()].sort((a, b) => b.total - a.total);
  const byType = [...typeMap.values()];

  return NextResponse.json({ expenses, byUser, byCategory, byType });
}

export async function POST(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const {
    description, amount, category, isShared, date, notes, month, year,
    expenseType, recurrence, creditCardBank, totalInstallments, currentInstallment, loanId, paid,
  } = await req.json();

  if (!description || !amount || !category) {
    return NextResponse.json({ error: 'Descrição, valor e categoria são obrigatórios' }, { status: 400 });
  }
  if (expenseType === 'cartao' && !creditCardBank) {
    return NextResponse.json({ error: 'Selecione o banco do cartão de crédito' }, { status: 400 });
  }
  if ((expenseType === 'financiamento' || expenseType === 'emprestimo') && !totalInstallments) {
    return NextResponse.json({ error: 'Informe o número de parcelas' }, { status: 400 });
  }

  const now = new Date();
  const id = uuidv4();

  let rec = recurrence || 'unico';
  if (expenseType === 'financiamento' || expenseType === 'emprestimo') rec = 'parcelado';

  let resolvedLoanId: string | null = null;
  if (expenseType === 'financiamento' || expenseType === 'emprestimo') {
    resolvedLoanId = loanId || uuidv4();
  }

  await exec(
    `INSERT INTO expenses (
      id, couple_id, user_id, description, amount, category, is_shared,
      date, notes, month, year,
      expense_type, recurrence, credit_card_bank,
      total_installments, current_installment, loan_id, paid
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, auth.coupleId, auth.userId, description, parseFloat(amount), category, isShared ? 1 : 0,
      date || now.toISOString().split('T')[0], notes || null,
      parseInt(month) || now.getMonth() + 1, parseInt(year) || now.getFullYear(),
      expenseType || 'normal', rec, creditCardBank || null,
      totalInstallments ? parseInt(totalInstallments) : null,
      currentInstallment ? parseInt(currentInstallment) : 1, resolvedLoanId,
      paid ? 1 : 0,
    ]
  );

  const expense = await get(
    `SELECT e.*, u.name as user_name, u.avatar_color
     FROM expenses e JOIN users u ON e.user_id = u.id WHERE e.id = ?`,
    [id]
  );
  return NextResponse.json(expense, { status: 201 });
}
