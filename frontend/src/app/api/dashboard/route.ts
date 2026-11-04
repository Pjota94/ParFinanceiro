export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { get, all } from '../../../server/db';
import { getAuth, unauthorized } from '../../../server/auth';

export async function GET(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const m = parseInt(searchParams.get('month') || '') || now.getMonth() + 1;
  const y = parseInt(searchParams.get('year') || '') || now.getFullYear();

  const members = await all(
    'SELECT id, name, email, avatar_color, role FROM users WHERE couple_id = ?',
    [auth.coupleId]
  );

  const totalIncome = await get<{ total: number | null }>(
    'SELECT SUM(amount) as total FROM incomes WHERE couple_id = ? AND month = ? AND year = ?',
    [auth.coupleId, m, y]
  );
  const incomeByPerson = await all(
    `SELECT i.user_id, u.name, u.avatar_color, SUM(i.amount) as total
     FROM incomes i JOIN users u ON i.user_id = u.id
     WHERE i.couple_id = ? AND i.month = ? AND i.year = ? GROUP BY i.user_id`,
    [auth.coupleId, m, y]
  );

  const totalExpenses = await get<{ total: number | null }>(
    'SELECT SUM(amount) as total FROM expenses WHERE couple_id = ? AND month = ? AND year = ?',
    [auth.coupleId, m, y]
  );
  const expensesByPerson = await all(
    `SELECT e.user_id, u.name, u.avatar_color, SUM(e.amount) as total
     FROM expenses e JOIN users u ON e.user_id = u.id
     WHERE e.couple_id = ? AND e.month = ? AND e.year = ? GROUP BY e.user_id`,
    [auth.coupleId, m, y]
  );
  const expensesByCategory = await all(
    `SELECT category, SUM(amount) as total, COUNT(*) as count
     FROM expenses WHERE couple_id = ? AND month = ? AND year = ?
     GROUP BY category ORDER BY total DESC`,
    [auth.coupleId, m, y]
  );

  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const mo = d.getMonth() + 1;
    const ye = d.getFullYear();
    const inc = await get<{ total: number | null }>(
      'SELECT SUM(amount) as total FROM incomes WHERE couple_id = ? AND month = ? AND year = ?',
      [auth.coupleId, mo, ye]
    );
    const exp = await get<{ total: number | null }>(
      'SELECT SUM(amount) as total FROM expenses WHERE couple_id = ? AND month = ? AND year = ?',
      [auth.coupleId, mo, ye]
    );
    last6Months.push({
      month: mo,
      year: ye,
      label: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      income: inc?.total || 0,
      expenses: exp?.total || 0,
      balance: (inc?.total || 0) - (exp?.total || 0),
    });
  }

  const activeGoals = await all(
    "SELECT * FROM goals WHERE couple_id = ? AND status = 'ativo' ORDER BY created_at DESC LIMIT 5",
    [auth.coupleId]
  );

  const income = totalIncome?.total || 0;
  const expenses = totalExpenses?.total || 0;
  const balance = income - expenses;
  const savingsRate = income > 0 ? parseFloat(((balance / income) * 100).toFixed(1)) : 0;

  return NextResponse.json({
    period: { month: m, year: y },
    members,
    summary: { totalIncome: income, totalExpenses: expenses, balance, savingsRate },
    incomeByPerson,
    expensesByPerson,
    expensesByCategory,
    last6Months,
    activeGoals,
  });
}
