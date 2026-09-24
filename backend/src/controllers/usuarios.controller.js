const pool = require('../db');
const bcrypt = require('bcrypt');

const CAMPOS_PUBLICOS = 'id, nome, email, tipo, criado_em';
const TIPOS_VALIDOS = ['aluno', 'professor', 'admin'];
const NOME_MAX = 100;
const EMAIL_MAX = 150;
const SENHA_MIN = 8;
const SENHA_MAX = 72; // limite do bcrypt
const SALT_ROUNDS = 10;
const LIMIT_DEFAULT = 50;
const LIMIT_MAX = 200;

// Regex simples; se quiser rigor, use validator.js
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- helpers ----------
function parseId(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizarNome(valor) {
  if (typeof valor !== 'string') return null;
  const v = valor.trim();
  if (!v || v.length > NOME_MAX) return null;
  return v;
}

function normalizarEmail(valor) {
  if (typeof valor !== 'string') return null;
  const v = valor.trim().toLowerCase();
  if (!v || v.length > EMAIL_MAX || !EMAIL_REGEX.test(v)) return null;
  return v;
}

function validarSenha(valor) {
  if (typeof valor !== 'string') return false;
  return valor.length >= SENHA_MIN && valor.length <= SENHA_MAX;
}

function normalizarTipo(valor) {
  if (valor === undefined || valor === null) return undefined;
  const v = String(valor).trim().toLowerCase();
  return TIPOS_VALIDOS.includes(v) ? v : null;
}

function validarPayloadCriar(body) {
  const erros = [];
  const dados = {};

  const nome = normalizarNome(body.nome);
  if (!nome) erros.push(`nome é obrigatório (até ${NOME_MAX} caracteres)`);
  else dados.nome = nome;

  const email = normalizarEmail(body.email);
  if (!email) erros.push('email inválido');
  else dados.email = email;

  // ATENÇÃO: cliente manda `senha`, não `senha_hash`.
  if (!validarSenha(body.senha)) {
    erros.push(`senha é obrigatória (${SENHA_MIN} a ${SENHA_MAX} caracteres)`);
  }

  const tipo = normalizarTipo(body.tipo);
  if (tipo === null) {
    erros.push(`tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}`);
  } else {
    // TODO: quando houver auth, só admin pode definir tipo != 'aluno'.
    // Por ora, forçamos 'aluno' para evitar escalada de privilégio.
    dados.tipo = 'aluno';
  }

  return { erros, dados };
}

function validarPayloadAtualizar(body) {
  const erros = [];
  const dados = {};

  if ('nome' in body) {
    const nome = normalizarNome(body.nome);
    if (!nome) erros.push(`nome inválido (até ${NOME_MAX} caracteres)`);
    else dados.nome = nome;
  }

  if ('email' in body) {
    const email = normalizarEmail(body.email);
    if (!email) erros.push('email inválido');
    else dados.email = email;
  }

  if ('tipo' in body) {
    const tipo = normalizarTipo(body.tipo);
    if (tipo === null || tipo === undefined) {
      erros.push(`tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}`);
    } else {
      // TODO: restringir a admin quando houver auth.
      dados.tipo = tipo;
    }
  }

  // senha NÃO é atualizada por aqui (rota dedicada)
  if ('senha' in body || 'senha_hash' in body) {
    erros.push('use a rota específica para alterar senha');
  }

  return { erros, dados };
}

// ---------- controllers ----------
async function listar(req, res, next) {
  try {
    const { tipo, limit, offset } = req.query;
    const params = [];
    const filtros = [];

    if (tipo !== undefined) {
      const t = normalizarTipo(tipo);
      if (!t) return res.status(400).json({ erro: `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}` });
      params.push(t);
      filtros.push(`tipo = $${params.length}`);
    }

    let lim = LIMIT_DEFAULT;
    let off = 0;

    if (limit !== undefined) {
      lim = Number(limit);
      if (!Number.isInteger(lim) || lim <= 0 || lim > LIMIT_MAX) {
        return res.status(400).json({ erro: `limit deve ser inteiro entre 1 e ${LIMIT_MAX}` });
      }
    }
    if (offset !== undefined) {
      off = Number(offset);
      if (!Number.isInteger(off) || off < 0) {
        return res.status(400).json({ erro: 'offset deve ser inteiro >= 0' });
      }
    }

    let sql = `SELECT ${CAMPOS_PUBLICOS} FROM usuarios`;
    if (filtros.length) sql += ` WHERE ${filtros.join(' AND ')}`;
    sql += ' ORDER BY id';
    params.push(lim);
    sql += ` LIMIT $${params.length}`;
    params.push(off);
    sql += ` OFFSET $${params.length}`;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ erro: 'id inválido' });

    const { rows } = await pool.query(
      `SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { erros, dados } = validarPayloadCriar(req.body);
    if (erros.length) return res.status(400).json({ erros });

    const senha_hash = await bcrypt.hash(req.body.senha, SALT_ROUNDS);

    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING ${CAMPOS_PUBLICOS}`,
      [dados.nome, dados.email, senha_hash, dados.tipo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'E-mail já cadastrado' });
    }
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ erro: 'id inválido' });

    const { erros, dados } = validarPayloadAtualizar(req.body);
    if (erros.length) return res.status(400).json({ erros });

    const campos = Object.keys(dados);
    if (campos.length === 0) {
      return res.status(400).json({ erro: 'nenhum campo para atualizar' });
    }

    const sets = [];
    const params = [];
    for (const campo of campos) {
      params.push(dados[campo]);
      sets.push(`${campo} = $${params.length}`);
    }
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE usuarios SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${CAMPOS_PUBLICOS}`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'E-mail já cadastrado' });
    }
    next(err);
  }
}

async function remover(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ erro: 'id inválido' });

    const { rowCount } = await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        erro: 'Usuário possui registros vinculados e não pode ser removido',
      });
    }
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };