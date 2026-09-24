const pool = require('../db');

// ---------- helpers ----------
const CAMPOS_SELECT = 'id, nome, carga_horaria, grupo_id';

function parseId(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function validarPayload(body, { parcial = false } = {}) {
  const erros = [];
  const dados = {};

  if ('nome' in body || !parcial) {
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    if (!nome) erros.push('nome é obrigatório');
    else if (nome.length > 200) erros.push('nome deve ter até 200 caracteres');
    else dados.nome = nome;
  }

  if ('carga_horaria' in body || !parcial) {
    const ch = body.carga_horaria;
    if (ch === undefined || ch === null) {
      dados.carga_horaria = null;
    } else if (!Number.isInteger(ch) || ch <= 0) {
      erros.push('carga_horaria deve ser um inteiro positivo');
    } else {
      dados.carga_horaria = ch;
    }
  }

  if ('grupo_id' in body || !parcial) {
    const gid = parseId(body.grupo_id);
    if (!gid) erros.push('grupo_id é obrigatório e deve ser um inteiro positivo');
    else dados.grupo_id = gid;
  }

  return { erros, dados };
}

async function grupoExiste(grupo_id) {
  const { rowCount } = await pool.query('SELECT 1 FROM grupos WHERE id = $1', [grupo_id]);
  return rowCount > 0;
}

// ---------- controllers ----------
async function listar(req, res, next) {
  try {
    const { grupo_id } = req.query;
    const params = [];
    let sql = `SELECT ${CAMPOS_SELECT} FROM componentes`;

    if (grupo_id !== undefined) {
      const gid = parseId(grupo_id);
      if (!gid) return res.status(400).json({ erro: 'grupo_id inválido' });
      params.push(gid);
      sql += ' WHERE grupo_id = $1';
    }

    sql += ' ORDER BY id';
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
      `SELECT ${CAMPOS_SELECT} FROM componentes WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Componente não encontrado' });
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

    if (!(await grupoExiste(dados.grupo_id))) {
      return res.status(400).json({ erro: 'grupo_id não existe' });
    }

    const { rows } = await pool.query(
      `INSERT INTO componentes (nome, carga_horaria, grupo_id)
       VALUES ($1, $2, $3)
       RETURNING ${CAMPOS_SELECT}`,
      [dados.nome, dados.carga_horaria ?? null, dados.grupo_id]
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

    // PUT vs PATCH: aqui aceito atualização parcial (COALESCE),
    // mas valido tipos quando o campo vier.
    const { erros, dados } = validarPayload(req.body, { parcial: true });
    if (erros.length) return res.status(400).json({ erros });

    const campos = Object.keys(dados);
    if (campos.length === 0) {
      return res.status(400).json({ erro: 'nenhum campo para atualizar' });
    }

    if (dados.grupo_id && !(await grupoExiste(dados.grupo_id))) {
      return res.status(400).json({ erro: 'grupo_id não existe' });
    }

    const sets = [];
    const params = [];
    for (const campo of campos) {
      params.push(dados[campo]);
      sets.push(`${campo} = $${params.length}`);
    }
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE componentes SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${CAMPOS_SELECT}`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Componente não encontrado' });
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

    const { rowCount } = await pool.query('DELETE FROM componentes WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ erro: 'Componente não encontrado' });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ erro: 'Componente possui dependências e não pode ser removido' });
    }
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };