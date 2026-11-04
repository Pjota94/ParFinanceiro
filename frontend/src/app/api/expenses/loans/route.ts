export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { all } from '../../../../server/db';
import { getAuth, unauthorized } from '../../../../server/auth';

interface LoanRow {
  loan_id: string;
  description: string;
  expense_type: string;
  amount: number;
  total_installments: number;
  category: string;
  is_shared: number;
  notes: string | null;
  user_id: string;
  user_name: string;
  avatar_color: string;
  paid_installments: number;
  total_paid: number;
  current_installment: number;
  first_date: string;
  last_date: string;
}

export async function GET(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const rows = await all<LoanRow>(
    `SELECT
       e.loan_id, e.description, e.expense_type, e.amount, e.total_installments,
       e.category, e.is_shared, e.notes,
       u.id as user_id, u.name as user_name, u.avatar_color,
       COUNT(*) as paid_installments,
       SUM(e.amount) as total_paid,
       MAX(e.current_installment) as current_installment,
       MIN(e.date) as first_date,
       MAX(e.date) as last_date
     FROM expenses e JOIN users u ON e.user_id = u.id
     WHERE e.couple_id = ?
       AND e.expense_type IN ('financiamento', 'emprestimo')
       AND e.loan_id IS NOT NULL
     GROUP BY e.loan_id
     ORDER BY e.expense_type, MAX(e.current_installment) DESC`,
    [auth.coupleId]
  );

  const loans = rows.map((r) => {
    const totalAmount = r.amount * r.total_installments;
    const remaining = r.total_installments - r.current_installment;
    return {
      ...r,
      total_amount: totalAmount,
      remaining_installments: remaining,
      remaining_amount: r.amount * remaining,
    };
  });

  return NextResponse.json(loans);
}
