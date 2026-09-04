require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('express-async-errors'); // permite usar async/await direto nos controllers

const usuariosRoutes = require('./routes/usuarios.routes');
const gruposRoutes = require('./routes/grupos.routes');
const componentesRoutes = require('./routes/componentes.routes');
const muralRoutes = require('./routes/mural.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/usuarios', usuariosRoutes);
app.use('/api/grupos', gruposRoutes);
app.use('/api/componentes', componentesRoutes);
app.use('/api/mural', muralRoutes);

// Tratamento simples de erro para respostas JSON consistentes
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
