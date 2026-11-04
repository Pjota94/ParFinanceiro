const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Dashboard completo do mês
router.get('/', async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year) || now.getFullYear();

  // Membros do casal
  const members = await db.prepare(`
    SELECT id, name, email, avatar_color, role FROM users WHERE couple_id = ?
  `).all(req.user.coupleId);

  // Total de rendas
  const totalIncome = await db.prepare(`
    SELECT SUM(amount) as total FROM incomes
    WHERE couple_id = ? AND month = ? AND year = ?
  `).get(req.user.coupleId, m, y);

  // Renda por pessoa
  const incomeByPerson = await db.prepare(`
    SELECT i.user_id, u.name, u.avatar_color, SUM(i.amount) as total
    FROM incomes i JOIN users u ON i.user_id = u.id
    WHERE i.couple_id = ? AND i.month = ? AND i.year = ?
    GROUP BY i.user_id
  `).all(req.user.coupleId, m, y);

  // Total de gastos
  const totalExpenses = await db.prepare(`
    SELECT SUM(amount) as total FROM expenses
    WHERE couple_id = ? AND month = ? AND year = ?
  `).get(req.user.coupleId, m, y);

  // Gastos por pessoa
  const expensesByPerson = await db.prepare(`
    SELECT e.user_id, u.name, u.avatar_color, SUM(e.amount) as total
    FROM expenses e JOIN users u ON e.user_id = u.id
    WHERE e.couple_id = ? AND e.month = ? AND e.year = ?
    GROUP BY e.user_id
  `).all(req.user.coupleId, m, y);

  // Gastos por categoria
  const expensesByCategory = await db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM expenses
    WHERE couple_id = ? AND month = ? AND year = ?
    GROUP BY category
    ORDER BY total DESC
  `).all(req.user.coupleId, m, y);

  // Últimos 6 meses — evolução
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    let d = new Date(y, m - 1 - i, 1);
    const mo = d.getMonth() + 1;
    const ye = d.getFullYear();

    const inc = await db.prepare('SELECT SUM(amount) as total FROM incomes WHERE couple_id = ? AND month = ? AND year = ?').get(req.user.coupleId, mo, ye);
    const exp = await db.prepare('SELECT SUM(amount) as total FROM expenses WHERE couple_id = ? AND month = ? AND year = ?').get(req.user.coupleId, mo, ye);

    last6Months.push({
      month: mo,
      year: ye,
      label: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      income: inc.total || 0,
      expenses: exp.total || 0,
      balance: (inc.total || 0) - (exp.total || 0)
    });
  }

  // Metas ativas
  const activeGoals = await db.prepare(`
    SELECT * FROM goals WHERE couple_id = ? AND status = 'ativo'
    ORDER BY created_at DESC LIMIT 5
  `).all(req.user.coupleId);

  const income = totalIncome.total || 0;
  const expenses = totalExpenses.total || 0;
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;

  return res.json({
    period: { month: m, year: y },
    members,
    summary: {
      totalIncome: income,
      totalExpenses: expenses,
      balance,
      savingsRate: parseFloat(savingsRate),
    },
    incomeByPerson,
    expensesByPerson,
    expensesByCategory,
    last6Months,
    activeGoals,
  });
});

module.exports = router;
