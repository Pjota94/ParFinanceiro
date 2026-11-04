import { Pencil, Trash2 } from 'lucide-react';

const base =
  'interactive inline-flex size-11 sm:size-9 items-center justify-center rounded-md text-ink-3';

/** Botões de editar/excluir com alvo de toque de 44px e rótulos acessíveis. */
export default function RowActions({ onEdit, onDelete, what }: { onEdit: () => void; onDelete: () => void; what: string }) {
  return (
    <div className="flex items-center">
      <button type="button" onClick={onEdit} aria-label={`Editar ${what}`} title="Editar" className={`${base} hover:bg-surface-3 hover:text-ink`}>
        <Pencil size={16} aria-hidden="true" />
      </button>
      <button type="button" onClick={onDelete} aria-label={`Excluir ${what}`} title="Excluir" className={`${base} hover:bg-negative-soft hover:text-negative`}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
