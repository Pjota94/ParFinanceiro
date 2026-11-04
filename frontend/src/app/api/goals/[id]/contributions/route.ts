export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { get, exec } from '../../../../../server/db';
import { getAuth, unauthorized } from '../../../../../server/auth';

interface GoalRow {
  id: string;
  status: string;
  target_amount: number;
}

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;

  const goal = await get<GoalRow>('SELECT * FROM goals WHERE id = ? AND couple_id = ?', [id, auth.coupleId]);
  if (!goal) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });

  const { amount, notes } = await req.json();
  if (!amount || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
  }

  const contributionId = uuidv4();
  await exec(
    'INSERT INTO goal_contributions (id, goal_id, user_id, amount, notes) VALUES (?, ?, ?, ?, ?)',
    [contributionId, id, auth.userId, parseFloat(amount), notes || null]
  );

  const totals = await get<{ total: number | null }>(
    'SELECT SUM(amount) as total FROM goal_contributions WHERE goal_id = ?',
    [id]
  );
  const newAmount = totals?.total || 0;
  const newStatus = newAmount >= goal.target_amount ? 'concluído' : goal.status;

  await exec('UPDATE goals SET current_amount = ?, status = ? WHERE id = ?', [newAmount, newStatus, id]);

  const contribution = await get(
    `SELECT gc.*, u.name as user_name, u.avatar_color
     FROM goal_contributions gc JOIN users u ON gc.user_id = u.id WHERE gc.id = ?`,
    [contributionId]
  );
  const goalUpdated = await get('SELECT * FROM goals WHERE id = ?', [id]);

  return NextResponse.json({ contribution, goalUpdated }, { status: 201 });
}
