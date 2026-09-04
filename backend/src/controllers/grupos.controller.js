const pool = require('../db');

// CRUD de Grupos (Salas): curso / semestre / período (diurno ou noturno).

async function listar(req, res) {
  const { rows } = await pool.query('SELECT * FROM grupos ORDER BY id');
  res.json(rows);
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM grupos WHERE id = $1', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ erro: 'Grupo não encontrado' });
  }
  res.json(rows[0]);
}

async function criar(req, res) {
  const { nome, curso, semestre, periodo } = req.body;
  if (!nome || !curso || !semestre || !periodo) {
    return res
      .status(400)
      .json({ erro: 'nome, curso, semestre e periodo são obrigatórios' });
  }
  const { rows } = await pool.query(
    `INSERT INTO grupos (nome, curso, semestre, periodo)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [nome, curso, semestre, periodo]
  );
  res.status(201).json(rows[0]);
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, curso, semestre, periodo } = req.body;
  const { rows } = await pool.query(
    `UPDATE grupos SET nome = COALESCE($1, nome), curso = COALESCE($2, curso),
       semestre = COALESCE($3, semestre), periodo = COALESCE($4, periodo)
     WHERE id = $5
     RETURNING *`,
    [nome, curso, semestre, periodo, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ erro: 'Grupo não encontrado' });
  }
  res.json(rows[0]);
}

async function remover(req, res) {
  const { id } = req.params;
  const { rowCount } = await pool.query('DELETE FROM grupos WHERE id = $1', [id]);
  if (rowCount === 0) {
    return res.status(404).json({ erro: 'Grupo não encontrado' });
  }
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
