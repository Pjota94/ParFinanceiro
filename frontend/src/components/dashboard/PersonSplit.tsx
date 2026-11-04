import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import Avatar from '../ui/Avatar';
import { formatCurrency } from '../../lib/format';

export interface Person {
  id: string;
  name: string;
  color: string;
  total: number;
}

interface Props {
  title: string;
  /** Texto de apoio quando o total é zero */
  emptyText: string;
  link: string;
  people: Person[];
  total: number;
}

/**
 * Mostra SEMPRE os dois parceiros lado a lado, com barra empilhada (100% = soma dos dois).
 */
export default function PersonSplit({ title, emptyText, link, people, total }: Props) {
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  const summary = people.map((p) => `${p.name} ${pct(p.total).toFixed(0)}%, ${formatCurrency(p.total)}`).join('; ');

  return (
    <Card className="animate-fade-up">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Link href={link} className="interactive inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary hover:underline">
          Ver detalhes <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Barra empilhada */}
        <div>
          <div
            role="img"
            aria-label={total > 0 ? `${title}: ${summary}` : `${title}: sem registros neste mês`}
            className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-surface-3"
          >
            {total > 0 &&
              people.map((p) => (
                <div
                  key={p.id}
                  className="animate-bar-grow h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${pct(p.total)}%`, backgroundColor: p.color }}
                />
              ))}
          </div>
          {total === 0 && <p className="t-support mt-2">{emptyText}</p>}
        </div>

        {/* Os dois lado a lado */}
        <ul className="grid grid-cols-2 gap-3">
          {people.map((p) => (
            <li key={p.id} className="min-w-0 rounded-md border border-line p-3" style={{ borderTop: `3px solid ${p.color}` }}>
              <div className="flex items-center gap-2">
                <Avatar userId={p.id} name={p.name} color={p.color} size="sm" />
                <span className="min-w-0 flex-1 text-sm font-medium text-ink [overflow-wrap:anywhere] line-clamp-2">{p.name}</span>
              </div>
              <p className="t-value mt-3 text-xl leading-7 text-ink">{formatCurrency(p.total)}</p>
              <p className="num mt-0.5 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
                {pct(p.total).toFixed(0)}% <span className="font-normal text-ink-3">do total</span>
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
