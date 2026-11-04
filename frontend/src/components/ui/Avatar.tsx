'use client';

import { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Se informado, usa a foto de perfil desse usuário (quando houver) */
  userId?: string;
  /** Foto explícita (ex.: pré-visualização); tem prioridade sobre userId */
  src?: string | null;
}

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl',
};

export default function Avatar({ name, color, size = 'md', userId, src }: AvatarProps) {
  const auth = useContext(AuthContext);
  const initials = name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const person = userId ? [auth?.user, auth?.partner].find((u) => u?.id === userId) : undefined;
  const photo = src ?? person?.avatarUrl ?? null;

  const base = `${sizes[size]} rounded-full shrink-0 ring-2 ring-surface`;
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" aria-hidden="true" className={`${base} object-cover`} />;
  }
  return (
    <div
      className={`${base} flex items-center justify-center font-semibold text-white`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
