export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { get, exec } from '../../../../server/db';
import { getAuth, unauthorized } from '../../../../server/auth';

interface ExpenseRow {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  is_shared: number;
  date: string | null;
  notes: string | null;
  expense_type: string;
  recurrence: string;
  credit_card_bank: string | null;
  total_installments: number | null;
  current_installment: number;
  paid: number;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;

  const expense = await get<ExpenseRow>('SELECT * FROM expenses WHERE id = ? AND couple_id = ?', [id, auth.coupleId]);
  if (!expense) return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 });
  if (expense.user_id !== auth.userId) {
    return NextResponse.json({ error: 'Você só pode editar seus próprios gastos' }, { status: 403 });
  }

  const {
    description, amount, category, isShared, date, notes,
    expenseType, recurrence, creditCardBank, totalInstallments, currentInstallment, paid,
  } = await req.json();

  let rec = recurrence !== undefined ? recurrence : expense.recurrence;
  const et = expenseType || expense.expense_type;
  if (et === 'financiamento' || et === 'emprestimo') rec = 'parcelado';

  await exec(
    `UPDATE expenses SET
      description = ?, amount = ?, category = ?, is_shared = ?, date = ?, notes = ?,
      expense_type = ?, recurrence = ?, credit_card_bank = ?,
      total_installments = ?, current_installment = ?, paid = ?
     WHERE id = ?`,
    [
      description || expense.description,
      parseFloat(amount) || expense.amount,
      category || expense.category,
      isShared !== undefined ? (isShared ? 1 : 0) : expense.is_shared,
      date || expense.date,
      notes !== undefined ? notes : expense.notes,
      et, rec,
      creditCardBank !== undefined ? creditCardBank : expense.credit_card_bank,
      totalInstallments !== undefined ? (totalInstallments ? parseInt(totalInstallments) : null) : expense.total_installments,
      currentInstallment !== undefined ? parseInt(currentInstallment) : expense.current_installment,
      paid !== undefined ? (paid ? 1 : 0) : expense.paid,
      id,
    ]
  );

  const updated = await get(
    `SELECT e.*, u.name as user_name, u.avatar_color
     FROM expenses e JOIN users u ON e.user_id = u.id WHERE e.id = ?`,
    [id]
  );
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;

  const expense = await get<ExpenseRow>('SELECT * FROM expenses WHERE id = ? AND couple_id = ?', [id, auth.coupleId]);
  if (!expense) return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 });
  if (expense.user_id !== auth.userId) {
    return NextResponse.json({ error: 'Você só pode deletar seus próprios gastos' }, { status: 403 });
  }

  await exec('DELETE FROM expenses WHERE id = ?', [id]);
  return NextResponse.json({ message: 'Gasto removido com sucesso' });
}
