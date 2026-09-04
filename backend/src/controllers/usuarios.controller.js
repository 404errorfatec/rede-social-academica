const pool = require('../db');

// CRUD basico de usuarios. A senha aqui fica como texto simples apenas
// para o CRUD inicial - antes de ir para producao, trocar por hash
// (bcrypt, por exemplo) no cadastro e no login.

async function listar(req, res) {
  const { rows } = await pool.query(
    'SELECT id, nome, email, tipo, criado_em FROM usuarios ORDER BY id'
  );
  res.json(rows);
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    'SELECT id, nome, email, tipo, criado_em FROM usuarios WHERE id = $1',
    [id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }
  res.json(rows[0]);
}

async function criar(req, res) {
  const { nome, email, senha_hash, tipo } = req.body;
  if (!nome || !email || !senha_hash) {
    return res.status(400).json({ erro: 'nome, email e senha_hash são obrigatórios' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo)
       VALUES ($1, $2, $3, COALESCE($4, 'aluno'))
       RETURNING id, nome, email, tipo, criado_em`,
      [nome, email, senha_hash, tipo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'E-mail já cadastrado' });
    }
    throw err;
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, email, tipo } = req.body;
  const { rows } = await pool.query(
    `UPDATE usuarios SET nome = COALESCE($1, nome), email = COALESCE($2, email),
       tipo = COALESCE($3, tipo)
     WHERE id = $4
     RETURNING id, nome, email, tipo, criado_em`,
    [nome, email, tipo, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }
  res.json(rows[0]);
}

async function remover(req, res) {
  const { id } = req.params;
  const { rowCount } = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
  if (rowCount === 0) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
