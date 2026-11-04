'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import type { DashboardData, Loan } from '../types';
import { usePeriod } from '../hooks/usePeriod';
import PageHeader from '../components/ui/PageHeader';
import PeriodSelector from '../components/ui/PeriodSelector';
import { Card } from '../components/ui/card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/EmptyState';
import SummaryCards, { SummaryCardsSkeleton } from '../components/dashboard/SummaryCards';
import PersonSplit, { type Person } from '../components/dashboard/PersonSplit';
import EvolutionChart from '../components/dashboard/EvolutionChart';
import CategoryDonut from '../components/dashboard/CategoryDonut';
import DebtCard from '../components/dashboard/DebtCard';
import GoalsSection from '../components/dashboard/GoalsSection';
import { useAuth } from '../contexts/AuthContext';

// O backend devolve os membros com avatar_color (snake_case)
interface Member { id: string; name: string; avatar_color: string }

const FALLBACK_COLORS = ['#4338CA', '#0E9F6E'];

/** Sempre devolve os dois parceiros (mesmo com R$ 0,00) com cores distintas. */
function buildPeople(
  members: Member[],
  rows: Array<{ user_id: string; total: number }>,
  me?: { id: string; name: string; avatarColor: string } | null,
  partner?: { id: string; name: string; avatarColor: string } | null
): Person[] {
  const base: Member[] = members.length
    ? members
    : [me, partner].filter(Boolean).map((u) => ({ id: u!.id, name: u!.name, avatar_color: u!.avatarColor }));
  const list: Member[] = [...base];
  while (list.length < 2) list.push({ id: `pendente-${list.length}`, name: 'Parceiro(a)', avatar_color: '#94A3B8' });

  const people = list.slice(0, 2).map((m, i) => ({
    id: m.id,
    name: m.name,
    color: m.avatar_color || FALLBACK_COLORS[i],
    total: rows.find((r) => r.user_id === m.id)?.total ?? 0,
  }));
  if (people[0].color.toLowerCase() === people[1].color.toLowerCase()) people[1].color = FALLBACK_COLORS[1];
  return people;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando painel">
      <SummaryCardsSkeleton />
      <Card className="p-5"><Skeleton className="h-28" /></Card>
      <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-52" /><Skeleton className="h-52" /></div>
      <div className="grid gap-4 lg:grid-cols-12"><Skeleton className="h-72 lg:col-span-7" /><Skeleton className="h-72 lg:col-span-5" /></div>
    </div>
  );
}

export default function Dashboard() {
  const { month, year, prevMonth, nextMonth, goToday, isCurrentMonth } = usePeriod();
  const { user, partner } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [loansError, setLoansError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.get(`/dashboard?month=${month}&year=${year}`)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, year, reload]);

  const loadLoans = useCallback(() => {
    setLoansError(false);
    setLoans(null);
    api.get('/expenses/loans')
      .then((res) => setLoans(res.data))
      .catch(() => setLoansError(true));
  }, []);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  const members = (data?.members ?? []) as unknown as Member[];
  const incomePeople = useMemo(
    () => buildPeople(members, data?.incomeByPerson ?? [], user, partner),
    [data, user, partner] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const expensePeople = useMemo(
    () => buildPeople(members, data?.expensesByPerson ?? [], user, partner),
    [data, user, partner] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        subtitle={`Como estão as finanças de vocês${user ? `, ${user.name.split(' ')[0]}` : ''}`}
      >
        <PeriodSelector month={month} year={year} onPrev={prevMonth} onNext={nextMonth} onToday={goToday} isCurrent={isCurrentMonth} />
      </PageHeader>

      {loading && !data ? (
        <DashboardSkeleton />
      ) : error || !data ? (
        <Card><ErrorState onRetry={() => setReload((n) => n + 1)} /></Card>
      ) : (
        <div className={loading ? 'space-y-6 opacity-60 transition-opacity' : 'space-y-6 transition-opacity'} aria-busy={loading}>
          <SummaryCards summary={data.summary} last6Months={data.last6Months} />

          <DebtCard loans={loans} error={loansError} onRetry={loadLoans} />

          <div className="grid gap-4 lg:grid-cols-2">
            <PersonSplit title="Rendas por pessoa" emptyText="Nenhuma renda registrada neste mês." link="/rendas" people={incomePeople} total={data.summary.totalIncome} />
            <PersonSplit title="Gastos por pessoa" emptyText="Nenhum gasto registrado neste mês." link="/gastos" people={expensePeople} total={data.summary.totalExpenses} />
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <EvolutionChart last6Months={data.last6Months} />
            <CategoryDonut expensesByCategory={data.expensesByCategory} totalExpenses={data.summary.totalExpenses} />
          </div>

          <GoalsSection goals={data.activeGoals} />
        </div>
      )}
    </div>
  );
}
