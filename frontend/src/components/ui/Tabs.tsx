'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '../../lib/utils';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: NoInfer<T>) => void;
  'aria-label': string;
  className?: string;
}

/** Abas em formato "segmented": navegação por setas, aria-selected. */
export default function Tabs<T extends string>({ items, value, onChange, className, ...rest }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % items.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(items[next].value);
      refs.current[next]?.focus();
    }
  }

  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn('inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface-3 p-1 scrollbar-thin', className)}
    >
      {items.map((it, i) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'interactive inline-flex min-h-11 sm:min-h-9 shrink-0 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium whitespace-nowrap',
              active ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink'
            )}
          >
            {it.icon}
            {it.label}
            {it.count !== undefined && (
              <span className={cn('num rounded-full px-1.5 text-xs', active ? 'bg-primary-soft text-primary' : 'bg-line text-ink-3')}>
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
