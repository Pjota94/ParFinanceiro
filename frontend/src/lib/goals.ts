import type { Goal } from '../types';

/** Previsão simples de conclusão: ritmo médio de aporte desde a criação da meta. */
export function forecast(goal: Goal): string | null {
  const remaining = goal.target_amount - goal.current_amount;
  if (remaining <= 0 || goal.current_amount <= 0) return null;
  const created = new Date(goal.created_at.includes('T') ? goal.created_at : goal.created_at.replace(' ', 'T') + 'Z');
  if (isNaN(created.getTime())) return null;
  const months = Math.max((Date.now() - created.getTime()) / (30.44 * 86400000), 1);
  const perMonth = goal.current_amount / months;
  const monthsLeft = remaining / perMonth;
  if (!isFinite(monthsLeft) || monthsLeft > 600) return null;
  const eta = new Date();
  eta.setMonth(eta.getMonth() + Math.ceil(monthsLeft));
  return eta.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
