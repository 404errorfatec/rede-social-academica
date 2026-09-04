const pool = require('../db');

// CRUD do Mural: avisos, horários e informações de laboratório por grupo.

async function listar(req, res) {
  const { grupo_id } = req.query;
  const params = [];
  let sql = 'SELECT * FROM mural_avisos';
  if (grupo_id) {
    params.push(grupo_id);
    sql += ' WHERE grupo_id = $1';
  }
  sql += ' ORDER BY criado_em DESC';
  const { rows } = await pool.query(sql, params);
  res.json(rows);
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM mural_avisos WHERE id = $1', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ erro: 'Aviso não encontrado' });
  }
  res.json(rows[0]);
}

async function criar(req, res) {
  const { titulo, conteudo, tipo, grupo_id, autor_id } = req.body;
  if (!titulo || !conteudo || !grupo_id) {
    return res.status(400).json({ erro: 'titulo, conteudo e grupo_id são obrigatórios' });
  }
  const { rows } = await pool.query(
    `INSERT INTO mural_avisos (titulo, conteudo, tipo, grupo_id, autor_id)
     VALUES ($1, $2, COALESCE($3, 'aviso'), $4, $5)
     RETURNING *`,
    [titulo, conteudo, tipo, grupo_id, autor_id || null]
  );
  res.status(201).json(rows[0]);
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { titulo, conteudo, tipo } = req.body;
  const { rows } = await pool.query(
    `UPDATE mural_avisos SET titulo = COALESCE($1, titulo),
       conteudo = COALESCE($2, conteudo), tipo = COALESCE($3, tipo)
     WHERE id = $4
     RETURNING *`,
    [titulo, conteudo, tipo, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ erro: 'Aviso não encontrado' });
  }
  res.json(rows[0]);
}

async function remover(req, res) {
  const { id } = req.params;
  const { rowCount } = await pool.query('DELETE FROM mural_avisos WHERE id = $1', [id]);
  if (rowCount === 0) {
    return res.status(404).json({ erro: 'Aviso não encontrado' });
  }
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
