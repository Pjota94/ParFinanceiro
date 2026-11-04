'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { fieldBase } from './input';

/** Select nativo estilizado: acessível, com teclado e seletor nativo no mobile. */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(fieldBase, 'h-11 appearance-none pr-9 cursor-pointer', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
      />
    </div>
  )
);
Select.displayName = 'Select';

export { Select };
