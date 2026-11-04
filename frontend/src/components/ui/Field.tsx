'use client';

import * as React from 'react';
import { Label } from './label';
import { cn } from '../../lib/utils';

interface FieldProps {
  label: string;
  /** Mensagem de validação inline (aparece sob o campo) */
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}

/**
 * Liga label ↔ campo ↔ mensagem de erro automaticamente
 * (id, aria-invalid, aria-describedby).
 */
export default function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = React.useId();
  const descId = `${id}-desc`;
  const child = React.cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hint ? descId : undefined,
  });
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-negative ml-0.5" aria-hidden="true">*</span>}
      </Label>
      {child}
      {error ? (
        <p id={descId} role="alert" className="text-xs font-medium text-negative">{error}</p>
      ) : hint ? (
        <p id={descId} className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
