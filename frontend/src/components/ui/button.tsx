'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'interactive inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-fg shadow-card hover:bg-primary-hover',
        navy:        'bg-brand-navy text-white shadow-card hover:bg-brand-navy-light',
        // "gradient" é mantido por compatibilidade: agora é o botão primário
        gradient:    'bg-primary text-primary-fg shadow-card hover:bg-primary-hover',
        destructive: 'bg-negative text-negative-fg shadow-card hover:brightness-90',
        outline:     'border border-line-strong bg-surface text-ink hover:bg-surface-3',
        soft:        'bg-primary-soft text-primary hover:brightness-95',
        ghost:       'text-ink-2 hover:bg-surface-3 hover:text-ink',
        link:        'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4',
        sm:      'h-9 rounded-sm px-3 text-xs max-sm:h-11',
        lg:      'h-12 px-6 text-base',
        icon:    'size-11',
        'icon-sm': 'size-9 rounded-sm max-sm:size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Mostra spinner e desabilita o botão enquanto a ação acontece */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
