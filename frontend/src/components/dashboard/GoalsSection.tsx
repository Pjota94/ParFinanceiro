import Link from 'next/link';
import { ArrowRight, CalendarCheck, Plus, Sparkles, Target } from 'lucide-react';
import type { Goal } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import EmptyState from '../ui/EmptyState';
import { formatCurrency } from '../../lib/format';
import { forecast } from '../../lib/goals';

function GoalCard({ goal }: { goal: Goal }) {
  const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  const done = pct >= 100;
  const eta = forecast(goal);

  return (
    <li className="interactive min-w-[260px] flex-1 basis-[300px] rounded-lg border border-line bg-surface p-4 hover:border-line-strong hover:shadow-card">
      <div className="flex items-center gap-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-lg text-2xl"
          style={{ backgroundColor: `${goal.color}22` }}
          aria-hidden="true"
        >
          {goal.icon}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink [overflow-wrap:anywhere] line-clamp-2">{goal.title}</p>
          <p className="t-support capitalize">{goal.category}</p>
        </div>
      </div>

      {pct === 0 ? (
        <div className="mt-4 rounded-md bg-primary-soft p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary"><Sparkles size={15} aria-hidden="true" /> Todo sonho começa com o primeiro passo</p>
          <p className="mt-0.5 text-xs text-ink-2">Meta de {formatCurrency(goal.target_amount)}</p>
          <Button asChild size="sm" className="mt-3 w-full">
            <Link href="/metas"><Plus /> Faça seu primeiro aporte</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="num text-sm text-ink-2">
              <span className="font-bold text-ink">{formatCurrency(goal.current_amount)}</span> de {formatCurrency(goal.target_amount)}
            </p>
            <span className="num text-sm font-bold text-ink">{pct.toFixed(0)}%</span>
          </div>
          <Progress value={pct} indicatorColor={goal.color} gradient aria-label={`${goal.title}: ${pct.toFixed(0)}% concluído`} className="h-3" />
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            <CalendarCheck size={13} aria-hidden="true" />
            {done
              ? 'Meta alcançada! 🎉'
              : eta
                ? <>Previsão: <span className="font-semibold text-ink-2">{eta}</span></>
                : goal.deadline
                  ? `Prazo: ${new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}`
                  : 'Continuem aportando para ver a previsão'}
          </p>
        </div>
      )}
    </li>
  );
}

export default function GoalsSection({ goals }: { goals: Goal[] }) {
  return (
    <Card className="animate-fade-up">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Metas &amp; Sonhos</CardTitle>
        <Link href="/metas" className="interactive inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary hover:underline">
          Ver todas <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <EmptyState
            compact
            icon={<Target size={26} />}
            title="Que tal sonhar junto?"
            description="Criem uma meta, como viagem, casa ou reserva de emergência, e acompanhem o progresso do casal."
            action={<Button asChild><Link href="/metas"><Plus /> Criar primeira meta</Link></Button>}
          />
        ) : (
          // flex-wrap + flex-1: os cards da última linha crescem e ocupam toda a largura
          <ul className="flex flex-wrap gap-4">
            {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
