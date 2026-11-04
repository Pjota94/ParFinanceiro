'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Share2, CreditCard, Building2, RefreshCw, Hash, ExternalLink, SearchX, ShoppingCart, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import api from '../services/api';
import {
  type Expense,
  EXPENSE_CATEGORIES,
  EXPENSE_TYPES,
  RECURRENCE_OPTIONS,
  CREDIT_CARD_BANKS,
  MONTHS,
} from '../types';
import { usePeriod } from '../hooks/usePeriod';
import { useSort } from '../hooks/useSort';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, normalize } from '../lib/format';
import PageHeader from '../components/ui/PageHeader';
import PeriodSelector from '../components/ui/PeriodSelector';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CurrencyInput from '../components/ui/CurrencyInput';
import Avatar from '../components/ui/Avatar';
import Field from '../components/ui/Field';
import Tabs from '../components/ui/Tabs';
import RowActions from '../components/ui/RowActions';
import EmptyState, { ErrorState } from '../components/ui/EmptyState';
import { SkeletonRows } from '../components/ui/Skeleton';
import { SearchInput, SortHeader, SortSelect } from '../components/ui/ListControls';
import { Button } from '../components/ui/button';
import { Input, Textarea } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/card';
import { Badge, StatusBadge } from '../components/ui/badge';
import { cn } from '../lib/utils';

function getBankLabel(bank: string | null) {
  if (!bank) return null;
  return CREDIT_CARD_BANKS.find((b) => b.value === bank);
}

/** Pago = data de hoje ou anterior; Pendente = gasto com data futura. */
function expenseStatus(e: Expense): 'pago' | 'pendente' {
  if (!e.date) return 'pago';
  const today = new Date().toISOString().split('T')[0];
  return e.date > today ? 'pendente' : 'pago';
}

function ExpenseBadges({ expense }: { expense: Expense }) {
  const badges: React.ReactNode[] = [];
  const inst = expense.total_installments ? `${expense.current_installment}/${expense.total_installments}x` : null;

  if (expense.is_shared === 1) badges.push(<Badge key="shared" variant="blue"><Share2 size={11} aria-hidden="true" /> Compartilhado</Badge>);
  if (expense.expense_type === 'cartao') {
    const bank = getBankLabel(expense.credit_card_bank);
    badges.push(<Badge key="card" variant="purple"><CreditCard size={11} aria-hidden="true" />{bank ? bank.label : 'Cartão'}</Badge>);
  }
  if (expense.expense_type === 'financiamento') badges.push(<Badge key="fin" variant="warning"><Building2 size={11} aria-hidden="true" /> {inst ?? 'Financiamento'}</Badge>);
  if (expense.expense_type === 'emprestimo') badges.push(<Badge key="emp" variant="orange"><Hash size={11} aria-hidden="true" /> {inst ?? 'Empréstimo'}</Badge>);
  if (expense.recurrence === 'fixo') badges.push(<Badge key="fixo" variant="success"><RefreshCw size={11} aria-hidden="true" /> Fixo</Badge>);
  if (expense.recurrence === 'parcelado' && expense.expense_type === 'normal') badges.push(<Badge key="parc" variant="navy"><Hash size={11} aria-hidden="true" /> {inst ?? 'Parcelado'}</Badge>);
  return <>{badges}</>;
}

interface ByPerson { user_id: string; user_name: string; avatar_color: string; total: number }
interface ByCategory { category: string; total: number; count: number }

type FilterMode = 'todos' | 'cartao' | 'fixo' | 'financiamento' | 'emprestimo';
type SortKey = 'date' | 'description' | 'category' | 'amount';
type FormErrors = { description?: string; amount?: string; bank?: string; installments?: string };

const SORT_LABELS: { value: SortKey; label: string }[] = [
  { value: 'date', label: 'Data' },
  { value: 'amount', label: 'Valor' },
  { value: 'description', label: 'Descrição' },
  { value: 'category', label: 'Categoria' },
];

const optionCard = (selected: boolean) =>
  cn(
    'interactive rounded-md border-2 text-left',
    selected ? 'border-primary bg-primary-soft' : 'border-line hover:border-line-strong'
  );

