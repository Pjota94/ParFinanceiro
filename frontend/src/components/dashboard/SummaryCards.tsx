'use client';

import { ArrowDownRight, ArrowUpRight, Minus, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type { DashboardData } from '../../types';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/Skeleton';
import { useCountUp } from '../../hooks/useCountUp';
import { formatCurrency } from '../../lib/format';
import { cn } from '../../lib/utils';

type Month = DashboardData['last6Months'][number];

interface Delta {
  text: string;
  /** true = bom, false = ruim, null = neutro */
  good: boolean | null;
  dir: 'up' | 'down' | 'flat' | 'none';
  aria: string;
}

function pctDelta(cur: number, prev: number, higherIsBetter: boolean, label: string): Delta {
  if (prev === 0 && cur === 0) return { text: 'Sem movimento nos dois meses', good: null, dir: 'none', aria: `${label}: sem movimento` };
  if (prev === 0) return { text: 'Sem dados no mês anterior', good: null, dir: 'none', aria: `${label}: sem dados no mês anterior` };
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.1) return { text: 'Igual ao mês anterior', good: null, dir: 'flat', aria: `${label}: igual ao mês anterior` };
  const up = pct > 0;
  const text = `${Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs. mês anterior`;
  return {
    text,
    dir: up ? 'up' : 'down',
    good: up === higherIsBetter,
    aria: `${label}: ${up ? 'subiu' : 'caiu'} ${text}`,
  };
}

function pointsDelta(cur: number, prev: number, hasPrev: boolean): Delta {
  if (!hasPrev) return { text: 'Sem dados no mês anterior', good: null, dir: 'none', aria: 'Taxa de poupança: sem dados no mês anterior' };
  const diff = cur - prev;
  if (Math.abs(diff) < 0.1) return { text: 'Igual ao mês anterior', good: null, dir: 'flat', aria: 'Taxa de poupança: igual ao mês anterior' };
  const text = `${Math.abs(diff).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p. vs. mês anterior`;
  return { text, dir: diff > 0 ? 'up' : 'down', good: diff > 0, aria: `Taxa de poupança: ${diff > 0 ? 'subiu' : 'caiu'} ${text}` };
}

function DeltaLine({ delta, onDark }: { delta: Delta; onDark?: boolean }) {
  const Icon = delta.dir === 'up' ? ArrowUpRight : delta.dir === 'down' ? ArrowDownRight : Minus;
  const color =
    delta.good === null
      ? onDark ? 'text-white/80' : 'text-ink-3'
      : delta.good
        ? onDark ? 'text-brand-green-light' : 'text-positive'
        : onDark ? 'text-[#FFB4B8]' : 'text-negative';
  return (
    <p className={cn('mt-2 flex items-center gap-1 text-xs font-medium', color)} aria-label={delta.aria}>
      <Icon size={14} aria-hidden="true" />
      <span>{delta.text}</span>
    </p>
  );
}

interface CardProps {
  label: string;
  value: number;
  kind: 'currency' | 'percent';
  icon: React.ReactNode;
  tone: 'positive' | 'negative' | 'neutral';
  delta: Delta;
  helper?: string;
  featured?: boolean;
  className?: string;
}

const toneIcon = {
  positive: 'bg-primary-soft text-positive',
  negative: 'bg-negative-soft text-negative',
  neutral: 'bg-neutral-soft text-neutral',
};
const toneValue = { positive: 'text-positive', negative: 'text-negative', neutral: 'text-ink' };

function SummaryCard({ label, value, kind, icon, tone, delta, helper, featured, className }: CardProps) {
  const animated = useCountUp(value);
  const shown =
    kind === 'currency'
      ? formatCurrency(animated)
      : `${animated.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const finalText = kind === 'currency' ? formatCurrency(value) : `${value.toLocaleString('pt-BR')}%`;

  return (
    <Card
      className={cn(
        'animate-fade-up relative overflow-hidden p-5',
        featured && 'border-transparent bg-gradient-to-br from-brand-navy to-brand-navy-light text-white shadow-pop',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn('t-label', featured && 'text-white/80')}>{label}</p>
        <span
          className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', featured ? 'bg-white/15 text-white' : toneIcon[tone])}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      {/* valor final para leitores de tela; versão animada é só visual */}
      <p className="sr-only">{finalText}</p>
      <p
        aria-hidden="true"
        className={cn(featured ? 't-value-xl sm:text-4xl sm:leading-10' : 't-value', 'mt-2', featured ? 'text-white' : toneValue[tone])}
      >
        {shown}
      </p>
      <DeltaLine delta={delta} onDark={featured} />
      {helper && <p className={cn('mt-3 text-sm', featured ? 'text-white/85' : 't-support')}>{helper}</p>}
    </Card>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]" role="status" aria-label="Carregando resumo">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="space-y-3 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3 w-32" />
        </Card>
      ))}
    </div>
  );
}

export default function SummaryCards({ summary, last6Months }: Pick<DashboardData, 'summary' | 'last6Months'>) {
  const prev: Month | undefined = last6Months.length >= 2 ? last6Months[last6Months.length - 2] : undefined;
  const hasPrev = !!prev && (prev.income > 0 || prev.expenses > 0);
  const none: Delta = { text: 'Sem dados no mês anterior', good: null, dir: 'none', aria: 'Sem dados no mês anterior' };
  const prevRate = prev && prev.income > 0 ? (prev.balance / prev.income) * 100 : 0;

  const { totalIncome, totalExpenses, balance, savingsRate } = summary;
  const rateTone = savingsRate >= 20 ? 'positive' : savingsRate >= 0 ? 'neutral' : 'negative';

  return (
    <section aria-label="Resumo do mês" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <SummaryCard
        featured
        label="Saldo do mês"
        value={balance}
        kind="currency"
        icon={<Wallet size={18} />}
        tone={balance >= 0 ? 'positive' : 'negative'}
        delta={hasPrev ? pctDelta(balance, prev!.balance, true, 'Saldo') : none}
        helper={balance >= 0 ? 'Sobrou dinheiro neste mês. Bom trabalho, vocês!' : 'Os gastos passaram das rendas. Vale conversar juntos.'}
        className="sm:col-span-2 xl:col-span-1"
      />
      <SummaryCard
        label="Rendas"
        value={totalIncome}
        kind="currency"
        icon={<TrendingUp size={18} />}
        tone="positive"
        delta={hasPrev ? pctDelta(totalIncome, prev!.income, true, 'Rendas') : none}
      />
      <SummaryCard
        label="Gastos"
        value={totalExpenses}
        kind="currency"
        icon={<TrendingDown size={18} />}
        tone="negative"
        delta={hasPrev ? pctDelta(totalExpenses, prev!.expenses, false, 'Gastos') : none}
      />
      <SummaryCard
        label="Taxa de poupança"
        value={savingsRate}
        kind="percent"
        icon={<PiggyBank size={18} />}
        tone={rateTone}
        delta={pointsDelta(savingsRate, prevRate, hasPrev && prev!.income > 0)}
        helper={totalIncome > 0 ? `Vocês guardaram ${savingsRate.toLocaleString('pt-BR')}% do que entrou.` : 'Registrem as rendas para ver quanto sobra.'}
      />
    </section>
  );
}
