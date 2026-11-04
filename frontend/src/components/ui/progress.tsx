'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../../lib/utils';

type Props = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  indicatorColor?: string;
  /** Usa gradiente (cor → verde) no preenchimento */
  gradient?: boolean;
};

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, Props>(
  ({ className, value, indicatorColor, gradient, ...props }, ref) => {
    const v = Math.max(0, Math.min(100, value || 0));
    const color = indicatorColor || 'var(--primary)';
    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={v}
        className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-surface-3', className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="h-full w-full rounded-full transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{
            transform: `translateX(-${100 - v}%)`,
            background: gradient ? `linear-gradient(90deg, ${color}, #2DC97E)` : color,
          }}
        />
      </ProgressPrimitive.Root>
    );
  }
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
