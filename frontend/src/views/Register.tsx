'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, CheckCircle2, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';

interface PersonForm {
  name: string;
  email: string;
  password: string;
  showPwd: boolean;
}

export default function Register() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const [coupleName, setCoupleName] = useState('');
  const [person1, setPerson1] = useState<PersonForm>({ name: '', email: '', password: '', showPwd: false });
  const [person2, setPerson2] = useState<PersonForm>({ name: '', email: '', password: '', showPwd: false });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  function updatePerson1(field: keyof PersonForm, value: string | boolean) {
    setPerson1((p) => ({ ...p, [field]: value }));
  }
  function updatePerson2(field: keyof PersonForm, value: string | boolean) {
    setPerson2((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (person1.password.length < 6 || person2.password.length < 6) {
      toast.error('As senhas devem ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        coupleName,
        person1: { name: person1.name, email: person1.email, password: person1.password },
        person2: { name: person2.name, email: person2.email, password: person2.password },
      });
      toast.success('Casal cadastrado com sucesso! 🎉');
      router.push('/login');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  const steps = ['Nome do Casal', 'Pessoa 1', 'Pessoa 2'];

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo-completa.png" alt="Par Financeiro" width={1996} height={788} className="h-14 w-auto object-contain" />
        </div>

        <Card className="shadow-xl border-0">
          {/* Progress stepper */}
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-2">
              {steps.map((label, i) => {
                const s = i + 1;
                const done = step > s;
                const active = step === s;
                return (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                          done
                            ? 'bg-brand-green text-white'
                            : active
                              ? 'bg-brand-navy text-white'
                              : 'bg-gray-100 text-gray-400'
                        )}
                      >
                        {done ? <CheckCircle2 size={14} /> : s}
                      </div>
                      <span className={cn('text-xs font-medium truncate hidden sm:block', active ? 'text-brand-navy' : done ? 'text-brand-green' : 'text-gray-400')}>
                        {label}
                      </span>
                    </div>
                    {s < 3 && (
                      <div className={cn('flex-1 h-0.5 rounded transition-all', step > s ? 'bg-brand-green' : 'bg-gray-100')} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit}>
              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-brand-navy mb-0.5">Como vocês se chamam?</h2>
                    <p className="text-sm text-gray-500">Dê um nome especial para o casal 💕</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="coupleName">Nome do Casal</Label>
                    <Input
                      id="coupleName"
                      value={coupleName}
                      onChange={(e) => setCoupleName(e.target.value)}
                      placeholder="Ex: Ana & Pedro, Família Silva..."
                      required
                    />
                  </div>

                  <div className="bg-brand-navy/5 rounded-xl p-4 border border-brand-navy/10 space-y-2">
                    <p className="text-sm font-semibold text-brand-navy">💡 Por que usar o Par Financeiro?</p>
                    {[
                      'Transparência total nos ganhos e gastos',
                      'Planejamento de metas e sonhos juntos',
                      'Histórico e gráficos do casal',
                      'Cada um mantém sua privacidade de senha',
                    ].map((t) => (
                      <div key={t} className="flex items-center gap-2 text-xs text-brand-navy/70">
                        <CheckCircle2 size={13} className="text-brand-green flex-shrink-0" /> {t}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="gradient"
                    className="w-full"
                    onClick={() => coupleName.trim() ? setStep(2) : toast.error('Informe o nome do casal')}
                  >
                    Próximo →
                  </Button>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-brand-navy">Dados da Pessoa 1</h2>
                    <p className="text-sm text-gray-500">Quem está configurando o casal</p>
                  </div>
                  <PersonFields person={person1} color="#1B2D5B" onUpdate={updatePerson1} />
                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                      ← Voltar
                    </Button>
                    <Button
                      type="button"
                      variant="gradient"
                      className="flex-1"
                      onClick={() => {
                        if (!person1.name || !person1.email || !person1.password) {
                          toast.error('Preencha todos os campos da pessoa 1');
                          return;
                        }
                        setStep(3);
                      }}
                    >
                      Próximo →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-brand-navy">Dados da Pessoa 2</h2>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      Parceiro(a) de {person1.name} <Heart size={13} className="text-brand-green" />
                    </p>
                  </div>
                  <PersonFields person={person2} color="#2DC97E" onUpdate={updatePerson2} />
                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                      ← Voltar
                    </Button>
                    <Button type="submit" disabled={loading} variant="gradient" className="flex-1">
                      {loading ? 'Cadastrando...' : '🎉 Cadastrar Casal'}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            {step === 1 && (
              <p className="text-sm text-center text-gray-500 mt-5 pt-4 border-t border-gray-100">
                Já tem conta?{' '}
                <Link href="/login" className="text-brand-green font-semibold hover:text-brand-green-dark">
                  Entrar
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PersonFields({
  person,
  color,
  onUpdate,
}: {
  person: PersonForm;
  color: string;
  onUpdate: (field: keyof PersonForm, value: string | boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ backgroundColor: `${color}0D`, borderColor: `${color}20` }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {person.name ? person.name.charAt(0).toUpperCase() : '?'}
        </div>
        <span className="text-sm font-medium" style={{ color }}>
          {person.name || 'Preencha os dados abaixo'}
        </span>
      </div>

      <div className="space-y-1.5">
        <Label>Nome completo</Label>
        <Input
          value={person.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          placeholder="Nome completo"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>E-mail</Label>
        <Input
          type="email"
          value={person.email}
          onChange={(e) => onUpdate('email', e.target.value)}
          placeholder="email@exemplo.com"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Senha</Label>
        <div className="relative">
          <Input
            type={person.showPwd ? 'text' : 'password'}
            value={person.password}
            onChange={(e) => onUpdate('password', e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => onUpdate('showPwd', !person.showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {person.showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
