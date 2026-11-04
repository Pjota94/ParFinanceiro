export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { get, all } from '../../../../../server/db';
import { getAuth, unauthorized } from '../../../../../server/auth';

interface ExpenseRow {
  id: string;
  amount: number;
  total_installments: number;
  current_installment: number;
  description: string;
  expense_type: string;
  category: string;
  is_shared: number;
  notes: string | null;
  user_id: string;
  user_name: string;
  avatar_color: string;
  date: string | null;
}

type Ctx = { params: Promise<{ loanId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  const { loanId } = await ctx.params;

  const latest = await get<ExpenseRow>(
    `SELECT e.*, u.name as user_name, u.avatar_color
     FROM expenses e JOIN users u ON e.user_id = u.id
     WHERE e.loan_id = ? AND e.couple_id = ?
     ORDER BY e.current_installment DESC LIMIT 1`,
    [loanId, auth.coupleId]
  );
  if (!latest) return NextResponse.json({ error: 'Empréstimo/Financiamento não encontrado' }, { status: 404 });

  const installments = await all<ExpenseRow>(
    `SELECT e.*, u.name as user_name, u.avatar_color
     FROM expenses e JOIN users u ON e.user_id = u.id
     WHERE e.loan_id = ? AND e.couple_id = ?
     ORDER BY e.current_installment ASC`,
    [loanId, auth.coupleId]
  );

  const paidInstallments = installments.length;
  const totalPaid = installments.reduce((s, i) => s + i.amount, 0);
  const totalAmount = latest.amount * latest.total_installments;
  const remainingInstallments = latest.total_installments - latest.current_installment;
  const remainingAmount = latest.amount * remainingInstallments;

  let estimatedEndDate: string | null = null;
  if (latest.date && remainingInstallments >= 0) {
    const base = new Date(latest.date + 'T00:00:00');
    base.setMonth(base.getMonth() + remainingInstallments);
    estimatedEndDate = base.toISOString().split('T')[0];
  }

  return NextResponse.json({
    loan_id: loanId,
    description: latest.description,
    expense_type: latest.expense_type,
    amount: latest.amount,
    total_installments: latest.total_installments,
    current_installment: latest.current_installment,
    category: latest.category,
    is_shared: latest.is_shared,
    notes: latest.notes,
    user_id: latest.user_id,
    user_name: latest.user_name,
    avatar_color: latest.avatar_color,
    paid_installments: paidInstallments,
    total_paid: totalPaid,
    total_amount: totalAmount,
    remaining_installments: remainingInstallments,
    remaining_amount: remainingAmount,
    estimated_end_date: estimatedEndDate,
    progress_pct: Math.min((latest.current_installment / latest.total_installments) * 100, 100),
    installments,
  });
}
