'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, SearchX, TrendingUp, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { type Income, INCOME_CATEGORIES, MONTHS } from '../types';
import { usePeriod } from '../hooks/usePeriod';
import { useSort } from '../hooks/useSort';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, normalize } from '../lib/format';
import PageHeader from '../components/ui/PageHeader';
import PeriodSelector from '../components/ui/PeriodSelector';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CurrencyInput from '../components/ui/CurrencyInput';
import Avatar from '../components/ui/Avatar';
import Field from '../components/ui/Field';
import RowActions from '../components/ui/RowActions';
import EmptyState, { ErrorState } from '../components/ui/EmptyState';
import { SkeletonRows } from '../components/ui/Skeleton';
import { SearchInput, SortHeader, SortSelect } from '../components/ui/ListControls';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

interface IncomeSummary { user_id: string; user_name: string; avatar_color: string; total: number }
type SortKey = 'person' | 'description' | 'category' | 'amount';

const SORT_LABELS: { value: SortKey; label: string }[] = [
  { value: 'amount', label: 'Valor' },
  { value: 'description', label: 'Descrição' },
  { value: 'category', label: 'Categoria' },
  { value: 'person', label: 'Pessoa' },
];

export default function Incomes() {
  const { user, partner } = useAuth();
  const { month, year, prevMonth, nextMonth, goToday, isCurrentMonth } = usePeriod();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [summary, setSummary] = useState<IncomeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('salário');
  const [errors, setErrors] = useState<{ description?: string; amount?: string }>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Income | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.get(`/incomes?month=${month}&year=${year}`)
      .then((res) => { if (!cancelled) { setIncomes(res.data.incomes); setSummary(res.data.summary); } })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, year, reload]);

  const refetch = () => setReload((n) => n + 1);

  function openCreate() {
    setEditing(null); setDescription(''); setAmount(''); setCategory('salário'); setErrors({});
    setModalOpen(true);
  }

  function openEdit(income: Income) {
    setEditing(income); setDescription(income.description); setAmount(income.amount.toString());
    setCategory(income.category); setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!description.trim()) next.description = 'Conte de onde veio esse dinheiro.';
    if (!amount || parseFloat(amount) <= 0) next.amount = 'Informe um valor maior que zero.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/incomes/${editing.id}`, { description, amount: parseFloat(amount), category });
        toast.success('Renda atualizada!');
      } else {
        await api.post('/incomes', { description, amount: parseFloat(amount), category, month, year });
        toast.success('Renda adicionada. Que bom!');
      }
      setModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      toast.error(e2.response?.data?.error || 'Não deu para salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/incomes/${toDelete.id}`);
      toast.success('Renda removida');
      setToDelete(null);
      refetch();
    } catch {
      toast.error('Não conseguimos remover agora. Tente de novo.');
    } finally {
      setDeleting(false);
    }
  }

  const totalIncome = summary.reduce((s, p) => s + p.total, 0);

  // Os dois parceiros sempre aparecem, mesmo com R$ 0,00
  const people = useMemo(() => {
    const base = [user, partner].filter(Boolean).map((u) => ({ id: u!.id, name: u!.name, color: u!.avatarColor }));
    return base.map((p) => ({ ...p, total: summary.find((s) => s.user_id === p.id)?.total ?? 0 }));
  }, [user, partner, summary]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return incomes.filter((i) => {
      if (catFilter && i.category !== catFilter) return false;
      if (!q) return true;
      return normalize(`${i.description} ${i.user_name} ${i.category}`).includes(q);
    });
  }, [incomes, search, catFilter]);

  const { sorted, key, dir, toggle, setKey, setDir } = useSort<Income, SortKey>(
    filtered, 'amount',
    {
      person: (i) => i.user_name,
      description: (i) => i.description,
      category: (i) => i.category,
      amount: (i) => i.amount,
    }
  );

  const catLabel = (v: string) => INCOME_CATEGORIES.find((c) => c.value === v);

  return (
    <div className="space-y-6">
      <PageHeader title="Rendas" subtitle="Tudo que entra para o casal, em um só lugar">
        <PeriodSelector month={month} year={year} onPrev={prevMonth} onNext={nextMonth} onToday={goToday} isCurrent={isCurrentMonth} />
        <Button onClick={openCreate}><Plus /> Nova renda</Button>
      </PageHeader>

      {/* Resumo */}
      {!error && (
        <section aria-label="Resumo das rendas" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-transparent bg-gradient-to-br from-brand-navy to-brand-navy-light p-5 text-white shadow-pop sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between">
              <p className="t-label text-white/80">Total do casal</p>
              <Wallet size={18} className="text-white/80" aria-hidden="true" />
            </div>
            <p className="t-value-xl mt-2">{formatCurrency(totalIncome)}</p>
            <p className="mt-1 text-sm text-white/80">{MONTHS[month - 1]} de {year}</p>
          </Card>
          {people.map((p) => (
            <Card key={p.id} className="p-5" style={{ borderTop: `3px solid ${p.color}` }}>
              <div className="flex items-center gap-2">
                <Avatar userId={p.id} name={p.name} color={p.color} size="sm" />
                <span className="text-sm font-medium text-ink [overflow-wrap:anywhere] line-clamp-1">{p.name}</span>
              </div>
              <p className="t-value mt-3">{formatCurrency(p.total)}</p>
              <p className="t-support mt-0.5">{totalIncome > 0 ? `${((p.total / totalIncome) * 100).toFixed(0)}% do total` : 'Sem rendas neste mês'}</p>
            </Card>
          ))}
        </section>
      )}

      <Card className="overflow-hidden">
        {/* Ferramentas */}
        {!error && incomes.length > 0 && (
          <div className="space-y-3 border-b border-line p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por descrição ou pessoa" label="Buscar rendas" />
              <div className="sm:w-56">
                <Select aria-label="Filtrar por categoria" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                  <option value="">Todas as categorias</option>
                  {INCOME_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </Select>
              </div>
              <p className="t-support sm:ml-auto" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'renda' : 'rendas'}</p>
            </div>
            <SortSelect value={key} dir={dir} options={SORT_LABELS} onChange={setKey} onDirChange={setDir} />
          </div>
        )}

        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : incomes.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={26} />}
            title={`Nenhuma renda em ${MONTHS[month - 1]}`}
            description="Registrem salários, extras e outros ganhos para enxergar quanto entra por mês."
            action={<Button onClick={openCreate}><Plus /> Adicionar renda</Button>}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            tone="neutral"
            icon={<SearchX size={26} />}
            title="Nada encontrado"
            description="Não achamos rendas com esses filtros."
            action={<Button variant="outline" onClick={() => { setSearch(''); setCatFilter(''); }}>Limpar filtros</Button>}
          />
        ) : (
          <>
            {/* Desktop: tabela */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Rendas de {MONTHS[month - 1]} de {year}</caption>
                <thead>
                  <tr className="border-b border-line text-left">
                    <th scope="col" className="px-5 py-3"><SortHeader label="Descrição" active={key === 'description'} dir={dir} onClick={() => toggle('description')} /></th>
                    <th scope="col" className="px-3 py-3"><SortHeader label="Pessoa" active={key === 'person'} dir={dir} onClick={() => toggle('person')} /></th>
                    <th scope="col" className="px-3 py-3"><SortHeader label="Categoria" active={key === 'category'} dir={dir} onClick={() => toggle('category')} /></th>
                    <th scope="col" className="px-3 py-3 text-right"><SortHeader label="Valor" active={key === 'amount'} dir={dir} onClick={() => toggle('amount')} /></th>
                    <th scope="col" className="w-24 px-5 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((income) => {
                    const cat = catLabel(income.category);
                    const own = income.user_id === user?.id;
                    return (
                      <tr key={income.id} className="interactive border-b border-line last:border-0 hover:bg-surface-2">
                        <td className="px-5 py-3 font-medium text-ink">{income.description}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar userId={income.user_id} name={income.user_name} color={income.avatar_color} size="sm" />
                            <span className="text-ink-2">{income.user_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3"><Badge variant="success">{cat?.icon} {cat?.label || income.category}</Badge></td>
                        <td className="num px-3 py-3 text-right font-bold text-positive">{formatCurrency(income.amount)}</td>
                        <td className="px-5 py-3">{own && <RowActions what={`renda ${income.description}`} onEdit={() => openEdit(income)} onDelete={() => setToDelete(income)} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <ul className="divide-y divide-line md:hidden">
              {sorted.map((income) => {
                const cat = catLabel(income.category);
                const own = income.user_id === user?.id;
                return (
                  <li key={income.id} className="flex items-start gap-3 p-4">
                    <Avatar userId={income.user_id} name={income.user_name} color={income.avatar_color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink [overflow-wrap:anywhere]">{income.description}</p>
                      <p className="t-support">{income.user_name}</p>
                      <div className="mt-2"><Badge variant="success">{cat?.icon} {cat?.label || income.category}</Badge></div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="num font-bold text-positive">{formatCurrency(income.amount)}</span>
                      {own && <RowActions what={`renda ${income.description}`} onEdit={() => openEdit(income)} onDelete={() => setToDelete(income)} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar renda' : 'Nova renda'} description="Pressione Enter para salvar.">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Descrição" required error={errors.description}>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Salário de novembro" />
          </Field>
          <Field label="Valor" required error={errors.amount}>
            <CurrencyInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="Categoria">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {INCOME_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </Select>
          </Field>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>{saving ? 'Salvando…' : editing ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remover esta renda?"
        description={toDelete ? `“${toDelete.description}” (${formatCurrency(toDelete.amount)}) será removida. Essa ação não pode ser desfeita.` : ''}
        confirmLabel="Remover"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
