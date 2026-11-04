const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Listar metas do casal
router.get('/', (req, res) => {
  const { status } = req.query;

  let query = `
    SELECT g.*,
      (SELECT SUM(gc.amount) FROM goal_contributions gc WHERE gc.goal_id = g.id) as contributions_total,
      (SELECT COUNT(*) FROM goal_contributions gc WHERE gc.goal_id = g.id) as contributions_count
    FROM goals g
    WHERE g.couple_id = ?
  `;
  const params = [req.user.coupleId];

  if (status) {
    query += ' AND g.status = ?';
    params.push(status);
  }

  query += ' ORDER BY g.created_at DESC';

  const goals = db.prepare(query).all(...params);

  return res.json(goals);
});

// Detalhes de uma meta com contribuições
router.get('/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND couple_id = ?').get(req.params.id, req.user.coupleId);

  if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });

  const contributions = db.prepare(`
    SELECT gc.*, u.name as user_name, u.avatar_color
    FROM goal_contributions gc
    JOIN users u ON gc.user_id = u.id
    WHERE gc.goal_id = ?
    ORDER BY gc.created_at DESC
  `).all(req.params.id);

  const byUser = db.prepare(`
    SELECT gc.user_id, u.name as user_name, u.avatar_color, SUM(gc.amount) as total
    FROM goal_contributions gc
    JOIN users u ON gc.user_id = u.id
    WHERE gc.goal_id = ?
    GROUP BY gc.user_id
  `).all(req.params.id);

  return res.json({ ...goal, contributions, byUser });
});

// Criar meta
router.post('/', (req, res) => {
  const { title, description, targetAmount, category, priority, deadline, color, icon } = req.body;

  if (!title || !targetAmount) {
    return res.status(400).json({ error: 'Título e valor alvo são obrigatórios' });
  }

  const id = uuidv4();

  db.prepare(`
    INSERT INTO goals (id, couple_id, title, description, target_amount, category, priority, deadline, color, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user.coupleId,
    title,
    description || null,
    parseFloat(targetAmount),
    category || 'sonho',
    priority || 'média',
    deadline || null,
    color || '#8B5CF6',
    icon || '⭐'
  );

  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
  return res.status(201).json(goal);
});

// Atualizar meta
router.put('/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND couple_id = ?').get(req.params.id, req.user.coupleId);

  if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });

  const { title, description, targetAmount, category, priority, deadline, status, color, icon } = req.body;

  db.prepare(`
    UPDATE goals SET title = ?, description = ?, target_amount = ?, category = ?, priority = ?, deadline = ?, status = ?, color = ?, icon = ?
    WHERE id = ?
  `).run(
    title || goal.title,
    description !== undefined ? description : goal.description,
    parseFloat(targetAmount) || goal.target_amount,
    category || goal.category,
    priority || goal.priority,
    deadline !== undefined ? deadline : goal.deadline,
    status || goal.status,
    color || goal.color,
    icon || goal.icon,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  return res.json(updated);
});

// Deletar meta
router.delete('/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND couple_id = ?').get(req.params.id, req.user.coupleId);

  if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });

  db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Meta removida com sucesso' });
});

// Adicionar contribuição à meta
router.post('/:id/contributions', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND couple_id = ?').get(req.params.id, req.user.coupleId);

  if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });

  const { amount, notes } = req.body;

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Valor inválido' });
  }

  const id = uuidv4();

  db.prepare(`
    INSERT INTO goal_contributions (id, goal_id, user_id, amount, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.params.id, req.user.userId, parseFloat(amount), notes || null);

  // Atualizar valor atual da meta
  const totalContributions = db.prepare('SELECT SUM(amount) as total FROM goal_contributions WHERE goal_id = ?').get(req.params.id);
  const newAmount = totalContributions.total || 0;

  let newStatus = goal.status;
  if (newAmount >= goal.target_amount) {
    newStatus = 'concluído';
  }

  db.prepare('UPDATE goals SET current_amount = ?, status = ? WHERE id = ?').run(newAmount, newStatus, req.params.id);

  const contribution = db.prepare(`
    SELECT gc.*, u.name as user_name, u.avatar_color
    FROM goal_contributions gc JOIN users u ON gc.user_id = u.id
    WHERE gc.id = ?
  `).get(id);

  return res.status(201).json({
    contribution,
    goalUpdated: db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id)
  });
});

module.exports = router;
