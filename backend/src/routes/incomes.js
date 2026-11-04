const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Listar rendas do mês/ano
router.get('/', (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year) || now.getFullYear();

  const incomes = db.prepare(`
    SELECT i.*, u.name as user_name, u.avatar_color
    FROM incomes i
    JOIN users u ON i.user_id = u.id
    WHERE i.couple_id = ? AND i.month = ? AND i.year = ?
    ORDER BY i.created_at DESC
  `).all(req.user.coupleId, m, y);

  const summary = db.prepare(`
    SELECT 
      user_id,
      u.name as user_name,
      u.avatar_color,
      SUM(amount) as total
    FROM incomes i
    JOIN users u ON i.user_id = u.id
    WHERE i.couple_id = ? AND i.month = ? AND i.year = ?
    GROUP BY i.user_id
  `).all(req.user.coupleId, m, y);

  return res.json({ incomes, summary });
});

// Adicionar renda
router.post('/', (req, res) => {
  const { description, amount, category, month, year } = req.body;

  if (!description || !amount) {
    return res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
  }

  const now = new Date();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO incomes (id, couple_id, user_id, description, amount, category, month, year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user.coupleId,
    req.user.userId,
    description,
    parseFloat(amount),
    category || 'salário',
    parseInt(month) || now.getMonth() + 1,
    parseInt(year) || now.getFullYear()
  );

  const income = db.prepare('SELECT * FROM incomes WHERE id = ?').get(id);
  return res.status(201).json(income);
});

// Atualizar renda
router.put('/:id', (req, res) => {
  const income = db.prepare('SELECT * FROM incomes WHERE id = ? AND couple_id = ?').get(req.params.id, req.user.coupleId);

  if (!income) return res.status(404).json({ error: 'Renda não encontrada' });

  if (income.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'Você só pode editar suas próprias rendas' });
  }

  const { description, amount, category } = req.body;

  db.prepare(`
    UPDATE incomes SET description = ?, amount = ?, category = ?
    WHERE id = ?
  `).run(
    description || income.description,
    parseFloat(amount) || income.amount,
    category || income.category,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM incomes WHERE id = ?').get(req.params.id);
  return res.json(updated);
});

// Deletar renda
router.delete('/:id', (req, res) => {
  const income = db.prepare('SELECT * FROM incomes WHERE id = ? AND couple_id = ?').get(req.params.id, req.user.coupleId);

  if (!income) return res.status(404).json({ error: 'Renda não encontrada' });

  if (income.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'Você só pode deletar suas próprias rendas' });
  }

  db.prepare('DELETE FROM incomes WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Renda removida com sucesso' });
});

module.exports = router;
