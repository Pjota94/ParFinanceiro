'use client';

import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

/** Ordenação genérica: clique alterna asc/desc na mesma coluna. */
export function useSort<T, K extends string>(
  items: T[],
  initialKey: K,
  getters: Record<K, (item: T) => string | number>,
  initialDir: SortDir = 'desc'
) {
  const [key, setKey] = useState<K>(initialKey);
  const [dir, setDir] = useState<SortDir>(initialDir);

  const sorted = useMemo(() => {
    const get = getters[key];
    const mult = dir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = get(a); const vb = get(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult;
      return String(va).localeCompare(String(vb), 'pt-BR') * mult;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, key, dir]);

  function toggle(next: K) {
    if (next === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setKey(next); setDir('asc'); }
  }

  const changeKey = (k: K) => setKey(k);
  const changeDir = (d: SortDir) => setDir(d);

  return { sorted, key, dir, toggle, setKey: changeKey, setDir: changeDir };
}
