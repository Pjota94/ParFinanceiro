'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export default function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[60] max-w-xs rounded-sm bg-brand-navy-dark px-2.5 py-1.5 text-xs font-medium text-white shadow-pop animate-[fade-up_150ms_var(--ease)]"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-brand-navy-dark" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
