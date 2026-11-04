'use client';

import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/**
 * Modal acessível (Radix Dialog): foco preso, Esc fecha, aria-modal.
 * Foca automaticamente o primeiro campo do formulário ao abrir.
 * No mobile vira "bottom sheet".
 */
export default function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-navy-dark/60 backdrop-blur-sm data-[state=open]:animate-[fade-up_200ms_var(--ease)]" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            const el = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(
              'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
            );
            if (el) { e.preventDefault(); el.focus(); }
          }}
          className={cn(
            'fixed z-50 bg-surface text-ink border border-line shadow-pop flex flex-col',
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl',
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[calc(100%-2rem)] sm:max-h-[90dvh] sm:rounded-xl',
            'data-[state=open]:animate-[fade-up_200ms_var(--ease)]',
            sizes[size]
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
            <div>
              <Dialog.Title className="text-lg font-semibold text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="t-support mt-0.5">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="interactive -mr-2 -mt-1 size-11 shrink-0 inline-flex items-center justify-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink"
            >
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto flex-1 px-6 py-5 safe-bottom">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
