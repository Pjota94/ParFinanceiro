/** Soma 1 mês a uma data ISO sem estourar o dia (31/jan → 28/fev). */
export function addOneMonth(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(d, last));
}

export function daysUntil(date: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}
