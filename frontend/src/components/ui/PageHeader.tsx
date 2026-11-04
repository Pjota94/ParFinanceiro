'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Seletor de mês, botões de ação, etc. */
  children?: ReactNode;
}

export default function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="t-page-title">{title}</h1>
        {subtitle && <p className="t-support mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}
