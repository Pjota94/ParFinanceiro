const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ─────────────────────────────────────────────────────────────────────────────
// GET /expenses?month=&year=   — gastos do mês
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year) || now.getFullYear();

  const expenses = db.prepare(`
    SELECT e.*, u.name as user_name, u.avatar_color
    FROM expenses e
    JOIN users u ON e.user_id = u.id
    WHERE e.couple_id = ? AND e.month = ? AND e.year = ?
    ORDER BY e.date DESC, e.created_at DESC
  `).all(req.user.coupleId, m, y);

  const byUser = db.prepare(`
    SELECT e.user_id, u.name as user_name, u.avatar_color, SUM(e.amount) as total
    FROM expenses e JOIN users u ON e.user_id = u.id
    WHERE e.couple_id = ? AND e.month = ? AND e.year = ?
    GROUP BY e.user_id
  `).all(req.user.coupleId, m, y);

  const byCategory = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM expenses
    WHERE couple_id = ? AND month = ? AND year = ?
    GROUP BY category ORDER BY total DESC
  `).all(req.user.coupleId, m, y);

  const byType = db.prepare(`
    SELECT expense_type, recurrence, SUM(amount) as total, COUNT(*) as count
    FROM expenses
    WHERE couple_id = ? AND month = ? AND year = ?
    GROUP BY expense_type, recurrence
  `).all(req.user.coupleId, m, y);

  return res.json({ expenses, byUser, byCategory, byType });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /expenses/loans   — lista todos os empréstimos/financiamentos agrupados
// ─────────────────────────────────────────────────────────────────────────────
router.get('/loans', (req, res) => {
  // Busca todos os registros de financiamento/empréstimo do casal
  // agrupa pelo loan_id para montar a visão de cada contrato
  const rows = db.prepare(`
    SELECT
      e.loan_id,
      e.description,
      e.expense_type,
      e.amount,
      e.total_installments,
      e.category,
      e.is_shared,
      e.notes,
      u.id   as user_id,
      u.name as user_name,
      u.avatar_color,
      COUNT(*)                        as paid_installments,
      SUM(e.amount)                   as total_paid,
      MAX(e.current_installment)      as current_installment,
      MIN(e.date)                     as first_date,
      MAX(e.date)                     as last_date
    FROM expenses e
    JOIN users u ON e.user_id = u.id
    WHERE e.couple_id = ?
      AND e.expense_type IN ('financiamento', 'emprestimo')
      AND e.loan_id IS NOT NULL
    GROUP BY e.loan_id
    ORDER BY e.expense_type, MAX(e.current_installment) DESC
  `).all(req.user.coupleId);

  const loans = rows.map((r) => {
    const totalAmount = r.amount * r.total_installments;
    const remaining = r.total_installments - r.current_installment;
    const remainingAmount = r.amount * remaining;
    return {
      ...r,
      total_amount: totalAmount,
      remaining_installments: remaining,
      remaining_amount: remainingAmount,
    };
  });

  return res.json(loans);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /expenses/loans/:loanId   — detalhe de um empréstimo/financiamento
// ─────────────────────────────────────────────────────────────────────────────
router.get('/loans/:loanId', (req, res) => {
  const { loanId } = req.params;

  // Registro mais recente como referência (metadados do contrato)
  const latest = db.prepare(`
    SELECT e.*, u.name as user_name, u.avatar_color
    FROM expenses e JOIN users u ON e.user_id = u.id
    WHERE e.loan_id = ? AND e.couple_id = ?
    ORDER BY e.current_installment DESC
    LIMIT 1
  `).get(loanId, req.user.coupleId);

  if (!latest) return res.status(404).json({ error: 'Empréstimo/Financiamento não encontrado' });

  // Todas as parcelas já lançadas, ordenadas
  const installments = db.prepare(`
    SELECT e.*, u.name as user_name, u.avatar_color
    FROM expenses e JOIN users u ON e.user_id = u.id
    WHERE e.loan_id = ? AND e.couple_id = ?
    ORDER BY e.current_installment ASC
  `).all(loanId, req.user.coupleId);

  const paidInstallments = installments.length;
  const totalPaid = installments.reduce((s, i) => s + i.amount, 0);
  const totalAmount = latest.amount * latest.total_installments;
  const remainingInstallments = latest.total_installments - latest.current_installment;
  const remainingAmount = latest.amount * remainingInstallments;

  // Estimativa de quitação: a partir da data da última parcela, adiciona os meses restantes
  let estimatedEndDate = null;
  if (latest.date && remainingInstallments >= 0) {
    const base = new Date(latest.date + 'T00:00:00');
    base.setMonth(base.getMonth() + remainingInstallments);
    estimatedEndDate = base.toISOString().split('T')[0];
  }

  return res.json({
    loan_id: loanId,
    description: latest.description,
    expense_type: latest.expense_type,
    amount: latest.amount,
    total_installments: latest.total_installments,
    current_installment: latest.current_installment,
    category: latest.category,
    is_shared: latest.is_shared,
    notes: latest.notes,
    user_id: latest.user_id,
    user_name: latest.user_name,
    avatar_color: latest.avatar_color,
    // Calculados
    paid_installments: paidInstallments,
    total_paid: totalPaid,
    total_amount: totalAmount,
    remaining_installments: remainingInstallments,
    remaining_amount: remainingAmount,
    estimated_end_date: estimatedEndDate,
    progress_pct: Math.min((latest.current_installment / latest.total_installments) * 100, 100),
    // Histórico de lançamentos
    installments,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /expenses   — criar gasto
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const {
    description, amount, category, isShared, date, notes, month, year,
    expenseType, recurrence, creditCardBank, totalInstallments, currentInstallment,
    loanId,   // pode vir do frontend ao registrar nova parcela de empréstimo existente
  } = req.body;

  if (!description || !amount || !category) {
    return res.status(400).json({ error: 'Descrição, valor e categoria são obrigatórios' });
  }
  if (expenseType === 'cartao' && !creditCardBank) {
    return res.status(400).json({ error: 'Selecione o banco do cartão de crédito' });
  }
  if ((expenseType === 'financiamento' || expenseType === 'emprestimo') && !totalInstallments) {
    return res.status(400).json({ error: 'Informe o número de parcelas' });
  }

  const now = new Date();
  const id = uuidv4();

  let rec = recurrence || 'unico';
  if (expenseType === 'financiamento' || expenseType === 'emprestimo') {
    rec = 'parcelado';
  }

  // loan_id: usa o que veio do cliente, ou gera um novo para o primeiro lançamento
  let resolvedLoanId = null;
  if (expenseType === 'financiamento' || expenseType === 'emprestimo') {
    resolvedLoanId = loanId || uuidv4();
  }

  db.prepare(`
    INSERT INTO expenses (
      id, couple_id, user_id, description, amount, category, is_shared,
      date, notes, month, year,
      expense_type, recurrence, credit_card_bank,
      total_installments, current_installment, loan_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.user.coupleId, req.user.userId,
    description, parseFloat(amount), category, isShared ? 1 : 0,
    date || now.toISOString().split('T')[0],
    notes || null,
    parseInt(month) || now.getMonth() + 1,
    parseInt(year) || now.getFullYear(),
    expenseType || 'normal',
    rec,
    creditCardBank || null,
    totalInstallments ? parseInt(totalInstallments) : null,
    currentInstallment ? parseInt(currentInstallment) : 1,
    resolvedLoanId
  );

  const expense = db.prepare(`
    SELECT e.*, u.name as user_name, u.avatar_color
    FROM expenses e JOIN users u ON e.user_id = u.id
    WHERE e.id = ?
  `).get(id);

  return res.status(201).json(expense);
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /expenses/:id   — atualizar gasto
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND couple_id = ?').get(req.params.id, req.user.coupleId);
  if (!expense) return res.status(404).json({ error: 'Gasto não encontrado' });
  if (expense.user_id !== req.user.userId) return res.status(403).json({ error: 'Você só pode editar seus próprios gastos' });

  const {
    description, amount, category, isShared, date, notes,
    expenseType, recurrence, creditCardBank, totalInstallments, currentInstallment,
  } = req.body;

  let rec = recurrence !== undefined ? recurrence : expense.recurrence;
  const et = expenseType || expense.expense_type;
  if (et === 'financiamento' || et === 'emprestimo') rec = 'parcelado';

  db.prepare(`
    UPDATE expenses SET
      description = ?, amount = ?, category = ?, is_shared = ?, date = ?, notes = ?,
      expense_type = ?, recurrence = ?, credit_card_bank = ?,
      total_installments = ?, current_installment = ?
    WHERE id = ?
  `).run(
    description || expense.description,
    parseFloat(amount) || expense.amount,
    category || expense.category,
    isShared !== undefined ? (isShared ? 1 : 0) : expense.is_shared,
    date || expense.date,
    notes !== undefined ? notes : expense.notes,
    et, rec,
    creditCardBank !== undefined ? creditCardBank : expense.credit_card_bank,
    totalInstallments !== undefined ? (totalInstallments ? parseInt(totalInstallments) : null) : expense.total_installments,
    currentInstallment !== undefined ? parseInt(currentInstallment) : expense.current_installment,
    req.params.id
  );

  const updated = db.prepare(`
    SELECT e.*, u.name as user_name, u.avatar_color
    FROM expenses e JOIN users u ON e.user_id = u.id
    WHERE e.id = ?
  `).get(req.params.id);

  return res.json(updated);
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /expenses/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND couple_id = ?').get(req.params.id, req.user.coupleId);
  if (!expense) return res.status(404).json({ error: 'Gasto não encontrado' });
  if (expense.user_id !== req.user.userId) return res.status(403).json({ error: 'Você só pode deletar seus próprios gastos' });

  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Gasto removido com sucesso' });
});

module.exports = router;
