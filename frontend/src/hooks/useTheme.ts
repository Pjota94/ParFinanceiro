'use client';

import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'par_theme';

function initial(): Theme {
  const saved = localStorage.getItem(KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

/** Tema claro/escuro persistido. Aplicado no <html> só dentro do app logado. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    return () => document.documentElement.removeAttribute('data-theme');
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
