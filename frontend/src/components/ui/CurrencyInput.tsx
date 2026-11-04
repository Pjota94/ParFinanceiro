'use client';

import { type ChangeEvent } from 'react';
import { cn } from '../../lib/utils';
import { fieldBase } from './input';

interface CurrencyInputProps {
  /** Valor como string numérica (ex.: "1234.50"), igual ao contrato anterior */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
  autoFocus?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/** Máscara de moeda (R$): digite só números, os centavos entram da direita. */
export default function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className = '',
  required,
  ...rest
}: CurrencyInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { onChange(''); return; }
    onChange((parseInt(raw, 10) / 100).toFixed(2));
  }

  const display = value
    ? parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '';

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      className={cn(fieldBase, 'h-11 num', className)}
      {...rest}
    />
  );
}
