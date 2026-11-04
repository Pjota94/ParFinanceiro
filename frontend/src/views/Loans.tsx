'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock, Landmark, PartyPopper, PiggyBank, Plus, SearchX, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../services/api';
import { type Expense, type Loan, EXPENSE_CATEGORIES } from '../types';
import { useSort } from '../hooks/useSort';
import { formatCurrency, formatDate, formatMonthYear, normalize } from '../lib/format';
import { addOneMonth, daysUntil } from '../lib/dates';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import CurrencyInput from '../components/ui/CurrencyInput';
import Avatar from '../components/ui/Avatar';
import Field from '../components/ui/Field';
import Tabs from '../components/ui/Tabs';
import EmptyState, { ErrorState } from '../components/ui/EmptyState';
import { SkeletonRows } from '../components/ui/Skeleton';
import { SearchInput, SortHeader, SortSelect } from '../components/ui/ListControls';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge, StatusBadge, type PaymentStatus } from '../components/ui/badge';
import { cn } from '../lib/utils';

interface LoanDetail extends Loan {
  estimated_end_date: string | null;
  progress_pct: number;
  installments: Expense[];
}

type TypeFilter = 'todos' | 'financiamento' | 'emprestimo';
type SortKey = 'description' | 'progress' | 'remaining' | 'amount';

const SORT_LABELS: { value: SortKey; label: string }[] = [
  { value: 'remaining', label: 'Quanto falta' },
  { value: 'progress', label: 'Progresso' },
  { value: 'amount', label: 'Parcela' },
  { value: 'description', label: 'Nome' },
];

const TYPE_META = {
  financiamento: { label: 'Financiamento', icon: '🏦', badge: 'navy' as const },
  emprestimo: { label: 'Empréstimo', icon: '🤝', badge: 'default' as const },
};

const progressOf = (l: Pick<Loan, 'current_installment' | 'total_installments'>) =>
  Math.min((l.current_installment / l.total_installments) * 100, 100);

/**
 * Status calculado a partir das parcelas lançadas (não há campo de status no banco):
 * quitado → atrasado (próxima parcela já passou da data estimada) → pago no mês → pendente.
 */
