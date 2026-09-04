const pool = require('../db');

// CRUD de Componentes (matérias), sempre atrelados a um grupo (sala).

async function listar(req, res) {
  const { grupo_id } = req.query;
  const params = [];
  let sql = 'SELECT * FROM componentes';
  if (grupo_id) {
    params.push(grupo_id);
    sql += ' WHERE grupo_id = $1';
  }
  sql += ' ORDER BY id';
  const { rows } = await pool.query(sql, params);
  res.json(rows);
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM componentes WHERE id = $1', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ erro: 'Componente não encontrado' });
  }
  res.json(rows[0]);
}

async function criar(req, res) {
  const { nome, carga_horaria, grupo_id } = req.body;
  if (!nome || !grupo_id) {
    return res.status(400).json({ erro: 'nome e grupo_id são obrigatórios' });
  }
  const { rows } = await pool.query(
    `INSERT INTO componentes (nome, carga_horaria, grupo_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [nome, carga_horaria || null, grupo_id]
  );
  res.status(201).json(rows[0]);
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, carga_horaria, grupo_id } = req.body;
  const { rows } = await pool.query(
    `UPDATE componentes SET nome = COALESCE($1, nome),
       carga_horaria = COALESCE($2, carga_horaria),
       grupo_id = COALESCE($3, grupo_id)
     WHERE id = $4
     RETURNING *`,
    [nome, carga_horaria, grupo_id, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ erro: 'Componente não encontrado' });
  }
  res.json(rows[0]);
}

async function remover(req, res) {
  const { id } = req.params;
  const { rowCount } = await pool.query('DELETE FROM componentes WHERE id = $1', [id]);
  if (rowCount === 0) {
    return res.status(404).json({ erro: 'Componente não encontrado' });
  }
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
