'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Camera, LogOut, Moon, Sun } from 'lucide-react';
import { navItems } from './navItems';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar';
import ProfileModal from './ProfileModal';
import Tooltip from '../ui/Tooltip';
import { cn } from '../../lib/utils';

interface SidebarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  /** Chamado ao navegar (fecha o drawer no mobile) */
  onNavigate?: () => void;
}

function PersonRow({ id, name, color, caption, highlight }: { id: string; name: string; color: string; caption: string; highlight?: boolean }) {
  return (
    <Tooltip content={name} side="right">
      <div
        tabIndex={0}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5',
          highlight ? 'bg-white/10 ring-1 ring-brand-green/40' : 'bg-white/5'
        )}
      >
        <Avatar userId={id} name={name} color={color} size="sm" />
        <div className="min-w-0 flex-1">
          {/* quebra de linha em vez de cortar com reticências */}
          <p className="text-sm font-semibold leading-snug text-white [overflow-wrap:anywhere] line-clamp-2">{name}</p>
          <p className={cn('text-xs', highlight ? 'text-brand-green' : 'text-white/70')}>{caption}</p>
        </div>
      </div>
    </Tooltip>
  );
}

/** Conteúdo da sidebar, reutilizado no desktop (fixa) e no drawer mobile. */
export default function Sidebar({ theme, onToggleTheme, onNavigate }: SidebarProps) {
  const { user, couple, partner, logout } = useAuth();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="flex h-full flex-col bg-brand-navy text-white">
      {/* Logo em cartão branco: o texto azul-marinho do logo precisa de fundo claro */}
      <div className="p-4 pb-3">
        <div className="rounded-lg bg-white px-3 py-1.5 shadow-card">
          <Image src="/logo-completa.png" alt="Par Financeiro" width={1996} height={788} className="mx-auto h-16 w-auto object-contain" />
        </div>
      </div>

      {/* Casal */}
      <section aria-label="Casal" className="px-4 py-3">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/70 [overflow-wrap:anywhere]">
          {couple?.name || 'Nosso casal'}
        </p>
        <div className="space-y-1.5">
          {user && <PersonRow id={user.id} name={user.name} color={user.avatarColor} caption="Você" highlight />}
          {partner && <PersonRow id={partner.id} name={partner.name} color={partner.avatarColor} caption="Parceiro(a)" />}
        </div>
      </section>

      {/* Navegação */}
      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-4 py-3">
        <ul className="space-y-1">
          {navItems.map(({ to, icon: Icon, full }) => (
            <li key={to}>
              <Link
                href={to}
                onClick={onNavigate}
                aria-current={pathname === to ? 'page' : undefined}
                className={cn(
                  'interactive group relative flex min-h-11 items-center gap-3 rounded-md px-3.5 text-sm font-medium',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                  pathname === to
                    ? 'bg-brand-green font-semibold text-brand-navy-dark shadow-lg shadow-black/20'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                {pathname === to && <span aria-hidden="true" className="absolute -left-4 h-6 w-1 rounded-r-full bg-brand-green" />}
                <Icon size={20} strokeWidth={pathname === to ? 2.4 : 2} aria-hidden="true" />
                {full}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Rodapé */}
      <div className="space-y-1 border-t border-white/10 p-4">
        <button
          onClick={() => setProfileOpen(true)}
          className="interactive flex min-h-11 w-full items-center gap-3 rounded-md px-3.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Camera size={18} aria-hidden="true" />
          Foto de perfil
        </button>
        <button
          onClick={onToggleTheme}
          className="interactive flex min-h-11 w-full items-center gap-3 rounded-md px-3.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
        >
          {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
        <button
          onClick={logout}
          className="interactive flex min-h-11 w-full items-center gap-3 rounded-md px-3.5 text-sm font-medium text-white/80 hover:bg-red-500/20 hover:text-white"
        >
          <LogOut size={18} aria-hidden="true" />
          Sair da conta
        </button>
      </div>
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
