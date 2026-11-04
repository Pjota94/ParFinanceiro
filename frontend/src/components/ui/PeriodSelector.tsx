import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS } from '../../types';
import { cn } from '../../lib/utils';

interface PeriodSelectorProps {
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
  /** Atalho para voltar ao mês atual */
  onToday?: () => void;
  isCurrent?: boolean;
}

const arrow =
  'interactive inline-flex size-11 sm:size-10 items-center justify-center rounded-md text-ink-2 hover:bg-surface-3 hover:text-ink';

export default function PeriodSelector({ month, year, onPrev, onNext, onToday, isCurrent }: PeriodSelectorProps) {
  const prevName = MONTHS[(month + 10) % 12];
  const nextName = MONTHS[month % 12];
  return (
    <div role="group" aria-label="Período" className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-line-strong bg-surface p-0.5 shadow-card">
        <button onClick={onPrev} className={arrow} aria-label={`Mês anterior: ${prevName}`}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="flex min-w-[9.5rem] items-center justify-center gap-2 px-2" aria-live="polite">
          <CalendarDays size={16} className="text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink">
            {MONTHS[month - 1]} <span className="num text-ink-3 font-medium">{year}</span>
          </span>
        </div>
        <button onClick={onNext} className={arrow} aria-label={`Próximo mês: ${nextName}`}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      {onToday && (
        <button
          onClick={onToday}
          disabled={isCurrent}
          className={cn(
            'interactive min-h-11 sm:min-h-10 rounded-lg px-3.5 text-sm font-semibold',
            isCurrent
              ? 'cursor-default text-ink-3 opacity-60'
              : 'bg-primary-soft text-primary hover:brightness-95'
          )}
        >
          Hoje
        </button>
      )}
    </div>
  );
}
