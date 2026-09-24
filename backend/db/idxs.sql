-- Para buscas textuais por prefixo/substring (índices GIN trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================================================
-- USUARIOS
-- =========================================================
-- email já tem UNIQUE (cria índice automaticamente) -> não precisa duplicar.

-- Filtro/listagem por tipo (aluno, professor, admin)
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo
  ON usuarios (tipo);

-- Ordenação cronológica / paginação de cadastros
CREATE INDEX IF NOT EXISTS idx_usuarios_criado_em
  ON usuarios (criado_em DESC);

-- Busca por nome (prefixo) — útil para autocomplete
CREATE INDEX IF NOT EXISTS idx_usuarios_nome_trgm
  ON usuarios USING gin (nome gin_trgm_ops);  -- requer: CREATE EXTENSION pg_trgm;

-- =========================================================
-- GRUPOS (Salas)
-- =========================================================
-- Filtro comum: listar turmas por curso + semestre
CREATE INDEX IF NOT EXISTS idx_grupos_curso_semestre
  ON grupos (curso, semestre);

-- Filtro por período (diurno/noturno)
CREATE INDEX IF NOT EXISTS idx_grupos_periodo
  ON grupos (periodo);

-- Combinação muito comum na home do aluno:
--   WHERE curso = ? AND semestre = ? AND periodo = ?
CREATE INDEX IF NOT EXISTS idx_grupos_curso_semestre_periodo
  ON grupos (curso, semestre, periodo);

-- Ordenação por criação (listar grupos recentes)
CREATE INDEX IF NOT EXISTS idx_grupos_criado_em
  ON grupos (criado_em DESC);

-- Busca por nome do grupo
CREATE INDEX IF NOT EXISTS idx_grupos_nome_trgm
  ON grupos USING gin (nome gin_trgm_ops);

-- =========================================================
-- COMPONENTES (Matérias) — dentro de um grupo
-- =========================================================
-- FK para grupos (essencial; Postgres NÃO cria índice automático em FK)
CREATE INDEX IF NOT EXISTS idx_componentes_grupo_id
  ON componentes (grupo_id);

-- Listar matérias de um grupo ordenadas por nome
CREATE INDEX IF NOT EXISTS idx_componentes_grupo_nome
  ON componentes (grupo_id, nome);

-- Filtro por professor responsável
CREATE INDEX IF NOT EXISTS idx_componentes_professor_id
  ON componentes (professor_id);

-- =========================================================
-- MATRICULAS (aluno x componente)
-- =========================================================
-- Buscar todas as matrículas de um aluno
CREATE INDEX IF NOT EXISTS idx_matriculas_usuario_id
  ON matriculas (usuario_id);

-- Buscar todos os alunos de um componente
CREATE INDEX IF NOT EXISTS idx_matriculas_componente_id
  ON matriculas (componente_id);

-- Evitar duplicidade / acelerar checagem "aluno X está no componente Y"
CREATE UNIQUE INDEX IF NOT EXISTS uq_matriculas_usuario_componente
  ON matriculas (usuario_id, componente_id);

-- Filtro por status (ativa, trancada, concluída)
CREATE INDEX IF NOT EXISTS idx_matriculas_status
  ON matriculas (status);

-- =========================================================
-- POSTS (Mural)
-- =========================================================
-- Feed do mural de um componente, ordenado do mais recente
CREATE INDEX IF NOT EXISTS idx_posts_componente_criado_em
  ON posts (componente_id, criado_em DESC);

-- Posts de um autor (perfil do usuário)
CREATE INDEX IF NOT EXISTS idx_posts_autor_criado_em
  ON posts (autor_id, criado_em DESC);

-- =========================================================
-- COMENTARIOS
-- =========================================================
-- Comentários de um post em ordem cronológica
CREATE INDEX IF NOT EXISTS idx_comentarios_post_criado_em
  ON comentarios (post_id, criado_em ASC);

-- Comentários de um autor
CREATE INDEX IF NOT EXISTS idx_comentarios_autor_id
  ON comentarios (autor_id);

-- =========================================================
-- MENSAGENS (Chat)
-- =========================================================
-- Histórico de uma conversa (grupo/componente) ordenado por tempo
CREATE INDEX IF NOT EXISTS idx_mensagens_componente_criado_em
  ON mensagens (componente_id, criado_em DESC);

-- Mensagens de um remetente
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente_id
  ON mensagens (remetente_id);

-- Mensagens não lidas de um destinatário (badge de notificação)
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario_nao_lidas
  ON mensagens (destinatario_id, criado_em DESC)
  WHERE lida = false;