export default function Expenses() {
  const { user, partner } = useAuth();
  const { month, year, prevMonth, nextMonth, goToday, isCurrentMonth } = usePeriod();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [byUser, setByUser] = useState<ByPerson[]>([]);
  const [byCategory, setByCategory] = useState<ByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('todos');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('alimentação');
  const [isShared, setIsShared] = useState(false);
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseType, setExpenseType] = useState<'normal' | 'cartao' | 'financiamento' | 'emprestimo'>('normal');
  const [recurrence, setRecurrence] = useState<'unico' | 'fixo' | 'parcelado'>('unico');
  const [creditCardBank, setCreditCardBank] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [currentInstallment, setCurrentInstallment] = useState('1');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.get(`/expenses?month=${month}&year=${year}`)
      .then((res) => {
        if (cancelled) return;
        setExpenses(res.data.expenses);
        setByUser(res.data.byUser);
        setByCategory(res.data.byCategory);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, year, reload]);

  const refetch = () => setReload((n) => n + 1);

  function resetForm() {
    setDescription(''); setAmount(''); setCategory('alimentação');
    setIsShared(false); setDate(new Date().toISOString().split('T')[0]); setNotes('');
    setExpenseType('normal'); setRecurrence('unico');
    setCreditCardBank(''); setTotalInstallments(''); setCurrentInstallment('1');
    setErrors({});
  }

  function openCreate() { setEditing(null); resetForm(); setModalOpen(true); }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setDescription(expense.description); setAmount(expense.amount.toString());
    setCategory(expense.category); setIsShared(expense.is_shared === 1);
    setDate(expense.date || ''); setNotes(expense.notes || '');
    setExpenseType(expense.expense_type || 'normal');
    setRecurrence(expense.recurrence || 'unico');
    setCreditCardBank(expense.credit_card_bank || '');
    setTotalInstallments(expense.total_installments?.toString() || '');
    setCurrentInstallment(expense.current_installment?.toString() || '1');
    setErrors({});
    setModalOpen(true);
  }

  const isLoanType = expenseType === 'financiamento' || expenseType === 'emprestimo';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: FormErrors = {};
    if (!description.trim()) next.description = 'Dê um nome para esse gasto.';
    if (!amount || parseFloat(amount) <= 0) next.amount = 'Informe um valor maior que zero.';
    if (expenseType === 'cartao' && !creditCardBank) next.bank = 'Escolha o banco do cartão.';
    if (isLoanType && !totalInstallments) next.installments = 'Informe quantas parcelas tem o contrato.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      description, amount: parseFloat(amount), category, isShared, date, notes, month, year,
      expenseType,
      recurrence: isLoanType ? 'parcelado' : recurrence,
      creditCardBank: expenseType === 'cartao' ? creditCardBank : null,
      totalInstallments: (isLoanType || recurrence === 'parcelado')
        ? (totalInstallments ? parseInt(totalInstallments) : null) : null,
      currentInstallment: parseInt(currentInstallment) || 1,
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, payload);
        toast.success('Gasto atualizado!');
      } else {
        await api.post('/expenses', payload);
        toast.success('Gasto adicionado!');
      }
      setModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      toast.error(e2.response?.data?.error || 'Não deu para salvar. Tente de novo.');
    } finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${toDelete.id}`);
      toast.success('Gasto removido');
      setToDelete(null);
      refetch();
    } catch { toast.error('Não conseguimos remover agora. Tente de novo.'); }
    finally { setDeleting(false); }
  }

  const totalExpenses = byUser.reduce((s, p) => s + p.total, 0);

  const people = useMemo(() => {
    const base = [user, partner].filter(Boolean).map((u) => ({ id: u!.id, name: u!.name, color: u!.avatarColor }));
    return base.map((p) => ({ ...p, total: byUser.find((s) => s.user_id === p.id)?.total ?? 0 }));
  }, [user, partner, byUser]);

  const modeCount = (m: FilterMode) =>
    expenses.filter((e) =>
      m === 'todos' ? true :
      m === 'cartao' ? e.expense_type === 'cartao' :
      m === 'fixo' ? e.recurrence === 'fixo' :
      e.expense_type === m
    ).length;

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return expenses.filter((e) => {
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterMode === 'cartao' && e.expense_type !== 'cartao') return false;
      if (filterMode === 'fixo' && e.recurrence !== 'fixo') return false;
      if (filterMode === 'financiamento' && e.expense_type !== 'financiamento') return false;
      if (filterMode === 'emprestimo' && e.expense_type !== 'emprestimo') return false;
      if (!q) return true;
      return normalize(`${e.description} ${e.user_name} ${e.category} ${e.notes ?? ''}`).includes(q);
    });
  }, [expenses, filterMode, filterCategory, search]);

  const { sorted, key, dir, toggle, setKey, setDir } = useSort<Expense, SortKey>(
    filtered, 'date',
    {
      date: (e) => e.date || '',
      description: (e) => e.description,
      category: (e) => e.category,
      amount: (e) => e.amount,
    }
  );

  const needsBank = expenseType === 'cartao';
  const needsInstallments = isLoanType || (expenseType === 'normal' && recurrence === 'parcelado');
  const showRecurrence = expenseType === 'normal';
  const catOf = (v: string) => EXPENSE_CATEGORIES.find((c) => c.value === v);

  const amountLabel = needsInstallments ? 'Valor da parcela' : expenseType === 'cartao' ? 'Valor da fatura' : 'Valor';

  return (
    <div className="space-y-6">
      <PageHeader title="Gastos" subtitle="Para onde o dinheiro do casal está indo">
        <PeriodSelector month={month} year={year} onPrev={prevMonth} onNext={nextMonth} onToday={goToday} isCurrent={isCurrentMonth} />
        <Button onClick={openCreate}><Plus /> Novo gasto</Button>
      </PageHeader>

      {!error && (
        <section aria-label="Resumo dos gastos" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-transparent bg-gradient-to-br from-brand-navy to-brand-navy-light p-5 text-white shadow-pop sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between">
              <p className="t-label text-white/80">Total de gastos</p>
              <Wallet size={18} className="text-white/80" aria-hidden="true" />
            </div>
            <p className="t-value-xl mt-2">{formatCurrency(totalExpenses)}</p>
            <p className="mt-1 text-sm text-white/80">{MONTHS[month - 1]} de {year}</p>
          </Card>
          {people.map((p) => (
            <Card key={p.id} className="p-5" style={{ borderTop: `3px solid ${p.color}` }}>
              <div className="flex items-center gap-2">
                <Avatar name={p.name} color={p.color} size="sm" />
                <span className="text-sm font-medium text-ink [overflow-wrap:anywhere] line-clamp-1">{p.name}</span>
              </div>
              <p className="t-value mt-3">{formatCurrency(p.total)}</p>
              <p className="t-support mt-0.5">{totalExpenses > 0 ? `${((p.total / totalExpenses) * 100).toFixed(0)}% do total` : 'Sem gastos neste mês'}</p>
            </Card>
          ))}
        </section>
      )}

      <Card className="overflow-hidden">
        {!error && expenses.length > 0 && (
          <div className="space-y-3 border-b border-line p-4">
            <Tabs
              aria-label="Tipo de gasto"
              value={filterMode}
              onChange={setFilterMode}
              items={[
                { value: 'todos', label: 'Todos', count: modeCount('todos') },
                { value: 'cartao', label: 'Cartão', count: modeCount('cartao') },
                { value: 'fixo', label: 'Fixos', count: modeCount('fixo') },
                { value: 'financiamento', label: 'Financiamentos', count: modeCount('financiamento') },
                { value: 'emprestimo', label: 'Empréstimos', count: modeCount('emprestimo') },
              ]}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por descrição ou pessoa" label="Buscar gastos" />
              <div className="sm:w-56">
                <Select aria-label="Filtrar por categoria" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="">Todas as categorias</option>
                  {byCategory.map((c) => {
                    const cat = catOf(c.category);
                    return <option key={c.category} value={c.category}>{cat?.icon} {cat?.label || c.category} ({c.count})</option>;
                  })}
                </Select>
              </div>
              <p className="t-support sm:ml-auto" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'gasto' : 'gastos'}</p>
            </div>
            <SortSelect value={key} dir={dir} options={SORT_LABELS} onChange={setKey} onDirChange={setDir} />
          </div>
        )}

        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : expenses.length === 0 ? (
          <EmptyState
            tone="negative"
            icon={<ShoppingCart size={26} />}
            title={`Nenhum gasto em ${MONTHS[month - 1]}`}
            description="Registrem os gastos com transparência: é o primeiro passo para o dinheiro render mais."
            action={<Button onClick={openCreate}><Plus /> Adicionar gasto</Button>}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            tone="neutral"
            icon={<SearchX size={26} />}
            title="Nada encontrado"
            description="Não achamos gastos com esses filtros."
            action={<Button variant="outline" onClick={() => { setSearch(''); setFilterCategory(''); setFilterMode('todos'); }}>Limpar filtros</Button>}
          />
        ) : (
          <>
            {/* Desktop: tabela */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Gastos de {MONTHS[month - 1]} de {year}</caption>
                <thead>
                  <tr className="border-b border-line text-left">
                    <th scope="col" className="px-5 py-3"><SortHeader label="Descrição" active={key === 'description'} dir={dir} onClick={() => toggle('description')} /></th>
                    <th scope="col" className="px-3 py-3"><SortHeader label="Data" active={key === 'date'} dir={dir} onClick={() => toggle('date')} /></th>
                    <th scope="col" className="px-3 py-3"><SortHeader label="Categoria" active={key === 'category'} dir={dir} onClick={() => toggle('category')} /></th>
                    <th scope="col" className="px-3 py-3"><span className="t-label">Status</span></th>
                    <th scope="col" className="px-3 py-3 text-right"><SortHeader label="Valor" active={key === 'amount'} dir={dir} onClick={() => toggle('amount')} /></th>
                    <th scope="col" className="w-32 px-5 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((expense) => {
                    const cat = catOf(expense.category);
                    const own = expense.user_id === user?.id;
                    const isLoan = expense.expense_type === 'financiamento' || expense.expense_type === 'emprestimo';
                    return (
                      <tr key={expense.id} className="interactive border-b border-line align-top last:border-0 hover:bg-surface-2">
                        <td className="px-5 py-3">
                          <div className="flex items-start gap-3">
                            <Avatar name={expense.user_name} color={expense.avatar_color} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-ink [overflow-wrap:anywhere]">{expense.description}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="t-support">{expense.user_name}</span>
                                <ExpenseBadges expense={expense} />
                              </div>
                              {expense.notes && <p className="t-support mt-1 max-w-sm line-clamp-1" title={expense.notes}>{expense.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="num whitespace-nowrap px-3 py-3 text-ink-2">{formatDate(expense.date)}</td>
                        <td className="px-3 py-3"><Badge variant="secondary">{cat?.icon} {cat?.label || expense.category}</Badge></td>
                        <td className="px-3 py-3"><StatusBadge status={expenseStatus(expense)} /></td>
                        <td className="num whitespace-nowrap px-3 py-3 text-right font-bold text-negative">{formatCurrency(expense.amount)}</td>
                        <td className="px-5 py-2">
                          {own && (
                            <div className="flex items-center justify-end">
                              {isLoan && (
                                <Link href="/emprestimos" aria-label={`Ver ${expense.description} em Empréstimos`} title="Ver em Empréstimos"
                                  className="interactive inline-flex size-9 items-center justify-center rounded-md text-ink-3 hover:bg-primary-soft hover:text-primary">
                                  <ExternalLink size={16} aria-hidden="true" />
                                </Link>
                              )}
                              <RowActions what={`gasto ${expense.description}`} onEdit={() => openEdit(expense)} onDelete={() => setToDelete(expense)} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <ul className="divide-y divide-line md:hidden">
              {sorted.map((expense) => {
                const cat = catOf(expense.category);
                const own = expense.user_id === user?.id;
                return (
                  <li key={expense.id} className="space-y-3 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={expense.user_name} color={expense.avatar_color} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink [overflow-wrap:anywhere]">{expense.description}</p>
                        <p className="t-support num">{expense.user_name} · {formatDate(expense.date)}</p>
                      </div>
                      <span className="num font-bold text-negative">{formatCurrency(expense.amount)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={expenseStatus(expense)} />
                      <Badge variant="secondary">{cat?.icon} {cat?.label || expense.category}</Badge>
                      <ExpenseBadges expense={expense} />
                    </div>
                    {expense.notes && <p className="t-support">{expense.notes}</p>}
                    {own && (
                      <div className="-mb-2 flex justify-end">
                        <RowActions what={`gasto ${expense.description}`} onEdit={() => openEdit(expense)} onDelete={() => setToDelete(expense)} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {/* Formulário */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar gasto' : 'Novo gasto'} description="Pressione Enter para salvar." size="lg">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Descrição e valor primeiro: o foco automático cai aqui */}
          <Field label="Descrição" required error={errors.description}>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                expenseType === 'cartao' ? 'Ex.: Fatura Nubank, novembro' :
                expenseType === 'financiamento' ? 'Ex.: Financiamento do carro' :
                expenseType === 'emprestimo' ? 'Ex.: Empréstimo pessoal' :
                'Ex.: Mercado da semana'
              }
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={amountLabel} required error={errors.amount}
              hint={totalInstallments && amount ? `Total do contrato: ${formatCurrency(parseFloat(amount) * parseInt(totalInstallments))}` : undefined}>
              <CurrencyInput value={amount} onChange={setAmount} />
            </Field>
            <Field label="Data">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          {/* Tipo de gasto */}
          <fieldset className="space-y-2">
            <legend><Label asChild><span>Tipo de gasto</span></Label></legend>
            <div className="grid grid-cols-2 gap-2">
              {EXPENSE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={expenseType === t.value}
                  onClick={() => {
                    setExpenseType(t.value as typeof expenseType);
                    setCreditCardBank(''); setTotalInstallments(''); setCurrentInstallment('1');
                    if (t.value !== 'normal') setRecurrence('unico');
                  }}
                  className={cn(optionCard(expenseType === t.value), 'flex min-h-14 items-start gap-3 p-3')}
                >
                  <span className="text-xl" aria-hidden="true">{t.icon}</span>
                  <span>
                    <span className={cn('block text-sm font-semibold', expenseType === t.value ? 'text-primary' : 'text-ink')}>{t.label}</span>
                    <span className="block text-xs leading-tight text-ink-3">{t.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {needsBank && (
            <fieldset className="space-y-2">
              <legend><Label asChild><span>Banco / cartão</span></Label></legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CREDIT_CARD_BANKS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    aria-pressed={creditCardBank === b.value}
                    onClick={() => setCreditCardBank(b.value)}
                    className={cn(optionCard(creditCardBank === b.value), 'flex min-h-14 flex-col items-center justify-center gap-1 p-2.5')}
                  >
                    <span className="text-xl" aria-hidden="true">{b.icon}</span>
                    <span className={cn('text-center text-xs font-medium leading-tight', creditCardBank === b.value ? 'text-primary' : 'text-ink-2')}>{b.label}</span>
                  </button>
                ))}
              </div>
              {errors.bank && <p role="alert" className="text-xs font-medium text-negative">{errors.bank}</p>}
            </fieldset>
          )}

          {showRecurrence && (
            <fieldset className="space-y-2">
              <legend><Label asChild><span>Recorrência</span></Label></legend>
              <div className="grid grid-cols-3 gap-2">
                {RECURRENCE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    aria-pressed={recurrence === r.value}
                    onClick={() => setRecurrence(r.value as typeof recurrence)}
                    className={cn(optionCard(recurrence === r.value), 'flex min-h-14 flex-col items-center gap-1 p-3 text-center')}
                  >
                    <span className="text-lg" aria-hidden="true">{r.icon}</span>
                    <span className={cn('text-xs font-semibold', recurrence === r.value ? 'text-primary' : 'text-ink')}>{r.label}</span>
                    <span className="hidden text-[11px] leading-tight text-ink-3 sm:block">{r.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {isLoanType && (
            <div className="flex items-start gap-2 rounded-md bg-neutral-soft p-3 text-sm text-neutral">
              <span aria-hidden="true">ℹ️</span>
              <p>
                <strong>{expenseType === 'financiamento' ? 'Financiamento' : 'Empréstimo'}</strong> é sempre parcelado.
                Informe o total de parcelas e em qual parcela vocês estão.
              </p>
            </div>
          )}

          {needsInstallments && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total de parcelas" required={isLoanType} error={errors.installments}>
                <Input type="number" inputMode="numeric" min="1" max="999" value={totalInstallments}
                  onChange={(e) => setTotalInstallments(e.target.value)} placeholder="Ex.: 36" />
              </Field>
              <Field label="Parcela atual">
                <Input type="number" inputMode="numeric" min="1" value={currentInstallment}
                  onChange={(e) => setCurrentInstallment(e.target.value)} placeholder="Ex.: 1" />
              </Field>
            </div>
          )}

          <Field label="Categoria">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </Select>
          </Field>

          <Field label="Observações">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes opcionais…" rows={2} />
          </Field>

          <button
            type="button"
            role="switch"
            aria-checked={isShared}
            onClick={() => setIsShared(!isShared)}
            className={cn(optionCard(isShared), 'flex min-h-14 w-full items-center gap-3 p-3')}
          >
            <Share2 size={18} className={isShared ? 'text-primary' : 'text-ink-3'} aria-hidden="true" />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-ink">Gasto compartilhado</span>
              <span className="block text-xs text-ink-3">Despesa conjunta do casal</span>
            </span>
            <span className={cn('relative h-6 w-11 rounded-full transition-colors', isShared ? 'bg-primary' : 'bg-line-strong')} aria-hidden="true">
              <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', isShared ? 'left-[22px]' : 'left-0.5')} />
            </span>
          </button>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>{saving ? 'Salvando…' : editing ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remover este gasto?"
        description={toDelete ? `“${toDelete.description}” (${formatCurrency(toDelete.amount)}) será removido. Essa ação não pode ser desfeita.` : ''}
        confirmLabel="Remover"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
