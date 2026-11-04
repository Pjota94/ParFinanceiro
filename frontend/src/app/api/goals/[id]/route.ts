export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { get, all, exec } from '../../../../server/db';
import { getAuth, unauthorized } from '../../../../server/auth';

interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  target_amount: number;
  category: string;
  priority: string;
  deadline: string | null;
  status: string;
  color: string;
  icon: string;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;

  const goal = await get<GoalRow>('SELECT * FROM goals WHERE id = ? AND couple_id = ?', [id, auth.coupleId]);
  if (!goal) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });

  const contributions = await all(
    `SELECT gc.*, u.name as user_name, u.avatar_color
     FROM goal_contributions gc JOIN users u ON gc.user_id = u.id
     WHERE gc.goal_id = ? ORDER BY gc.created_at DESC`,
    [id]
  );
  const byUser = await all(
    `SELECT gc.user_id, u.name as user_name, u.avatar_color, SUM(gc.amount) as total
     FROM goal_contributions gc JOIN users u ON gc.user_id = u.id
     WHERE gc.goal_id = ? GROUP BY gc.user_id`,
    [id]
  );

  return NextResponse.json({ ...goal, contributions, byUser });
}

export async function PUT(req: Request, ctx: Ctx) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;

  const goal = await get<GoalRow>('SELECT * FROM goals WHERE id = ? AND couple_id = ?', [id, auth.coupleId]);
  if (!goal) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });

  const { title, description, targetAmount, category, priority, deadline, status, color, icon } = await req.json();
  await exec(
    `UPDATE goals SET title = ?, description = ?, target_amount = ?, category = ?, priority = ?, deadline = ?, status = ?, color = ?, icon = ?
     WHERE id = ?`,
    [
      title || goal.title,
      description !== undefined ? description : goal.description,
      parseFloat(targetAmount) || goal.target_amount,
      category || goal.category,
      priority || goal.priority,
      deadline !== undefined ? deadline : goal.deadline,
      status || goal.status,
      color || goal.color,
      icon || goal.icon,
      id,
    ]
  );

  const updated = await get('SELECT * FROM goals WHERE id = ?', [id]);
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;

  const goal = await get('SELECT * FROM goals WHERE id = ? AND couple_id = ?', [id, auth.coupleId]);
  if (!goal) return NextResponse.json({ error: 'Meta não encontrada' }, { status: 404 });

  await exec('DELETE FROM goals WHERE id = ?', [id]);
  return NextResponse.json({ message: 'Meta removida com sucesso' });
}
