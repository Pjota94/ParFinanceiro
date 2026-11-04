export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { get, all, exec } from '../../../server/db';
import { getAuth, unauthorized } from '../../../server/auth';

export async function GET(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const m = parseInt(searchParams.get('month') || '') || now.getMonth() + 1;
  const y = parseInt(searchParams.get('year') || '') || now.getFullYear();

  const expenses = await all(
    `SELECT e.*, u.name as user_name, u.avatar_color
     FROM expenses e JOIN users u ON e.user_id = u.id
     WHERE e.couple_id = ? AND e.month = ? AND e.year = ?
     ORDER BY e.date DESC, e.created_at DESC`,
    [auth.coupleId, m, y]
  );

  const byUser = await all(
    `SELECT e.user_id, u.name as user_name, u.avatar_color, SUM(e.amount) as total
     FROM expenses e JOIN users u ON e.user_id = u.id
     WHERE e.couple_id = ? AND e.month = ? AND e.year = ?
     GROUP BY e.user_id`,
    [auth.coupleId, m, y]
  );

  const byCategory = await all(
    `SELECT category, SUM(amount) as total, COUNT(*) as count
     FROM expenses WHERE couple_id = ? AND month = ? AND year = ?
     GROUP BY category ORDER BY total DESC`,
    [auth.coupleId, m, y]
  );

  const byType = await all(
    `SELECT expense_type, recurrence, SUM(amount) as total, COUNT(*) as count
     FROM expenses WHERE couple_id = ? AND month = ? AND year = ?
     GROUP BY expense_type, recurrence`,
    [auth.coupleId, m, y]
  );

  return NextResponse.json({ expenses, byUser, byCategory, byType });
}

export async function POST(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const {
    description, amount, category, isShared, date, notes, month, year,
    expenseType, recurrence, creditCardBank, totalInstallments, currentInstallment, loanId,
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
      total_installments, current_installment, loan_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, auth.coupleId, auth.userId, description, parseFloat(amount), category, isShared ? 1 : 0,
      date || now.toISOString().split('T')[0], notes || null,
      parseInt(month) || now.getMonth() + 1, parseInt(year) || now.getFullYear(),
      expenseType || 'normal', rec, creditCardBank || null,
      totalInstallments ? parseInt(totalInstallments) : null,
      currentInstallment ? parseInt(currentInstallment) : 1, resolvedLoanId,
    ]
  );

  const expense = await get(
    `SELECT e.*, u.name as user_name, u.avatar_color
     FROM expenses e JOIN users u ON e.user_id = u.id WHERE e.id = ?`,
    [id]
  );
  return NextResponse.json(expense, { status: 201 });
}
