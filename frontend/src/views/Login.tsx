'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, TrendingUp, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="relative hidden lg:flex w-1/2 xl:w-[55%] flex-col items-center justify-between overflow-hidden bg-gradient-to-br from-brand-navy-dark via-brand-navy to-brand-navy-light p-12">
        {/* Decoração */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-brand-green/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-brand-green-light/10 blur-3xl" />

        <div />

        <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-10 text-center">
          {/* Logo em destaque */}
          <div className="w-full rounded-3xl bg-white p-8 shadow-2xl shadow-black/30 ring-1 ring-white/20">
            <Image
              src="/logo-completa.png"
              alt="Par Financeiro"
              width={1996}
              height={788}
              priority
              className="mx-auto h-auto w-full max-w-md object-contain"
            />
          </div>

          <div className="space-y-2">
            <p className="text-3xl xl:text-4xl font-bold leading-tight text-white">
              Organizem juntos.<br />
              <span className="text-brand-green">Conquistem mais.</span>
            </p>
            <p className="text-white/70 text-sm">As finanças do casal, com transparência e carinho.</p>
          </div>

          <ul className="grid w-full grid-cols-2 gap-3 text-left">
            {[
              { icon: '💰', text: 'Ganhos e gastos do casal' },
              { icon: '🎯', text: 'Metas e sonhos juntos' },
              { icon: '📊', text: 'Gráficos e histórico' },
              { icon: '🔒', text: 'Privacidade e transparência' },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-xl" aria-hidden="true">{icon}</span>
                <span className="text-sm text-white/85">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-white/40 text-xs">© 2026 Par Financeiro</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-brand-bg">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center">
            <Image
              src="/logo-completa.png"
              alt="Par Financeiro"
              width={1996}
              height={788}
              priority
              className="h-auto w-full max-w-xs object-contain"
            />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-brand-navy">Bem-vindo de volta 👋</h1>
            <p className="text-gray-600 text-sm mt-1.5">Entre na conta do casal para continuar</p>
          </div>

          <Card className="shadow-lg border-0">
            <CardContent className="pt-6 space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="password"
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="px-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading} variant="gradient" className="w-full h-11 text-sm mt-2">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <TrendingUp size={16} className="animate-pulse" /> Entrando...
                    </span>
                  ) : (
                    'Entrar na conta'
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400">ou</span>
                </div>
              </div>

              <p className="text-sm text-center text-gray-500">
                Ainda não tem conta?{' '}
                <Link href="/cadastro" className="text-brand-green font-semibold hover:text-brand-green-dark transition-colors">
                  Cadastrar casal
                </Link>
              </p>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-gray-400">
            Transparência financeira fortalece os relacionamentos 💚
          </p>
        </div>
      </div>
    </div>
  );
}
