export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
}

export interface Couple {
  id: string;
  name: string;
}

export interface AuthState {
  user: User | null;
  couple: Couple | null;
  partner: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Income {
  id: string;
  couple_id: string;
  user_id: string;
  user_name: string;
  avatar_color: string;
  description: string;
  amount: number;
  category: string;
  month: number;
  year: number;
  created_at: string;
}

export interface Expense {
  id: string;
  couple_id: string;
  user_id: string;
  user_name: string;
  avatar_color: string;
  description: string;
  amount: number;
  category: string;
  is_shared: number;
  date: string;
  notes: string | null;
  month: number;
  year: number;
  // Tipo do gasto
  expense_type: 'normal' | 'cartao' | 'financiamento' | 'emprestimo';
  // Recorrência
  recurrence: 'unico' | 'fixo' | 'parcelado';
  // Cartão
  credit_card_bank: string | null;
  // Parcelamento
  total_installments: number | null;
  current_installment: number;
  // Agrupador de empréstimo/financiamento (todas as parcelas do mesmo contrato)
  loan_id: string | null;
  created_at: string;
  /** Último mês do gasto fixo (ano*12 + mês-1); null = sem data de término */
  recurrence_end?: number | null;
  /** Lançamento projetado (fixo/parcela futura), não existe no banco */
  projected?: boolean;
}

export interface Loan {
  loan_id: string;
  description: string;
  expense_type: 'financiamento' | 'emprestimo';
  amount: number;              // valor da parcela
  total_installments: number;
  current_installment: number; // parcela mais recente registrada
  total_paid: number;          // soma do que já foi lançado
  paid_installments: number;   // qtd de lançamentos feitos
  remaining_installments: number;
  total_amount: number;        // amount × total_installments
  remaining_amount: number;
  category: string;
  is_shared: number;
  user_id: string;
  user_name: string;
  avatar_color: string;
  first_date: string;          // data da primeira parcela
  last_date: string;           // data da última lançada
  notes: string | null;
}

export interface Goal {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  category: string;
  priority: string;
  deadline: string | null;
  status: string;
  color: string;
  icon: string;
  created_at: string;
  contributions_total?: number;
  contributions_count?: number;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  user_name: string;
  avatar_color: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface DashboardData {
  period: { month: number; year: number };
  members: User[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    savingsRate: number;
  };
  incomeByPerson: Array<{ user_id: string; name: string; avatar_color: string; total: number }>;
  expensesByPerson: Array<{ user_id: string; name: string; avatar_color: string; total: number }>;
  expensesByCategory: Array<{ category: string; total: number; count: number }>;
  last6Months: Array<{ month: number; year: number; label: string; income: number; expenses: number; balance: number }>;
  activeGoals: Goal[];
}

export const EXPENSE_CATEGORIES = [
  { value: 'moradia',           label: 'Moradia',           icon: '🏠' },
  { value: 'alimentação',       label: 'Alimentação',       icon: '🍽️' },
  { value: 'transporte',        label: 'Transporte',        icon: '🚗' },
  { value: 'saúde',             label: 'Saúde',             icon: '💊' },
  { value: 'educação',          label: 'Educação',          icon: '📚' },
  { value: 'lazer',             label: 'Lazer',             icon: '🎬' },
  { value: 'vestuário',         label: 'Vestuário',         icon: '👕' },
  { value: 'tecnologia',        label: 'Tecnologia',        icon: '💻' },
  { value: 'viagem',            label: 'Viagem',            icon: '✈️' },
  { value: 'pets',              label: 'Pets',              icon: '🐾' },
  { value: 'investimento',      label: 'Investimento',      icon: '📈' },
  { value: 'cartão de crédito', label: 'Cartão de Crédito', icon: '💳' },
  { value: 'financiamento',     label: 'Financiamento',     icon: '🏦' },
  { value: 'emprestimo',        label: 'Empréstimo',        icon: '🤝' },
  { value: 'outros',            label: 'Outros',            icon: '📌' },
];

// Tipos de gasto
export const EXPENSE_TYPES = [
  { value: 'normal',        label: 'Gasto Comum',        icon: '💳', description: 'Despesa avulsa ou do dia a dia' },
  { value: 'cartao',        label: 'Cartão de Crédito',  icon: '💳', description: 'Fatura ou compra no cartão' },
  { value: 'financiamento', label: 'Financiamento',      icon: '🏦', description: 'Financiamento com parcelas fixas' },
  { value: 'emprestimo',    label: 'Empréstimo',         icon: '🤝', description: 'Empréstimo pessoal ou bancário' },
];

// Opções de recorrência (para gasto comum)
export const RECURRENCE_OPTIONS = [
  { value: 'unico',    label: 'Único',       icon: '1️⃣', description: 'Acontece só uma vez' },
  { value: 'fixo',     label: 'Fixo Mensal', icon: '🔁', description: 'Todo mês, sem data de término' },
  { value: 'parcelado',label: 'Parcelado',   icon: '📆', description: 'Número fixo de parcelas' },
];

// Bancos para cartão de crédito
export const CREDIT_CARD_BANKS = [
  { value: 'nubank',        label: 'Nubank',         icon: '🟣', color: '#820AD1' },
  { value: 'inter',         label: 'Banco Inter',    icon: '🟠', color: '#FF6600' },
  { value: 'bradesco',      label: 'Bradesco',       icon: '🔴', color: '#CC0000' },
  { value: 'banco_brasil',  label: 'Banco do Brasil',icon: '🟡', color: '#F5A623' },
  { value: 'mercado_pago',  label: 'Mercado Pago',   icon: '🔵', color: '#009EE3' },
  { value: 'c6bank',        label: 'C6 Bank',        icon: '⚫', color: '#222222' },
  { value: 'amazon',        label: 'Amazon',         icon: '🟤', color: '#FF9900' },
  { value: 'outro',         label: 'Outro',          icon: '💳', color: '#6B7280' },
];

export const INCOME_CATEGORIES = [
  { value: 'salário', label: 'Salário', icon: '💼' },
  { value: 'freelance', label: 'Freelance', icon: '💻' },
  { value: 'investimento', label: 'Investimento', icon: '📈' },
  { value: 'aluguel', label: 'Aluguel', icon: '🏠' },
  { value: 'bônus', label: 'Bônus', icon: '🎁' },
  { value: 'outros', label: 'Outros', icon: '💰' },
];

export const GOAL_CATEGORIES = [
  { value: 'sonho', label: 'Sonho', icon: '⭐' },
  { value: 'viagem', label: 'Viagem', icon: '✈️' },
  { value: 'imóvel', label: 'Imóvel', icon: '🏡' },
  { value: 'carro', label: 'Carro', icon: '🚗' },
  { value: 'casamento', label: 'Casamento', icon: '💍' },
  { value: 'filhos', label: 'Filhos', icon: '👶' },
  { value: 'reserva', label: 'Reserva de Emergência', icon: '🛡️' },
  { value: 'negócio', label: 'Negócio Próprio', icon: '🏢' },
  { value: 'educação', label: 'Educação', icon: '🎓' },
  { value: 'outros', label: 'Outros', icon: '🎯' },
];

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
