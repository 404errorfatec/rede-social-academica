-- Schema inicial da Rede Social Acadêmica
-- Baseado no fluxo: Grupos (Salas) -> Componentes (Matérias) -> Mural / Chat
-- Turno cobre as turmas diurno e noturno do curso.

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'aluno' CHECK (tipo IN ('aluno', 'professor', 'admin')),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Grupos (Salas): cada turma/curso/semestre/período vira um grupo
CREATE TABLE IF NOT EXISTS grupos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  curso VARCHAR(150) NOT NULL,
  semestre VARCHAR(20) NOT NULL,
  periodo VARCHAR(20) NOT NULL CHECK (periodo IN ('diurno', 'noturno')),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Relação N:N entre usuários e grupos (quem participa de qual sala)
CREATE TABLE IF NOT EXISTS grupo_membros (
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  papel VARCHAR(20) NOT NULL DEFAULT 'membro' CHECK (papel IN ('membro', 'monitor', 'professor')),
  PRIMARY KEY (grupo_id, usuario_id)
);

-- Componentes (matérias) associados a um grupo
CREATE TABLE IF NOT EXISTS componentes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  carga_horaria INTEGER,
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Mural: informações básicas do grupo (horários, labs, avisos)
CREATE TABLE IF NOT EXISTS mural_avisos (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  conteudo TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'aviso' CHECK (tipo IN ('aviso', 'horario', 'lab')),
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  autor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

--Teste 02

-- Placeholders para próximas etapas do fluxo (Chat e Mapa de Salas)
-- ainda não fazem parte do CRUD inicial, mas o schema já reserva o relacionamento
-- via grupo_id para quando forem implementados.
