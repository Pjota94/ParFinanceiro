'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { navItems } from './navItems';
import AppToaster from '../ui/AppToaster';
import { TooltipProvider } from '../ui/Tooltip';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Rota protegida: sem sessão, volta ao login
  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  // Ao trocar de página: fecha o drawer e volta ao topo
  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  if (!isAuthenticated) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:shadow-pop"
      >
        Pular para o conteúdo
      </a>

      <div className="min-h-dvh bg-surface-2 text-ink lg:flex">
        {/* Desktop: sidebar fixa */}
        <aside className="hidden lg:block w-72 shrink-0 sticky top-0 h-dvh" aria-label="Menu lateral">
          <Sidebar theme={theme} onToggleTheme={toggle} />
        </aside>

        {/* Mobile/tablet: barra superior + drawer */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-2 backdrop-blur lg:hidden">
          <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
            <Dialog.Trigger
              aria-label="Abrir menu"
              className="interactive inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-surface-3"
            >
              <Menu size={22} aria-hidden="true" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-navy-dark/60 backdrop-blur-sm" />
              <Dialog.Content
                aria-describedby={undefined}
                className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-80 shadow-pop animate-[fade-up_200ms_var(--ease)] focus:outline-none"
              >
                <Dialog.Title className="sr-only">Menu</Dialog.Title>
                <Sidebar theme={theme} onToggleTheme={toggle} onNavigate={() => setDrawerOpen(false)} />
                <Dialog.Close
                  aria-label="Fechar menu"
                  className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-md text-brand-navy hover:bg-black/5"
                >
                  <X size={20} aria-hidden="true" />
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <Image src="/logo-completa.png" alt="Par Financeiro" width={1996} height={788} className="h-10 w-auto object-contain" />
        </header>

        <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 pb-24 lg:pb-0 focus:outline-none">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>

        {/* Mobile: navegação inferior */}
        <nav
          aria-label="Navegação rápida"
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
        >
          <ul className="grid grid-cols-5">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <Link
                  href={to}
                  aria-current={pathname === to ? 'page' : undefined}
                  className={cn(
                    'interactive flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                    pathname === to ? 'text-primary' : 'text-ink-3 hover:text-ink'
                  )}
                >
                  <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', pathname === to && 'bg-primary-soft')}>
                    <Icon size={20} strokeWidth={pathname === to ? 2.4 : 2} aria-hidden="true" />
                  </span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <AppToaster />
    </TooltipProvider>
  );
}
