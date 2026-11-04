'use client';

import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { PieChart as PieIcon, Plus } from 'lucide-react';
import { EXPENSE_CATEGORIES, type DashboardData } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import EmptyState from '../ui/EmptyState';
import { Button } from '../ui/button';
import { formatCurrency } from '../../lib/format';
import { prefersReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../lib/utils';

// Paleta sem vermelho (reservado a gastos/alertas)
const PALETTE = ['#4F46E5', '#0E9F6E', '#F59E0B', '#0EA5E9', '#DB2777', '#8B5CF6', '#64748B'];
const MAX_SLICES = 6;

interface Slice { key: string; label: string; icon: string; total: number; color: string; pct: number }

function buildSlices(data: DashboardData['expensesByCategory']): Slice[] {
  const sorted = [...data].sort((a, b) => b.total - a.total);
  const grand = sorted.reduce((s, c) => s + c.total, 0);
  if (grand <= 0) return [];
  const mapped = sorted.map((c) => {
    const f = EXPENSE_CATEGORIES.find((e) => e.value === c.category);
    return { key: c.category, label: f?.label || c.category, icon: f?.icon || '📌', total: c.total };
  });
  const head = mapped.slice(0, MAX_SLICES);
  const rest = mapped.slice(MAX_SLICES);
  if (rest.length) head.push({ key: '__outras', label: 'Outras', icon: '📌', total: rest.reduce((s, c) => s + c.total, 0) });
  return head.map((c, i) => ({ ...c, color: PALETTE[i % PALETTE.length], pct: (c.total / grand) * 100 }));
}

export default function CategoryDonut({ expensesByCategory, totalExpenses }: { expensesByCategory: DashboardData['expensesByCategory']; totalExpenses: number }) {
  const slices = useMemo(() => buildSlices(expensesByCategory), [expensesByCategory]);
  const [active, setActive] = useState<number | null>(null);
  const reduce = prefersReducedMotion();
  const current = active !== null ? slices[active] : null;

  return (
    <Card className="animate-fade-up lg:col-span-5">
      <CardHeader><CardTitle>Gastos por categoria</CardTitle></CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <EmptyState
            compact
            tone="neutral"
            icon={<PieIcon size={26} />}
            title="Nenhum gasto neste mês"
            description="Quando vocês registrarem gastos, vemos aqui para onde o dinheiro está indo."
            action={<Button asChild size="sm"><Link href="/gastos"><Plus /> Registrar gasto</Link></Button>}
          />
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center lg:flex-col">
            <div
              role="img"
              aria-label={`Gráfico de rosca dos gastos por categoria. Total ${formatCurrency(totalExpenses)}. ${slices
                .map((s) => `${s.label}: ${s.pct.toFixed(0)}%`)
                .join(', ')}`}
              className="relative mx-auto size-48 shrink-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="total"
                    nameKey="label"
                    innerRadius="68%"
                    outerRadius="100%"
                    paddingAngle={2}
                    stroke="var(--surface)"
                    strokeWidth={2}
                    isAnimationActive={!reduce}
                    onMouseEnter={(_: unknown, i: number) => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                  >
                    {slices.map((s, i) => (
                      <Cell key={s.key} fill={s.color} fillOpacity={active === null || active === i ? 1 : 0.3} style={{ transition: 'fill-opacity 150ms' }} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Centro: total ou categoria em destaque */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-9 text-center">
                <span className="text-xs font-medium text-ink-3 line-clamp-1">{current ? current.label : 'Total gasto'}</span>
                <span className="num text-lg font-bold leading-6 text-ink">{formatCurrency(current ? current.total : totalExpenses)}</span>
                {current && <span className="num text-xs font-semibold text-ink-2">{current.pct.toFixed(1)}%</span>}
              </div>
            </div>

            <ul className="min-w-0 flex-1 space-y-1" onMouseLeave={() => setActive(null)}>
              {slices.map((s, i) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className={cn(
                      'interactive flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm',
                      active === i ? 'bg-surface-3' : 'hover:bg-surface-3'
                    )}
                  >
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-ink-2"><span aria-hidden="true">{s.icon} </span>{s.label}</span>
                    <span className="num font-semibold text-ink">{formatCurrency(s.total)}</span>
                    <span className="num w-12 text-right text-xs text-ink-3">{s.pct.toFixed(0)}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
