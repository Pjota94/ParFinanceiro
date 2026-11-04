import Link from 'next/link';
import { ArrowRight, CalendarClock, Landmark, PartyPopper, Plus } from 'lucide-react';
import type { Loan } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import EmptyState, { ErrorState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { formatCurrency } from '../../lib/format';
import { addOneMonth, daysUntil } from '../../lib/dates';

interface Props {
  loans: Loan[] | null;
  error: boolean;
  onRetry: () => void;
}

export default function DebtCard({ loans, error, onRetry }: Props) {
  const header = (
    <CardHeader className="flex-row items-center justify-between">
      <CardTitle>Dívidas</CardTitle>
      <Link href="/emprestimos" className="interactive inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary hover:underline">
        Ver empréstimos <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </CardHeader>
  );

  if (error) return <Card className="animate-fade-up">{header}<CardContent><ErrorState message="Não conseguimos carregar as dívidas agora." onRetry={onRetry} /></CardContent></Card>;

  if (!loans) {
    return (
      <Card role="status" aria-label="Carregando dívidas">
        {header}
        <CardContent className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></CardContent>
      </Card>
    );
  }

  if (loans.length === 0) {
    return (
      <Card className="animate-fade-up">
        {header}
        <CardContent>
          <EmptyState
            compact
            tone="neutral"
            icon={<Landmark size={26} />}
            title="Nenhuma dívida cadastrada"
            description="Se vocês têm financiamento ou empréstimo, cadastrem em Gastos para acompanhar o caminho até a quitação."
            action={<Button asChild size="sm"><Link href="/gastos"><Plus /> Cadastrar em Gastos</Link></Button>}
          />
        </CardContent>
      </Card>
    );
  }

  const open = loans.filter((l) => l.remaining_installments > 0);
  const remaining = loans.reduce((s, l) => s + Math.max(l.remaining_amount, 0), 0);
  const paid = loans.reduce((s, l) => s + l.total_paid, 0);
  const pct = paid + remaining > 0 ? Math.min((paid / (paid + remaining)) * 100, 100) : 100;

  // Próxima parcela: a mais próxima entre os contratos em aberto (data estimada: 1 mês após a última lançada)
  const upcoming = open
    .map((l) => ({ loan: l, due: addOneMonth(l.last_date) }))
    .sort((a, b) => a.due.getTime() - b.due.getTime())[0];
  const days = upcoming ? daysUntil(upcoming.due) : 0;

  return (
    <Card className="animate-fade-up">
      {header}
      <CardContent className="space-y-5">
        {open.length === 0 ? (
          <div className="flex items-center gap-3 rounded-md bg-primary-soft p-4 text-primary">
            <PartyPopper aria-hidden="true" />
            <p className="font-semibold">Todas as dívidas foram quitadas. Parabéns, vocês chegaram lá!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr]">
            <div>
              <p className="t-label">Saldo devedor</p>
              <p className="t-value mt-1 text-negative">{formatCurrency(remaining)}</p>
              <p className="t-support mt-0.5">{open.length} {open.length === 1 ? 'contrato em andamento' : 'contratos em andamento'}</p>
            </div>
            <div>
              <p className="t-label">Já pago</p>
              <p className="t-value mt-1 text-positive">{formatCurrency(paid)}</p>
              <p className="t-support mt-0.5">somando todos os contratos</p>
            </div>
            {upcoming && (
              <div className="rounded-md border border-line bg-surface-2 p-3">
                <p className="t-label flex items-center gap-1.5"><CalendarClock size={14} aria-hidden="true" /> Próxima parcela</p>
                <p className="mt-1 text-sm font-semibold text-ink [overflow-wrap:anywhere] line-clamp-1">{upcoming.loan.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="num text-lg font-bold text-ink">{formatCurrency(upcoming.loan.amount)}</span>
                  <span className="num text-sm text-ink-2">
                    {upcoming.due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  {days < 0 ? (
                    <Badge variant="destructive">Atrasada há {Math.abs(days)} {Math.abs(days) === 1 ? 'dia' : 'dias'}</Badge>
                  ) : days === 0 ? (
                    <Badge variant="warning">Vence hoje</Badge>
                  ) : (
                    <Badge variant="secondary">em {days} {days === 1 ? 'dia' : 'dias'}</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-3">Parcela {upcoming.loan.current_installment + 1} de {upcoming.loan.total_installments} · data estimada</p>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-medium text-ink-2">Progresso de quitação</span>
            <span className="num text-sm font-bold text-ink">{pct.toFixed(0)}%</span>
          </div>
          <Progress value={pct} gradient aria-label={`Progresso de quitação: ${pct.toFixed(0)}%`} className="h-3" />
        </div>
      </CardContent>
    </Card>
  );
}
