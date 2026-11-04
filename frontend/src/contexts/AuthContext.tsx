'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import api from '../services/api';
import type { AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    couple: null,
    partner: null,
    token: null,
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('par_token');
    if (token) {
      setAuthState((s) => ({ ...s, token }));
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    const { token, user, couple, partner } = res.data;
    localStorage.setItem('par_token', token);
    setAuthState({ token, user, couple, partner, isAuthenticated: true });
  }

  function logout() {
    localStorage.removeItem('par_token');
    setAuthState({ user: null, couple: null, partner: null, token: null, isAuthenticated: false });
  }

  async function refreshUser() {
    try {
      const res = await api.get('/auth/me');
      setAuthState((s) => ({
        ...s,
        user: res.data.user,
        couple: res.data.couple,
        partner: res.data.partner,
        isAuthenticated: true,
      }));
    } catch {
      logout();
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="Carregando" className="flex min-h-screen items-center justify-center bg-surface">
        <Image src="/logo-icone.png" alt="" width={552} height={552} priority className="size-24 animate-pulse object-contain" />
        <span className="sr-only">Carregando…</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro do AuthProvider');
  return ctx;
}
