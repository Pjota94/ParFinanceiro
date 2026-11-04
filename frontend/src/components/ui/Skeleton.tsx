import { cn } from '../../lib/utils';

/** Bloco de carregamento com brilho suave (desliga com prefers-reduced-motion). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-md bg-[linear-gradient(90deg,var(--surface-3)_25%,var(--line)_50%,var(--surface-3)_75%)] bg-[length:200%_100%] animate-[skeleton-shimmer_1.6s_linear_infinite] motion-reduce:animate-none',
        className
      )}
    />
  );
}

/** Lista de linhas-esqueleto para tabelas/listas. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
