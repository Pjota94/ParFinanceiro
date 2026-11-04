import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Plus } from 'lucide-react';
import Link from 'next/link';
import type { DashboardData } from '../../types';
import { MONTHS } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import EmptyState from '../ui/EmptyState';
import { Button } from '../ui/button';
import { formatCompact, formatCurrency } from '../../lib/format';
import { prefersReducedMotion } from '../../hooks/useReducedMotion';

interface Point {
  label: string;
  fullLabel: string;
  income: number;
  expenses: number;
  balance: number;
  empty: boolean;
}

function toPoints(months: DashboardData['last6Months']): Point[] {
  return months.map((m, i) => ({
    label: i === 0 || m.month === 1 ? `${MONTHS[m.month - 1].slice(0, 3)}/${String(m.year).slice(2)}` : MONTHS[m.month - 1].slice(0, 3),
    fullLabel: `${MONTHS[m.month - 1]} de ${m.year}`,
    income: m.income,
    expenses: m.expenses,
    balance: m.balance,
    empty: m.income === 0 && m.expenses === 0,
  }));
}

function Tick({ x, y, payload, index, points }: { x?: number | string; y?: number | string; payload?: { value: string }; index?: number; points: Point[] }) {
  const empty = index !== undefined && points[index]?.empty;
  return (
    <g transform={`translate(${x},${y})`}>
      <text y={16} textAnchor="middle" fontSize={12} fontWeight={500} fill={empty ? 'var(--ink-3)' : 'var(--ink-2)'}>
        {payload?.value}
      </text>
      {empty && (
        <text y={30} textAnchor="middle" fontSize={10} fill="var(--ink-3)">sem dados</text>
      )}
    </g>
  );
}

function EvolutionTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload: Point }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="min-w-48 rounded-md border border-line bg-surface p-3 text-sm shadow-pop">
      <p className="mb-2 font-semibold capitalize text-ink">{p.fullLabel}</p>
      {p.empty ? (
        <p className="t-support">Nenhum registro neste mês.</p>
      ) : (
        <dl className="space-y-1">
          <div className="flex justify-between gap-4"><dt className="flex items-center gap-1.5 text-ink-2"><span className="size-2.5 rounded-sm bg-primary" />Rendas</dt><dd className="num font-semibold text-ink">{formatCurrency(p.income)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="flex items-center gap-1.5 text-ink-2"><span className="size-2.5 rounded-sm bg-negative" />Gastos</dt><dd className="num font-semibold text-ink">{formatCurrency(p.expenses)}</dd></div>
          <div className="mt-1 flex justify-between gap-4 border-t border-line pt-1.5"><dt className="text-ink-2">Saldo</dt><dd className={`num font-bold ${p.balance >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(p.balance)}</dd></div>
        </dl>
      )}
    </div>
  );
}

export default function EvolutionChart({ last6Months }: { last6Months: DashboardData['last6Months'] }) {
  const points = toPoints(last6Months);
  const allEmpty = points.every((p) => p.empty);
  const reduce = prefersReducedMotion();

  return (
    <Card className="animate-fade-up flex flex-col lg:col-span-7">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Evolução dos últimos 6 meses</CardTitle>
        <div className="flex items-center gap-4 text-sm text-ink-2" aria-hidden="true">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary" />Rendas</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-negative" />Gastos</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {allEmpty ? (
          <EmptyState
            compact
            tone="neutral"
            icon={<BarChart3 size={26} />}
            title="Ainda não há histórico para mostrar"
            description="Conforme vocês registram rendas e gastos, a evolução mês a mês aparece aqui."
            action={<Button asChild size="sm"><Link href="/gastos"><Plus /> Registrar um gasto</Link></Button>}
          />
        ) : (
          <>
            <div
              role="img"
              aria-label={`Gráfico de barras com rendas e gastos dos últimos 6 meses. ${points
                .map((p) => (p.empty ? `${p.label}: sem dados` : `${p.label}: rendas ${formatCurrency(p.income)}, gastos ${formatCurrency(p.expenses)}`))
                .join('. ')}`}
              className="min-h-64 w-full flex-1"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points} barGap={4} barCategoryGap="22%" margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={40}
                    tick={(props) => <Tick {...props} points={points} />}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
                    tickFormatter={(v: number) => (v === 0 ? '0' : formatCompact(v))}
                  />
                  <Tooltip content={<EvolutionTooltip />} cursor={{ fill: 'var(--surface-3)', opacity: 0.7 }} />
                  <Bar dataKey="income" name="Rendas" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={!reduce} />
                  <Bar dataKey="expenses" name="Gastos" fill="var(--negative)" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={!reduce} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Rendas e gastos por mês</caption>
              <thead><tr><th>Mês</th><th>Rendas</th><th>Gastos</th></tr></thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.label}><td>{p.fullLabel}</td><td>{formatCurrency(p.income)}</td><td>{formatCurrency(p.expenses)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
