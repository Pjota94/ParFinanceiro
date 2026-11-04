import { all } from './db';

/**
 * Gastos de um mês = lançamentos reais + projeções de:
 *  - gastos fixos (recurrence = 'fixo'): repetem todo mês a partir do último lançamento;
 *  - empréstimos/financiamentos: as parcelas restantes aparecem nos meses seguintes.
 * As projeções não são gravadas no banco (id começa com "proj-" e projected = true).
 */

export interface MonthExpense {
  id: string;
  couple_id: string;
  user_id: string;
  user_name: string;
  avatar_color: string;
  description: string;
  amount: number;
  category: string;
  is_shared: number;
  date: string | null;
  notes: string | null;
  month: number;
  year: number;
  expense_type: string;
  recurrence: string;
  credit_card_bank: string | null;
  total_installments: number | null;
  current_installment: number;
  loan_id: string | null;
  recurrence_end: number | null;
  created_at: string;
  projected?: boolean;
}

const idx = (m: number, y: number) => y * 12 + (m - 1);

/** Mantém o dia da data original dentro do mês alvo (ex.: 31 → último dia do mês). */
function shiftDate(date: string | null, m: number, y: number): string {
  const day = date ? parseInt(date.slice(8, 10)) || 1 : 1;
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

const SELECT = `SELECT e.*, u.name as user_name, u.avatar_color
                FROM expenses e JOIN users u ON e.user_id = u.id`;

export async function getMonthExpenses(coupleId: string, m: number, y: number): Promise<MonthExpense[]> {
  const target = idx(m, y);

  const real = await all<MonthExpense>(
    `${SELECT} WHERE e.couple_id = ? AND e.month = ? AND e.year = ?
     ORDER BY e.date DESC, e.created_at DESC`,
    [coupleId, m, y]
  );

  const projected: MonthExpense[] = [];

  // --- Gastos fixos ---
  const fixed = await all<MonthExpense>(
    `${SELECT} WHERE e.couple_id = ? AND e.recurrence = 'fixo'
       AND e.expense_type NOT IN ('financiamento', 'emprestimo')
       AND (e.year * 12 + e.month) <= ?
     ORDER BY e.year, e.month, e.created_at`,
    [coupleId, target]
  );
  const fixedKey = (e: MonthExpense) => `${e.user_id}|${e.expense_type}|${e.description.trim().toLowerCase()}`;
  const latestFixed = new Map<string, MonthExpense>();
  for (const e of fixed) latestFixed.set(fixedKey(e), e); // ordenado: o último vence
  const realFixedKeys = new Set(real.filter((e) => e.recurrence === 'fixo').map(fixedKey));
  for (const [key, e] of latestFixed) {
    if (idx(e.month, e.year) >= target || realFixedKeys.has(key)) continue;
    if (e.recurrence_end != null && target > e.recurrence_end) continue; // recorrência encerrada
    projected.push({
      ...e,
      id: `proj-fixo-${e.id}-${y}-${m}`,
      month: m,
      year: y,
      date: shiftDate(e.date, m, y),
      projected: true,
    });
  }

  // --- Empréstimos / financiamentos ---
  const loanRows = await all<MonthExpense>(
    `${SELECT} WHERE e.couple_id = ? AND e.loan_id IS NOT NULL
       AND e.expense_type IN ('financiamento', 'emprestimo')
       AND (e.year * 12 + e.month) <= ?
     ORDER BY e.current_installment ASC, e.created_at ASC`,
    [coupleId, target]
  );
  const latestLoan = new Map<string, MonthExpense>();
  for (const e of loanRows) latestLoan.set(e.loan_id as string, e); // maior parcela vence
  const realLoanIds = new Set(real.filter((e) => e.loan_id).map((e) => e.loan_id as string));
  for (const [loanId, e] of latestLoan) {
    if (realLoanIds.has(loanId)) continue;
    const total = e.total_installments ?? 0;
    const number = e.current_installment + (target - idx(e.month, e.year));
    if (number <= e.current_installment || number > total) continue;
    projected.push({
      ...e,
      id: `proj-loan-${e.id}-${y}-${m}`,
      month: m,
      year: y,
      date: shiftDate(e.date, m, y),
      current_installment: number,
      projected: true,
    });
  }

  return [...real, ...projected];
}
