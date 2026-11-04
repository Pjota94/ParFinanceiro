import { LayoutDashboard, TrendingUp, ShoppingCart, Star, Building2 } from 'lucide-react';

export const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Início',        full: 'Dashboard' },
  { to: '/rendas',      icon: TrendingUp,      label: 'Rendas',        full: 'Rendas' },
  { to: '/gastos',      icon: ShoppingCart,    label: 'Gastos',        full: 'Gastos' },
  { to: '/emprestimos', icon: Building2,       label: 'Dívidas',       full: 'Empréstimos' },
  { to: '/metas',       icon: Star,            label: 'Metas',         full: 'Metas & Sonhos' },
];
