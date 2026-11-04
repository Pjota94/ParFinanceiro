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

  const incomes = await all(
    `SELECT i.*, u.name as user_name, u.avatar_color
     FROM incomes i JOIN users u ON i.user_id = u.id
     WHERE i.couple_id = ? AND i.month = ? AND i.year = ?
     ORDER BY i.created_at DESC`,
    [auth.coupleId, m, y]
  );

  const summary = await all(
    `SELECT i.user_id, u.name as user_name, u.avatar_color, SUM(i.amount) as total
     FROM incomes i JOIN users u ON i.user_id = u.id
     WHERE i.couple_id = ? AND i.month = ? AND i.year = ?
     GROUP BY i.user_id`,
    [auth.coupleId, m, y]
  );

  return NextResponse.json({ incomes, summary });
}

export async function POST(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const { description, amount, category, month, year } = await req.json();
  if (!description || !amount) {
    return NextResponse.json({ error: 'Descrição e valor são obrigatórios' }, { status: 400 });
  }

  const now = new Date();
  const id = uuidv4();
  await exec(
    `INSERT INTO incomes (id, couple_id, user_id, description, amount, category, month, year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, auth.coupleId, auth.userId, description, parseFloat(amount),
      category || 'salário', parseInt(month) || now.getMonth() + 1, parseInt(year) || now.getFullYear(),
    ]
  );

  const income = await get('SELECT * FROM incomes WHERE id = ?', [id]);
  return NextResponse.json(income, { status: 201 });
}
