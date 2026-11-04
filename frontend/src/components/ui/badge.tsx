'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        default:     'bg-primary-soft text-primary',
        success:     'bg-primary-soft text-primary',
        navy:        'bg-neutral-soft text-neutral',
        purple:      'bg-neutral-soft text-neutral',
        blue:        'bg-neutral-soft text-neutral',
        secondary:   'bg-surface-3 text-ink-2',
        outline:     'border border-line-strong text-ink-2',
        warning:     'bg-warning-soft text-warning',
        orange:      'bg-warning-soft text-warning',
        destructive: 'bg-negative-soft text-negative',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export type PaymentStatus = 'pago' | 'pendente' | 'atrasado' | 'quitado';

const STATUS_META: Record<PaymentStatus, { label: string; variant: BadgeProps['variant']; dot: string }> = {
  pago:     { label: 'Pago',     variant: 'success',     dot: 'bg-primary' },
  quitado:  { label: 'Quitado',  variant: 'success',     dot: 'bg-primary' },
  pendente: { label: 'Pendente', variant: 'warning',     dot: 'bg-warning' },
  atrasado: { label: 'Atrasado', variant: 'destructive', dot: 'bg-negative' },
};

/** Badge de status com bolinha de cor + texto (nunca depende só da cor). */
function StatusBadge({ status, label }: { status: PaymentStatus; label?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant}>
      <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {label ?? meta.label}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants };
