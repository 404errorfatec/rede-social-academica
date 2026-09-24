const pool = require('../db');

const CAMPOS_SELECT = 'id, nome, curso, semestre, periodo';
const PERIODOS_VALIDOS = ['diurno', 'noturno'];
const SEMESTRE_MIN = 1;
const SEMESTRE_MAX = 8; // ajuste conforme regra da instituição

// ---------- helpers ----------
function parseId(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizarString(valor, { max } = {}) {
  if (typeof valor !== 'string') return null;
  const v = valor.trim();
  if (!v) return null;
  if (max && v.length > max) return null;
  return v;
}

function validarPayload(body, { parcial = false } = {}) {
  const erros = [];
  const dados = {};

  // nome
  if ('nome' in body || !parcial) {
    const nome = normalizarString(body.nome, { max: 100 });
    if (!nome) erros.push('nome é obrigatório (até 100 caracteres)');
    else dados.nome = nome;
  }

  // curso
  if ('curso' in body || !parcial) {
    const curso = normalizarString(body.curso, { max: 100 });
    if (!curso) erros.push('curso é obrigatório (até 100 caracteres)');
    else dados.curso = curso;
  }

  // semestre
  if ('semestre' in body || !parcial) {
    const s = body.semestre;
    if (!Number.isInteger(s) || s < SEMESTRE_MIN || s > SEMESTRE_MAX) {
      erros.push(`semestre deve ser inteiro entre ${SEMESTRE_MIN} e ${SEMESTRE_MAX}`);
    } else {
      dados.semestre = s;
    }
  }

  // periodo
  if ('periodo' in body || !parcial) {
    const p = typeof body.periodo === 'string' ? body.periodo.trim().toLowerCase() : '';
    if (!PERIODOS_VALIDOS.includes(p)) {
      erros.push(`periodo deve ser um de: ${PERIODOS_VALIDOS.join(', ')}`);
    } else {
      dados.periodo = p;
    }
  }

  return { erros, dados };
}

async function grupoDuplicado({ curso, semestre, periodo, ignorarId = null }) {
  const params = [curso, semestre, periodo];
  let sql = `SELECT id FROM grupos
             WHERE curso = $1 AND semestre = $2 AND periodo = $3`;
  if (ignorarId) {
    params.push(ignorarId);
    sql += ` AND id <> $4`;
  }
  const { rowCount } = await pool.query(sql, params);
  return rowCount > 0;
}

// ---------- controllers ----------
async function listar(req, res, next) {
  try {
    const { curso, semestre, periodo } = req.query;
    const params = [];
    const filtros = [];

    if (curso !== undefined) {
      const c = normalizarString(curso, { max: 100 });
      if (!c) return res.status(400).json({ erro: 'curso inválido' });
      params.push(c);
      filtros.push(`curso = $${params.length}`);
    }

    if (semestre !== undefined) {
      const s = Number(semestre);
      if (!Number.isInteger(s) || s < SEMESTRE_MIN || s > SEMESTRE_MAX) {
        return res.status(400).json({ erro: 'semestre inválido' });
      }
      params.push(s);
      filtros.push(`semestre = $${params.length}`);
    }

    if (periodo !== undefined) {
      const p = String(periodo).trim().toLowerCase();
      if (!PERIODOS_VALIDOS.includes(p)) {
        return res.status(400).json({ erro: 'periodo inválido' });
      }
      params.push(p);
      filtros.push(`periodo = $${params.length}`);
    }

    let sql = `SELECT ${CAMPOS_SELECT} FROM grupos`;
    if (filtros.length) sql += ` WHERE ${filtros.join(' AND ')}`;
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
      `SELECT ${CAMPOS_SELECT} FROM grupos WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Grupo não encontrado' });
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

    if (await grupoDuplicado(dados)) {
      return res.status(409).json({
        erro: 'Já existe um grupo com esse curso, semestre e período',
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO grupos (nome, curso, semestre, periodo)
       VALUES ($1, $2, $3, $4)
       RETURNING ${CAMPOS_SELECT}`,
      [dados.nome, dados.curso, dados.semestre, dados.periodo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Grupo duplicado' });
    }
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

    // checa duplicidade só se um dos campos-chave foi tocado
    const tocaChave =
      'curso' in dados || 'semestre' in dados || 'periodo' in dados;

    if (tocaChave) {
      // busca estado atual pra completar a chave
      const { rows: atuais } = await pool.query(
        'SELECT curso, semestre, periodo FROM grupos WHERE id = $1',
        [id]
      );
      if (atuais.length === 0) {
        return res.status(404).json({ erro: 'Grupo não encontrado' });
      }
      const atual = atuais[0];
      const chave = {
        curso: dados.curso ?? atual.curso,
        semestre: dados.semestre ?? atual.semestre,
        periodo: dados.periodo ?? atual.periodo,
        ignorarId: id,
      };
      if (await grupoDuplicado(chave)) {
        return res.status(409).json({
          erro: 'Já existe um grupo com esse curso, semestre e período',
        });
      }
    }

    const sets = [];
    const params = [];
    for (const campo of campos) {
      params.push(dados[campo]);
      sets.push(`${campo} = $${params.length}`);
    }
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE grupos SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${CAMPOS_SELECT}`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Grupo não encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Grupo duplicado' });
    }
    next(err);
  }
}

async function remover(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ erro: 'id inválido' });

    const { rowCount } = await pool.query('DELETE FROM grupos WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ erro: 'Grupo não encontrado' });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        erro: 'Grupo possui componentes vinculados e não pode ser removido',
      });
    }
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };