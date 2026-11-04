const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

// Registro de novo casal
router.post('/register', async (req, res) => {
  const { coupleName, person1, person2 } = req.body;

  if (!coupleName || !person1 || !person2) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  if (!person1.name || !person1.email || !person1.password) {
    return res.status(400).json({ error: 'Dados da pessoa 1 incompletos' });
  }

  if (!person2.name || !person2.email || !person2.password) {
    return res.status(400).json({ error: 'Dados da pessoa 2 incompletos' });
  }

  // Verificar se emails já existem
  const existingEmail1 = db.prepare('SELECT id FROM users WHERE email = ?').get(person1.email);
  const existingEmail2 = db.prepare('SELECT id FROM users WHERE email = ?').get(person2.email);

  if (existingEmail1) return res.status(400).json({ error: 'E-mail da pessoa 1 já cadastrado' });
  if (existingEmail2) return res.status(400).json({ error: 'E-mail da pessoa 2 já cadastrado' });

  if (person1.email === person2.email) {
    return res.status(400).json({ error: 'Os e-mails devem ser diferentes' });
  }

  try {
    const coupleId = uuidv4();
    const user1Id = uuidv4();
    const user2Id = uuidv4();

    const hash1 = await bcrypt.hash(person1.password, 10);
    const hash2 = await bcrypt.hash(person2.password, 10);

    const registerCouple = db.transaction(() => {
      db.prepare('INSERT INTO couples (id, couple_name) VALUES (?, ?)').run(coupleId, coupleName);

      db.prepare(`
        INSERT INTO users (id, couple_id, name, email, password_hash, avatar_color, role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(user1Id, coupleId, person1.name, person1.email, hash1, '#8B5CF6', 'owner');

      db.prepare(`
        INSERT INTO users (id, couple_id, name, email, password_hash, avatar_color, role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(user2Id, coupleId, person2.name, person2.email, hash2, '#EC4899', 'member');
    });

    registerCouple();

    return res.status(201).json({
      message: 'Casal cadastrado com sucesso!',
      coupleId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao criar cadastro' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const couple = db.prepare('SELECT * FROM couples WHERE id = ?').get(user.couple_id);
  const partner = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE couple_id = ? AND id != ?').get(user.couple_id, user.id);

  const token = jwt.sign(
    {
      userId: user.id,
      coupleId: user.couple_id,
      name: user.name,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarColor: user.avatar_color,
      role: user.role,
    },
    couple: {
      id: couple.id,
      name: couple.couple_name,
    },
    partner: partner || null,
  });
});

// Verificar token e retornar dados do usuário
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, name, email, avatar_color, role FROM users WHERE id = ?').get(req.user.userId);

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const couple = db.prepare('SELECT * FROM couples WHERE id = ?').get(req.user.coupleId);
  const partner = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE couple_id = ? AND id != ?').get(req.user.coupleId, user.id);

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarColor: user.avatar_color,
      role: user.role,
    },
    couple: {
      id: couple.id,
      name: couple.couple_name,
    },
    partner: partner || null,
  });
});

module.exports = router;
