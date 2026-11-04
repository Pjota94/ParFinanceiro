export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import type { InArgs } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { get, all, exec } from '../../../server/db';
import { getAuth, unauthorized } from '../../../server/auth';

export async function GET(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const status = new URL(req.url).searchParams.get('status');

  let query = `
    SELECT g.*,
      (SELECT SUM(gc.amount) FROM goal_contributions gc WHERE gc.goal_id = g.id) as contributions_total,
      (SELECT COUNT(*) FROM goal_contributions gc WHERE gc.goal_id = g.id) as contributions_count
    FROM goals g WHERE g.couple_id = ?`;
  const params: InArgs = [auth.coupleId];

  if (status) {
    query += ' AND g.status = ?';
    params.push(status);
  }
  query += ' ORDER BY g.created_at DESC';

  const goals = await all(query, params);
  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const { title, description, targetAmount, category, priority, deadline, color, icon } = await req.json();
  if (!title || !targetAmount) {
    return NextResponse.json({ error: 'Título e valor alvo são obrigatórios' }, { status: 400 });
  }

  const id = uuidv4();
  await exec(
    `INSERT INTO goals (id, couple_id, title, description, target_amount, category, priority, deadline, color, icon)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, auth.coupleId, title, description || null, parseFloat(targetAmount),
      category || 'sonho', priority || 'média', deadline || null, color || '#8B5CF6', icon || '⭐',
    ]
  );

  const goal = await get('SELECT * FROM goals WHERE id = ?', [id]);
  return NextResponse.json(goal, { status: 201 });
}