function loanStatus(l: Loan): { status: PaymentStatus; label?: string } {
  if (l.current_installment >= l.total_installments) return { status: 'quitado' };
  const due = addOneMonth(l.last_date);
  if (daysUntil(due) < 0) return { status: 'atrasado' };
  const now = new Date();
  const last = new Date(l.last_date + 'T00:00:00');
  if (last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear()) return { status: 'pago', label: 'Pago no mês' };
  return { status: 'pendente' };
}

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<LoanDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [installLoan, setInstallLoan] = useState<Loan | null>(null);
  const [installAmount, setInstallAmount] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [installNotes, setInstallNotes] = useState('');
  const [installError, setInstallError] = useState<string>();
  const [installSaving, setInstallSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.get('/expenses/loans')
      .then((res) => { if (!cancelled) setLoans(res.data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  const refetch = () => setReload((n) => n + 1);

  async function openDetail(loanId: string) {
    setDetailLoadingId(loanId);
    try {
      const res = await api.get(`/expenses/loans/${loanId}`);
      setSelected(res.data);
      setDetailOpen(true);
    } catch {
      toast.error('Não conseguimos abrir os detalhes agora.');
    } finally {
      setDetailLoadingId(null);
    }
  }

  function openInstallModal(loan: Loan) {
    setInstallLoan(loan);
    setInstallAmount(loan.amount.toString());
    setInstallDate(new Date().toISOString().split('T')[0]);
    setInstallNotes('');
    setInstallError(undefined);
    setInstallModalOpen(true);
  }

  async function handleRegisterInstallment(e: React.FormEvent) {
    e.preventDefault();
    if (!installLoan) return;
    if (!installAmount || parseFloat(installAmount) <= 0) { setInstallError('Informe o valor pago.'); return; }
    setInstallError(undefined);
    const nextInstallment = installLoan.current_installment + 1;
    if (nextInstallment > installLoan.total_installments) {
      toast.error('Todas as parcelas já foram registradas!');
      return;
    }
    setInstallSaving(true);
    const now = new Date(installDate + 'T00:00:00');
    try {
      await api.post('/expenses', {
        description: installLoan.description,
        amount: parseFloat(installAmount),
        category: installLoan.category,
        isShared: installLoan.is_shared === 1,
        date: installDate,
        notes: installNotes || null,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        expenseType: installLoan.expense_type,
        recurrence: 'parcelado',
        totalInstallments: installLoan.total_installments,
        currentInstallment: nextInstallment,
        loanId: installLoan.loan_id,
      });
      toast.success(`Parcela ${nextInstallment}/${installLoan.total_installments} registrada. Mais um passo!`);
      setInstallModalOpen(false);
      refetch();
      if (selected?.loan_id === installLoan.loan_id) openDetail(installLoan.loan_id);
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      toast.error(e2.response?.data?.error || 'Não deu para registrar a parcela.');
    } finally {
      setInstallSaving(false);
    }
  }

  const totals = useMemo(() => {
    const remaining = loans.reduce((s, l) => s + Math.max(l.remaining_amount, 0), 0);
    const paid = loans.reduce((s, l) => s + l.total_paid, 0);
    const open = loans.filter((l) => l.remaining_installments > 0).length;
    return { remaining, paid, open, pct: paid + remaining > 0 ? (paid / (paid + remaining)) * 100 : 0 };
  }, [loans]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return loans.filter((l) => {
      if (typeFilter !== 'todos' && l.expense_type !== typeFilter) return false;
      if (!q) return true;
      return normalize(`${l.description} ${l.user_name}`).includes(q);
    });
  }, [loans, typeFilter, search]);

  const { sorted, key, dir, toggle, setKey, setDir } = useSort<Loan, SortKey>(
    filtered, 'remaining',
    {
      description: (l) => l.description,
      progress: (l) => progressOf(l),
      remaining: (l) => l.remaining_amount,
      amount: (l) => l.amount,
    }
  );

  const count = (t: TypeFilter) => (t === 'todos' ? loans.length : loans.filter((l) => l.expense_type === t).length);

  return (
    <div className="space-y-6">
      <PageHeader title="Empréstimos e financiamentos" subtitle="Cada parcela paga aproxima vocês da quitação" />

      {loading ? (
        <Card><SkeletonRows /></Card>
      ) : error ? (
        <Card><ErrorState onRetry={refetch} /></Card>
      ) : loans.length === 0 ? (
        <Card>
          <EmptyState
            tone="neutral"
            icon={<Landmark size={26} />}
            title="Nenhum empréstimo ou financiamento"
            description="Quando vocês registrarem um gasto do tipo Financiamento ou Empréstimo em Gastos, ele aparece aqui com o progresso até a quitação."
            action={<Button asChild><Link href="/gastos"><Plus /> Cadastrar em Gastos</Link></Button>}
          />
        </Card>
      ) : (
        <>
          {/* Resumo */}
          <section aria-label="Resumo das dívidas" className="grid gap-4 sm:grid-cols-3">
            <Card className="border-transparent bg-gradient-to-br from-brand-navy to-brand-navy-light p-5 text-white shadow-pop">
              <p className="t-label text-white/80">Saldo devedor</p>
              <p className="t-value-xl mt-2">{formatCurrency(totals.remaining)}</p>
              <p className="mt-1 text-sm text-white/80">{totals.open} {totals.open === 1 ? 'contrato em andamento' : 'contratos em andamento'}</p>
            </Card>
            <Card className="p-5">
              <p className="t-label">Já pago</p>
              <p className="t-value mt-2 text-positive">{formatCurrency(totals.paid)}</p>
              <p className="t-support mt-1">somando todos os contratos</p>
            </Card>
            <Card className="p-5">
              <p className="t-label">Caminho até a quitação</p>
              <p className="t-value mt-2">{totals.pct.toFixed(0)}%</p>
              <Progress value={totals.pct} gradient className="mt-3" aria-label={`Quitação geral: ${totals.pct.toFixed(0)}%`} />
            </Card>
          </section>

          <Card className="overflow-hidden">
            <div className="space-y-3 border-b border-line p-4">
              <Tabs
                aria-label="Tipo de contrato"
                value={typeFilter}
                onChange={setTypeFilter}
                items={[
                  { value: 'todos', label: 'Todos', count: count('todos') },
                  { value: 'financiamento', label: 'Financiamentos', count: count('financiamento') },
                  { value: 'emprestimo', label: 'Empréstimos', count: count('emprestimo') },
                ]}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SearchInput value={search} onChange={setSearch} placeholder="Buscar contrato ou pessoa" label="Buscar contratos" />
                <p className="t-support sm:ml-auto" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'contrato' : 'contratos'}</p>
              </div>
              <SortSelect value={key} dir={dir} options={SORT_LABELS} onChange={setKey} onDirChange={setDir} />
            </div>

            {sorted.length === 0 ? (
              <EmptyState
                tone="neutral"
                icon={<SearchX size={26} />}
                title="Nada encontrado"
                description="Não achamos contratos com esses filtros."
                action={<Button variant="outline" onClick={() => { setSearch(''); setTypeFilter('todos'); }}>Limpar filtros</Button>}
              />
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Contratos de empréstimo e financiamento</caption>
                    <thead>
                      <tr className="border-b border-line text-left">
                        <th scope="col" className="min-w-52 px-5 py-3"><SortHeader label="Contrato" active={key === 'description'} dir={dir} onClick={() => toggle('description')} /></th>
                        <th scope="col" className="px-2 py-3"><span className="t-label">Status</span></th>
                        <th scope="col" className="min-w-44 px-3 py-3"><SortHeader label="Progresso" active={key === 'progress'} dir={dir} onClick={() => toggle('progress')} /></th>
                        <th scope="col" className="px-2 py-3 text-right"><SortHeader label="Parcela" active={key === 'amount'} dir={dir} onClick={() => toggle('amount')} /></th>
                        <th scope="col" className="px-2 py-3 text-right"><SortHeader label="Falta" active={key === 'remaining'} dir={dir} onClick={() => toggle('remaining')} /></th>
                        <th scope="col" className="px-5 py-3"><span className="sr-only">Ações</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((loan) => {
                        const st = loanStatus(loan);
                        const pct = progressOf(loan);
                        const done = st.status === 'quitado';
                        const meta = TYPE_META[loan.expense_type];
                        return (
                          <tr key={loan.loan_id} className="interactive border-b border-line align-middle last:border-0 hover:bg-surface-2">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-3 text-lg" aria-hidden="true">{meta.icon}</span>
                                <div className="min-w-0">
                                  <p className="font-semibold text-ink [overflow-wrap:anywhere]">{loan.description}</p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <Avatar name={loan.user_name} color={loan.avatar_color} size="sm" />
                                    <span className="t-support max-w-24 truncate" title={loan.user_name}>{loan.user_name}</span>
                                    <Badge variant={meta.badge}>{meta.label}</Badge>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3"><StatusBadge status={st.status} label={st.label} /></td>
                            <td className="px-2 py-3">
                              <div className="flex items-center justify-between text-xs text-ink-2">
                                <span className="num">{loan.current_installment}/{loan.total_installments}</span>
                                <span className="num font-bold text-ink">{pct.toFixed(0)}%</span>
                              </div>
                              <Progress value={pct} gradient className="mt-1" aria-label={`${loan.description}: ${pct.toFixed(0)}% pago`} />
                            </td>
                            <td className="num whitespace-nowrap px-2 py-3 text-right font-semibold text-ink">{formatCurrency(loan.amount)}</td>
                            <td className={cn('num whitespace-nowrap px-2 py-3 text-right font-bold', done ? 'text-positive' : 'text-negative')}>
                              {done ? 'Quitado 🎉' : formatCurrency(loan.remaining_amount)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2">
                                {!done && <Button size="sm" onClick={() => openInstallModal(loan)}><Plus /> Parcela</Button>}
                                <Button size="sm" variant="outline" loading={detailLoadingId === loan.loan_id} onClick={() => openDetail(loan.loan_id)}
                                  aria-label={`Ver detalhes de ${loan.description}`}>Detalhes</Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <ul className="divide-y divide-line md:hidden">
                  {sorted.map((loan) => {
                    const st = loanStatus(loan);
                    const pct = progressOf(loan);
                    const done = st.status === 'quitado';
                    const meta = TYPE_META[loan.expense_type];
                    return (
                      <li key={loan.loan_id} className="space-y-3 p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-3 text-lg" aria-hidden="true">{meta.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-ink [overflow-wrap:anywhere]">{loan.description}</p>
                            <p className="t-support">{loan.user_name} · {meta.label}</p>
                          </div>
                          <StatusBadge status={st.status} label={st.label} />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-ink-2">
                            <span className="num">{loan.current_installment}/{loan.total_installments} parcelas</span>
                            <span className="num font-bold text-ink">{pct.toFixed(0)}%</span>
                          </div>
                          <Progress value={pct} gradient className="mt-1" aria-label={`${loan.description}: ${pct.toFixed(0)}% pago`} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-md bg-surface-2 p-2"><p className="t-label">Parcela</p><p className="num text-sm font-bold">{formatCurrency(loan.amount)}</p></div>
                          <div className="rounded-md bg-primary-soft p-2"><p className="t-label text-positive">Pago</p><p className="num text-sm font-bold text-positive">{formatCurrency(loan.total_paid)}</p></div>
                          <div className={cn('rounded-md p-2', done ? 'bg-primary-soft' : 'bg-negative-soft')}>
                            <p className={cn('t-label', done ? 'text-positive' : 'text-negative')}>{done ? 'Quitado' : 'Falta'}</p>
                            <p className={cn('num text-sm font-bold', done ? 'text-positive' : 'text-negative')}>{done ? '🎉' : formatCurrency(loan.remaining_amount)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!done && <Button className="flex-1" onClick={() => openInstallModal(loan)}><Plus /> Registrar parcela</Button>}
                          <Button className="flex-1" variant="outline" loading={detailLoadingId === loan.loan_id} onClick={() => openDetail(loan.loan_id)}>Detalhes</Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Card>
        </>
      )}

      {/* Detalhe */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={selected?.description ?? 'Detalhes'} size="lg">
        {selected && <LoanDetailBody detail={selected} onRegister={() => openInstallModal(selected)} />}
      </Modal>

      {/* Nova parcela */}
      <Modal isOpen={installModalOpen} onClose={() => setInstallModalOpen(false)} title="Registrar próxima parcela" description="Pressione Enter para salvar." size="sm">
        {installLoan && (
          <form onSubmit={handleRegisterInstallment} className="space-y-4" noValidate>
            <div className="rounded-md bg-surface-2 p-4">
              <p className="mb-1 text-sm font-semibold text-ink [overflow-wrap:anywhere]">{installLoan.description}</p>
              <div className="mb-2 flex items-center justify-between text-xs text-ink-2">
                <span>Atual: <strong className="num">{installLoan.current_installment}/{installLoan.total_installments}</strong></span>
                <Badge variant={TYPE_META[installLoan.expense_type].badge}>
                  Próxima: {installLoan.current_installment + 1}/{installLoan.total_installments}
                </Badge>
              </div>
              <Progress value={progressOf(installLoan)} gradient aria-label="Progresso do contrato" />
            </div>

            {installLoan.current_installment >= installLoan.total_installments ? (
              <div className="flex items-center gap-2 rounded-md bg-primary-soft p-3 text-primary">
                <PartyPopper size={18} aria-hidden="true" />
                <p className="text-sm font-semibold">Todas as parcelas já foram registradas. Parabéns!</p>
              </div>
            ) : (
              <>
                <Field label="Valor da parcela" required error={installError} hint="Já preenchido. Altere se o valor mudou.">
                  <CurrencyInput value={installAmount} onChange={setInstallAmount} />
                </Field>
                <Field label="Data do pagamento" required>
                  <Input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} required />
                </Field>
                <Field label="Observação">
                  <Input value={installNotes} onChange={(e) => setInstallNotes(e.target.value)} placeholder="Ex.: Pago via Pix" />
                </Field>
                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setInstallModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1" loading={installSaving}>{installSaving ? 'Registrando…' : 'Registrar'}</Button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}

function LoanDetailBody({ detail, onRegister }: { detail: LoanDetail; onRegister: () => void }) {
  const isFinished = detail.current_installment >= detail.total_installments;
  const cat = EXPENSE_CATEGORIES.find((c) => c.value === detail.category);
  const meta = TYPE_META[detail.expense_type];
  const st = loanStatus(detail);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={meta.badge}>{meta.icon} {meta.label}</Badge>
        <StatusBadge status={st.status} label={st.label} />
        <Badge variant="secondary">{cat?.icon} {cat?.label || detail.category}</Badge>
        <span className="flex items-center gap-1.5 text-sm text-ink-2">
          <Avatar name={detail.user_name} color={detail.avatar_color} size="sm" /> {detail.user_name}
        </span>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink-2">Progresso</span>
          <span className="t-value">{detail.progress_pct.toFixed(1)}%</span>
        </div>
        <Progress value={detail.progress_pct} gradient className="h-4" aria-label={`Progresso: ${detail.progress_pct.toFixed(1)}%`} />
        <p className="num mt-1 text-xs text-ink-3">{detail.current_installment} de {detail.total_installments} parcelas</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<PiggyBank size={16} />} label="Total do contrato" value={formatCurrency(detail.total_amount)} />
        <Stat icon={<CheckCircle2 size={16} />} label="Valor pago" value={formatCurrency(detail.total_paid)} tone="positive" />
        <Stat icon={<TrendingDown size={16} />} label="Valor restante" value={isFinished ? 'Quitado 🎉' : formatCurrency(detail.remaining_amount)} tone={isFinished ? 'positive' : 'negative'} />
        <Stat icon={<Clock size={16} />} label="Parcelas restantes" value={isFinished ? 'Concluído' : `${detail.remaining_installments}x de ${formatCurrency(detail.amount)}`} tone={isFinished ? 'positive' : 'warning'} />
      </div>

      <div className="flex items-center gap-3 rounded-md border border-line bg-surface-2 p-3">
        <CalendarCheck size={20} className="text-primary" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold text-ink-2">{isFinished ? 'Contrato quitado!' : 'Previsão de quitação'}</p>
          <p className="text-sm font-bold text-ink">
            {isFinished ? `Concluído em ${formatMonthYear(detail.last_date)}` : detail.estimated_end_date ? formatMonthYear(detail.estimated_end_date) : 'Registre mais parcelas'}
          </p>
        </div>
        <p className="t-support ml-auto hidden text-right sm:block">
          Início {formatMonthYear(detail.first_date)}<br />Último pagamento {formatDate(detail.last_date)}
        </p>
      </div>

      {!isFinished && <Button className="w-full" onClick={onRegister}><Plus /> Registrar próxima parcela</Button>}

      {detail.installments.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Histórico de parcelas</h3>
          <ul className="scrollbar-thin max-h-60 space-y-1.5 overflow-y-auto pr-1">
            {[...detail.installments].reverse().map((inst) => (
              <li key={inst.id} className="flex items-center gap-3 rounded-md bg-surface-2 p-2.5">
                <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">{inst.current_installment}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink">Parcela {inst.current_installment}/{inst.total_installments}</span>
                    <span className="num text-sm font-bold text-ink">{formatCurrency(inst.amount)}</span>
                  </div>
                  <p className="t-support num truncate">{formatDate(inst.date)}{inst.notes ? ` · ${inst.notes}` : ''}</p>
                </div>
                <CheckCircle2 size={16} className="shrink-0 text-positive" aria-label="Paga" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'positive' | 'negative' | 'warning' }) {
  const color = tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : tone === 'warning' ? 'text-warning' : 'text-ink';
  const bg = tone === 'positive' ? 'bg-primary-soft' : tone === 'negative' ? 'bg-negative-soft' : tone === 'warning' ? 'bg-warning-soft' : 'bg-surface-2';
  return (
    <div className={cn('rounded-md p-3', bg)}>
      <div className={cn('mb-1 flex items-center gap-1.5', color)}>
        <span aria-hidden="true">{icon}</span>
        <span className="t-label" style={{ color: 'inherit' }}>{label}</span>
      </div>
      <p className={cn('num text-sm font-bold', color)}>{value}</p>
    </div>
  );
}
