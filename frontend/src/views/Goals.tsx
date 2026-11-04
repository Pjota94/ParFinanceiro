'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Sparkles, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { type Goal, type GoalContribution, GOAL_CATEGORIES } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { forecast } from '../lib/goals';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CurrencyInput from '../components/ui/CurrencyInput';
import Avatar from '../components/ui/Avatar';
import Field from '../components/ui/Field';
import Tabs from '../components/ui/Tabs';
import RowActions from '../components/ui/RowActions';
import EmptyState, { ErrorState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/button';
import { Input, Textarea } from '../components/ui/input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

const PRIORITY_BADGE: Record<string, 'destructive' | 'warning' | 'success'> = {
  alta: 'destructive',
  média: 'warning',
  baixa: 'success',
};

const GOAL_COLORS = [
  { value: '#14A06A', name: 'Verde' },
  { value: '#1B2D5B', name: 'Azul-marinho' },
  { value: '#0EA5E9', name: 'Azul-claro' },
  { value: '#4F46E5', name: 'Índigo' },
  { value: '#F59E0B', name: 'Âmbar' },
  { value: '#DB2777', name: 'Rosa' },
  { value: '#8B5CF6', name: 'Roxo' },
  { value: '#F97316', name: 'Laranja' },
];

type StatusFilter = 'ativo' | 'concluído' | 'pausado' | 'todos';
type GoalDetail = Goal & { contributions: GoalContribution[]; byUser: { user_id: string; user_name: string; avatar_color: string; total: number }[] };

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('ativo');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [detailGoal, setDetailGoal] = useState<GoalDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeNotes, setContributeNotes] = useState('');
  const [contributeError, setContributeError] = useState<string>();
  const [contributeSaving, setContributeSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState('sonho');
  const [priority, setPriority] = useState('média');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#14A06A');
  const [icon, setIcon] = useState('⭐');
  const [errors, setErrors] = useState<{ title?: string; target?: string }>({});
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.get(`/goals${filterStatus !== 'todos' ? `?status=${filterStatus}` : ''}`)
      .then((res) => { if (!cancelled) setGoals(res.data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filterStatus, reload]);

  const refetch = () => setReload((n) => n + 1);

  function openCreate() {
    setEditing(null);
    setTitle(''); setDescription(''); setTargetAmount(''); setCategory('sonho');
    setPriority('média'); setDeadline(''); setColor('#14A06A'); setIcon('⭐'); setErrors({});
    setModalOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setTitle(goal.title); setDescription(goal.description || '');
    setTargetAmount(goal.target_amount.toString()); setCategory(goal.category);
    setPriority(goal.priority); setDeadline(goal.deadline || '');
    setColor(goal.color); setIcon(goal.icon); setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Dê um nome para o sonho de vocês.';
    if (!targetAmount || parseFloat(targetAmount) <= 0) next.target = 'Informe o valor que querem juntar.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const body = { title, description, targetAmount: parseFloat(targetAmount), category, priority, deadline, color, icon };
    try {
      if (editing) {
        await api.put(`/goals/${editing.id}`, body);
        toast.success('Meta atualizada!');
      } else {
        await api.post('/goals', body);
        toast.success('Meta criada. Bora realizar! 🌟');
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
      await api.delete(`/goals/${toDelete.id}`);
      toast.success('Meta removida');
      setToDelete(null);
      refetch();
    } catch { toast.error('Não conseguimos remover agora. Tente de novo.'); }
    finally { setDeleting(false); }
  }

  async function openDetail(goal: Goal) {
    try {
      const res = await api.get(`/goals/${goal.id}`);
      setDetailGoal(res.data);
      setDetailOpen(true);
    } catch { toast.error('Não conseguimos abrir o histórico agora.'); }
  }

  function openContribute(goal: Goal) {
    setContributeGoal(goal); setContributeAmount(''); setContributeNotes(''); setContributeError(undefined);
    setContributeOpen(true);
  }

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault();
    if (!contributeAmount || parseFloat(contributeAmount) <= 0) { setContributeError('Informe quanto vão guardar.'); return; }
    setContributeError(undefined);
    setContributeSaving(true);
    try {
      await api.post(`/goals/${contributeGoal!.id}/contributions`, { amount: parseFloat(contributeAmount), notes: contributeNotes });
      toast.success('Aporte registrado. Cada passo conta! 🎉');
      setContributeOpen(false);
      refetch();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      toast.error(e2.response?.data?.error || 'Não deu para registrar o aporte.');
    } finally {
      setContributeSaving(false);
    }
  }

  const catIcon = (cat: string) => GOAL_CATEGORIES.find((c) => c.value === cat)?.icon || '🎯';

  return (
    <div className="space-y-6">
      <PageHeader title="Metas & Sonhos" subtitle="Os objetivos do casal em um só lugar">
        <Button onClick={openCreate}><Plus /> Nova meta</Button>
      </PageHeader>

      <Tabs
        aria-label="Situação das metas"
        value={filterStatus}
        onChange={setFilterStatus}
        items={[
          { value: 'ativo', label: 'Ativas' },
          { value: 'concluído', label: 'Concluídas' },
          { value: 'pausado', label: 'Pausadas' },
          { value: 'todos', label: 'Todas' },
        ]}
      />

      {loading ? (
        <div role="status" aria-label="Carregando metas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="space-y-4 p-5"><Skeleton className="h-12 w-3/4" /><Skeleton className="h-3" /><Skeleton className="h-9" /></Card>)}
        </div>
      ) : error ? (
        <Card><ErrorState onRetry={refetch} /></Card>
      ) : goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Target size={26} />}
            title={filterStatus === 'ativo' || filterStatus === 'todos' ? 'Que tal sonhar junto?' : 'Nada por aqui ainda'}
            description={filterStatus === 'ativo' || filterStatus === 'todos'
              ? 'Criem metas como viagem, casa própria, casamento ou reserva de emergência e acompanhem o progresso do casal.'
              : 'Nenhuma meta nessa situação.'}
            action={<Button onClick={openCreate}><Plus /> Criar meta</Button>}
          />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {goals.map((goal) => {
            const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
            const eta = forecast(goal);
            return (
              <li key={goal.id}>
                <Card className="interactive flex h-full flex-col overflow-hidden hover:shadow-pop">
                  <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${goal.color}, #2DC97E)` }} aria-hidden="true" />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg text-2xl" style={{ backgroundColor: `${goal.color}22` }} aria-hidden="true">{goal.icon}</span>
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-tight text-ink [overflow-wrap:anywhere] line-clamp-2">{goal.title}</h3>
                          <p className="t-support capitalize">{catIcon(goal.category)} {goal.category}</p>
                        </div>
                      </div>
                      <RowActions what={`meta ${goal.title}`} onEdit={() => openEdit(goal)} onDelete={() => setToDelete(goal)} />
                    </div>

                    {goal.description && <p className="mt-3 text-sm text-ink-2 line-clamp-2">{goal.description}</p>}

                    <div className="mt-4 flex-1">
                      {pct === 0 && goal.status === 'ativo' ? (
                        <div className="rounded-md bg-primary-soft p-3">
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary"><Sparkles size={15} aria-hidden="true" /> Todo sonho começa com o primeiro passo</p>
                          <p className="num mt-0.5 text-xs text-ink-2">Meta de {formatCurrency(goal.target_amount)}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="num text-sm text-ink-2"><span className="font-bold text-ink">{formatCurrency(goal.current_amount)}</span> de {formatCurrency(goal.target_amount)}</p>
                            <span className="num text-sm font-bold text-ink">{pct.toFixed(0)}%</span>
                          </div>
                          <Progress value={pct} indicatorColor={goal.color} gradient className="h-3" aria-label={`${goal.title}: ${pct.toFixed(0)}% concluído`} />
                          <p className="num text-xs text-ink-3">{pct >= 100 ? 'Meta alcançada! 🎉' : `Faltam ${formatCurrency(remaining)}`}</p>
                          {pct < 100 && (
                            <p className="flex items-center gap-1.5 text-xs text-ink-3">
                              <CalendarCheck size={13} aria-hidden="true" />
                              {eta ? <>Previsão: <span className="font-semibold text-ink-2">{eta}</span></> : 'Continuem aportando para ver a previsão'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant={PRIORITY_BADGE[goal.priority] ?? 'secondary'}>Prioridade {goal.priority}</Badge>
                      {goal.deadline && <Badge variant="secondary">📅 até {formatDate(goal.deadline)}</Badge>}
                      {goal.status === 'concluído' && <Badge variant="success">✅ Concluída</Badge>}
                      {goal.status === 'pausado' && <Badge variant="secondary">⏸️ Pausada</Badge>}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {goal.status === 'ativo' && (
                        <Button size="sm" className="flex-1" onClick={() => openContribute(goal)}>
                          {pct === 0 ? 'Faça seu primeiro aporte' : 'Contribuir'}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openDetail(goal)}>Ver histórico</Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* Criar/editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar meta' : 'Nova meta ou sonho'} description="Pressione Enter para salvar." size="lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Título" required error={errors.title}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Viagem para a Europa" />
          </Field>
          <Field label="Descrição">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Conte mais sobre esse sonho…" rows={2} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor da meta" required error={errors.target}>
              <CurrencyInput value={targetAmount} onChange={setTargetAmount} />
            </Field>
            <Field label="Prazo (opcional)">
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
            <Field label="Categoria">
              <Select
                value={category}
                onChange={(e) => { setCategory(e.target.value); const c = GOAL_CATEGORIES.find((c) => c.value === e.target.value); if (c) setIcon(c.icon); }}
              >
                {GOAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </Select>
            </Field>
            <Field label="Prioridade">
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="alta">Alta</option>
                <option value="média">Média</option>
                <option value="baixa">Baixa</option>
              </Select>
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Cor</legend>
              <div className="flex flex-wrap gap-1">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={c.name}
                    aria-pressed={color === c.value}
                    onClick={() => setColor(c.value)}
                    className="flex size-11 items-center justify-center rounded-full"
                  >
                    <span className={cn('size-7 rounded-full transition-transform', color === c.value && 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-surface')} style={{ backgroundColor: c.value }} />
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="Ícone (emoji)">
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2} className="text-center text-xl" />
            </Field>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>{saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar meta'}</Button>
          </div>
        </form>
      </Modal>

      {/* Aporte */}
      <Modal isOpen={contributeOpen} onClose={() => setContributeOpen(false)} title={`Contribuir: ${contributeGoal?.title ?? ''}`} description="Pressione Enter para salvar." size="sm">
        {contributeGoal && (
          <form onSubmit={handleContribute} className="space-y-4" noValidate>
            <div className="flex items-center gap-3 rounded-md bg-surface-2 p-3">
              <span className="text-2xl" aria-hidden="true">{contributeGoal.icon}</span>
              <div className="flex-1">
                <div className="num mb-1 flex justify-between text-xs text-ink-2">
                  <span>{formatCurrency(contributeGoal.current_amount)}</span>
                  <span>{formatCurrency(contributeGoal.target_amount)}</span>
                </div>
                <Progress value={Math.min((contributeGoal.current_amount / contributeGoal.target_amount) * 100, 100)} indicatorColor={contributeGoal.color} gradient aria-label="Progresso da meta" />
              </div>
            </div>
            <Field label="Quanto vão guardar?" required error={contributeError}>
              <CurrencyInput value={contributeAmount} onChange={setContributeAmount} />
            </Field>
            <Field label="Observação">
              <Input value={contributeNotes} onChange={(e) => setContributeNotes(e.target.value)} placeholder="Ex.: Sobra do salário" />
            </Field>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setContributeOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" loading={contributeSaving}>{contributeSaving ? 'Salvando…' : 'Contribuir'}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Histórico */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Histórico de aportes">
        {detailGoal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-md bg-surface-2 p-4">
              <span className="text-3xl" aria-hidden="true">{detailGoal.icon}</span>
              <div>
                <h3 className="font-semibold text-ink">{detailGoal.title}</h3>
                <p className="num text-sm text-ink-2">{formatCurrency(detailGoal.current_amount)} de {formatCurrency(detailGoal.target_amount)}</p>
              </div>
            </div>
            {detailGoal.byUser?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-ink">Quem guardou quanto</h4>
                {detailGoal.byUser.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between rounded-md bg-surface-2 p-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.user_name} color={u.avatar_color} size="sm" />
                      <span className="text-sm text-ink">{u.user_name}</span>
                    </div>
                    <span className="num text-sm font-bold text-positive">{formatCurrency(u.total)}</span>
                  </div>
                ))}
              </div>
            )}
            {detailGoal.contributions?.length > 0 ? (
              <ul className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto">
                {detailGoal.contributions.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-md border border-line p-3">
                    <Avatar name={c.user_name} color={c.avatar_color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="num text-sm font-semibold text-ink">{formatCurrency(c.amount)}</p>
                      <p className="t-support num">{c.user_name} · {new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                      {c.notes && <p className="mt-0.5 text-xs text-ink-2">{c.notes}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-support py-4 text-center">Nenhum aporte ainda. O primeiro é o mais importante!</p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remover esta meta?"
        description={toDelete ? `A meta “${toDelete.title}” e o histórico de aportes serão removidos. Essa ação não pode ser desfeita.` : ''}
        confirmLabel="Remover"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
