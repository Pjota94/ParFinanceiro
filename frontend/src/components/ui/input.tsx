'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export const fieldBase =
  'flex w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-negative aria-[invalid=true]:ring-negative/20';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn(fieldBase, 'h-11', className)} ref={ref} {...props} />
  )
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, 'py-2.5 resize-none', className)} {...props} />
  )
);
Textarea.displayName = 'Textarea';

export { Input, Textarea };
