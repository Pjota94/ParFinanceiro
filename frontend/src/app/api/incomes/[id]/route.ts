export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { get, exec } from '../../../../server/db';
import { getAuth, unauthorized } from '../../../../server/auth';

interface IncomeRow {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;

  const income = await get<IncomeRow>('SELECT * FROM incomes WHERE id = ? AND couple_id = ?', [id, auth.coupleId]);
  if (!income) return NextResponse.json({ error: 'Renda não encontrada' }, { status: 404 });
  if (income.user_id !== auth.userId) {
    return NextResponse.json({ error: 'Você só pode editar suas próprias rendas' }, { status: 403 });
  }

  const { description, amount, category } = await req.json();
  await exec('UPDATE incomes SET description = ?, amount = ?, category = ? WHERE id = ?', [
    description || income.description,
    parseFloat(amount) || income.amount,
    category || income.category,
    id,
  ]);

  const updated = await get('SELECT * FROM incomes WHERE id = ?', [id]);
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;

  const income = await get<IncomeRow>('SELECT * FROM incomes WHERE id = ? AND couple_id = ?', [id, auth.coupleId]);
  if (!income) return NextResponse.json({ error: 'Renda não encontrada' }, { status: 404 });
  if (income.user_id !== auth.userId) {
    return NextResponse.json({ error: 'Você só pode deletar suas próprias rendas' }, { status: 403 });
  }

  await exec('DELETE FROM incomes WHERE id = ?', [id]);
  return NextResponse.json({ message: 'Renda removida com sucesso' });
}
