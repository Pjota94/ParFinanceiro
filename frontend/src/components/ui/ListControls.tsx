import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SortDir } from '../../hooks/useSort';
import { Input } from './input';
import { Select } from './Select';

/** Campo de busca com ícone e botão de limpar. */
export function SearchInput({ value, onChange, placeholder = 'Buscar…', label = 'Buscar' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string;
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
      <Input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center text-ink-3 hover:text-ink"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Cabeçalho de coluna ordenável (desktop). */
export function SortHeader({ label, active, dir, onClick, className }: {
  label: string; active: boolean; dir: SortDir; onClick: () => void; className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ordenar por ${label}${active ? (dir === 'asc' ? ', crescente' : ', decrescente') : ''}`}
      className={cn('t-label interactive inline-flex items-center gap-1 rounded-sm hover:text-ink', active && 'text-ink', className)}
    >
      {label}
      <Icon size={12} aria-hidden="true" />
    </button>
  );
}

/** Seletor de ordenação para telas pequenas (onde não há cabeçalho de tabela). */
export function SortSelect<K extends string>({ value, dir, options, onChange, onDirChange }: {
  value: K; dir: SortDir; options: { value: K; label: string }[];
  onChange: (k: K) => void; onDirChange: (d: SortDir) => void;
}) {
  return (
    <div className="flex gap-2 sm:hidden">
      <div className="flex-1">
        <Select aria-label="Ordenar por" value={value} onChange={(e) => onChange(e.target.value as K)}>
          {options.map((o) => <option key={o.value} value={o.value}>Ordenar: {o.label}</option>)}
        </Select>
      </div>
      <button
        type="button"
        onClick={() => onDirChange(dir === 'asc' ? 'desc' : 'asc')}
        aria-label={dir === 'asc' ? 'Ordem crescente. Alternar para decrescente' : 'Ordem decrescente. Alternar para crescente'}
        className="interactive inline-flex size-11 items-center justify-center rounded-md border border-line-strong bg-surface text-ink-2"
      >
        {dir === 'asc' ? <ArrowUp size={16} aria-hidden="true" /> : <ArrowDown size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}
