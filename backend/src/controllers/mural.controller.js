const pool = require('../db');

const CAMPOS_SELECT = 'id, titulo, conteudo, tipo, grupo_id, autor_id, criado_em';
const TIPOS_VALIDOS = ['aviso', 'horario', 'laboratorio', 'informacao'];
const TITULO_MAX = 200;
const CONTEUDO_MAX = 5000;
const LIMIT_DEFAULT = 50;
const LIMIT_MAX = 200;

// ---------- helpers ----------
function parseId(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizarString(valor, { max, obrigatorio = false } = {}) {
  if (valor === undefined || valor === null) return obrigatorio ? null : undefined;
  if (typeof valor !== 'string') return null;
  const v = valor.trim();
  if (!v) return null;
  if (max && v.length > max) return null;
  return v;
}

function validarPayload(body, { parcial = false } = {}) {
  const erros = [];
  const dados = {};

  // titulo
  if ('titulo' in body || !parcial) {
    const t = normalizarString(body.titulo, { max: TITULO_MAX, obrigatorio: true });
    if (!t) erros.push(`titulo é obrigatório (até ${TITULO_MAX} caracteres)`);
    else dados.titulo = t;
  }

  // conteudo
  if ('conteudo' in body || !parcial) {
    const c = normalizarString(body.conteudo, { max: CONTEUDO_MAX, obrigatorio: true });
    if (!c) erros.push(`conteudo é obrigatório (até ${CONTEUDO_MAX} caracteres)`);
    else dados.conteudo = c;
  }

  // tipo
  if ('tipo' in body || !parcial) {
    if (body.tipo === undefined || body.tipo === null) {
      if (!parcial) dados.tipo = 'aviso'; // default no create
      // no update, se vier explicitamente null, mantém atual (não faz sentido limpar tipo)
    } else {
      const tipo = String(body.tipo).trim().toLowerCase();
      if (!TIPOS_VALIDOS.includes(tipo)) {
        erros.push(`tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}`);
      } else {
        dados.tipo = tipo;
      }
    }
  }

  // grupo_id (só no create, em regra)
  if ('grupo_id' in body || !parcial) {
    const gid = parseId(body.grupo_id);
    if (!gid) erros.push('grupo_id é obrigatório e deve ser um inteiro positivo');
    else dados.grupo_id = gid;
  }

  // autor_id (opcional)
  if ('autor_id' in body) {
    if (body.autor_id === null || body.autor_id === undefined) {
      dados.autor_id = null;
    } else {
      const aid = parseId(body.autor_id);
      if (!aid) erros.push('autor_id deve ser um inteiro positivo ou null');
      else dados.autor_id = aid;
    }
  }

  return { erros, dados };
}

async function recursoExiste(tabela, id) {
  const { rowCount } = await pool.query(`SELECT 1 FROM ${tabela} WHERE id = $1`, [id]);
  return rowCount > 0;
}

// ---------- controllers ----------
async function listar(req, res, next) {
  try {
    const { grupo_id, tipo, autor_id, limit, offset } = req.query;
    const params = [];
    const filtros = [];

    if (grupo_id !== undefined) {
      const gid = parseId(grupo_id);
      if (!gid) return res.status(400).json({ erro: 'grupo_id inválido' });
      params.push(gid);
      filtros.push(`grupo_id = $${params.length}`);
    }

    if (tipo !== undefined) {
      const t = String(tipo).trim().toLowerCase();
      if (!TIPOS_VALIDOS.includes(t)) {
        return res.status(400).json({ erro: `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}` });
      }
      params.push(t);
      filtros.push(`tipo = $${params.length}`);
    }

    if (autor_id !== undefined) {
      const aid = parseId(autor_id);
      if (!aid) return res.status(400).json({ erro: 'autor_id inválido' });
      params.push(aid);
      filtros.push(`autor_id = $${params.length}`);
    }

    // paginação
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

    let sql = `SELECT ${CAMPOS_SELECT} FROM mural_avisos`;
    if (filtros.length) sql += ` WHERE ${filtros.join(' AND ')}`;
    sql += ` ORDER BY criado_em DESC`;
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
      `SELECT ${CAMPOS_SELECT} FROM mural_avisos WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Aviso não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { erros, dados } = validarPayload(req.body);
    if (erros.length) return res.status(400).json({ erros });

    if (!(await recursoExiste('grupos', dados.grupo_id))) {
      return res.status(400).json({ erro: 'grupo_id não existe' });
    }

    // TODO: quando houver autenticação, sobrescrever com req.usuario.id
    // dados.autor_id = req.usuario.id;
    if (dados.autor_id && !(await recursoExiste('usuarios', dados.autor_id))) {
      return res.status(400).json({ erro: 'autor_id não existe' });
    }

    const { rows } = await pool.query(
      `INSERT INTO mural_avisos (titulo, conteudo, tipo, grupo_id, autor_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${CAMPOS_SELECT}`,
      [
        dados.titulo,
        dados.conteudo,
        dados.tipo ?? 'aviso',
        dados.grupo_id,
        dados.autor_id ?? null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ erro: 'id inválido' });

    const { erros, dados } = validarPayload(req.body, { parcial: true });
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
      `UPDATE mural_avisos SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${CAMPOS_SELECT}`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Aviso não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function remover(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ erro: 'id inválido' });

    const { rowCount } = await pool.query('DELETE FROM mural_avisos WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ erro: 'Aviso não encontrado' });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ erro: 'Aviso possui dependências e não pode ser removido' });
    }
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };