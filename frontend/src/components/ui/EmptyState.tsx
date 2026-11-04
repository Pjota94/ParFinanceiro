'use client';

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Tom da ilustração */
  tone?: 'primary' | 'neutral' | 'negative';
  className?: string;
  compact?: boolean;
}

const tones = {
  primary:  'bg-primary-soft text-primary',
  neutral:  'bg-neutral-soft text-neutral',
  negative: 'bg-negative-soft text-negative',
};

/** Ilustração simples (ícone em círculo com anéis) + texto + ação. */
export default function EmptyState({ icon, title, description, action, tone = 'primary', className, compact }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6', compact ? 'py-8' : 'py-14', className)}>
      <div className="relative mb-4" aria-hidden="true">
        <div className={cn('absolute inset-0 -m-3 rounded-full opacity-40', tones[tone])} />
        <div className={cn('relative size-14 rounded-full flex items-center justify-center', tones[tone])}>{icon}</div>
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && <p className="t-support mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Estado de erro com botão "Tentar de novo". */
export function ErrorState({ message, onRetry, children }: { message?: string; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div role="alert">
      <EmptyState
        tone="negative"
        icon={<span className="text-2xl">⚠️</span>}
        title="Ops, algo não saiu como esperado"
        description={message || 'Não conseguimos carregar essas informações agora. Tente novamente em instantes.'}
        action={
          onRetry ? (
            <button onClick={onRetry} className="interactive min-h-11 rounded-md border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-3">
              Tentar de novo
            </button>
          ) : undefined
        }
      />
      {children}
    </div>
  );
}
