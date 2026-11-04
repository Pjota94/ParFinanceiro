require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/incomes', require('./routes/incomes'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Par Financeiro API', version: '1.0.0' });
});

// Local: sobe o servidor. Na Vercel, o app é exportado e roda como função serverless.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n💑 Par Financeiro API rodando na porta ${PORT}`);
    console.log(`   http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
