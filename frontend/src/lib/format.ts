export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatCompact(value: number) {
  return value.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
}

/** Data ISO (yyyy-mm-dd) → dd/mm/aaaa, sem sofrer com fuso horário */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

export function formatMonthYear(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/** Normaliza texto para busca (sem acento, minúsculo) */
export function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
