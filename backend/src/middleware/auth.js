const jwt = require('jsonwebtoken');

// Em produção o JWT_SECRET é obrigatório. Antes isso derrubava a função
// inteira (500 opaco). Agora apenas registramos o problema e o /api/health
// reporta a causa, sem travar o carregamento do módulo.
const missingJwtSecret = process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET;
if (missingJwtSecret) {
  console.error('[config] JWT_SECRET ausente em produção — defina a variável de ambiente no projeto do backend.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'parfinanceiro_secret_2024';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken, JWT_SECRET };
