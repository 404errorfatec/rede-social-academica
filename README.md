# Rede Social Acadêmica — Integrando Grupos

CRUD inicial do projeto de Gestão de Projetos Ágeis, com base no fluxo
desenhado para a turma (diurno e noturno, grupos de até 4 pessoas com
back/front/infra/QA).

## O que já está implementado

Este CRUD inicial cobre as entidades centrais do fluxo — o que os
próximos sprints podem expandir com **Chat** e **Mapa de Salas**, que
ainda não têm código:

| Item do fluxo | Implementado como |
|---|---|
| Grupos (Salas) — Curso/Semestre/Período | CRUD completo (`/api/grupos`) |
| Componentes (matérias) | CRUD completo (`/api/componentes`), vinculado a um grupo |
| Mural — Informações Básicas (horários/labs) | Criar, listar e excluir (`/api/mural`) |
| Usuários (para autoria e participação nos grupos) | CRUD completo (`/api/usuarios`) |
| Infraestrutura (GitHub/Vercel) | Repositório pronto para deploy; ver seção Deploy |
| Node/React/Vite | Backend Express + Frontend React (Vite) |
| Postgres | Schema em `backend/db/schema.sql` |
| Testes (Robot Framework) | Placeholder em `tests/robotframework/` |
| Chat | Próxima etapa (não incluída neste CRUD inicial) |
| Mapa de Salas | Próxima etapa (não incluída neste CRUD inicial) |

## Estrutura do repositório

```
rede-social-academica/
  backend/          API REST (Node + Express + Postgres)
  frontend/         Interface (React + Vite)
  tests/robotframework/   Reservado para os testes automatizados
  docker-compose.yml      Sobe um Postgres local para desenvolvimento
```

## Como rodar

### 1. Banco de dados

Com Docker instalado:

```bash
docker compose up -d
```

Ou aponte `backend/.env` para um Postgres já existente.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate   # cria as tabelas a partir de db/schema.sql
npm run dev           # API em http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev            # interface em http://localhost:5173
```

## Endpoints da API

Todos os recursos seguem o mesmo padrão REST:

```
GET    /api/grupos
GET    /api/grupos/:id
POST   /api/grupos
PUT    /api/grupos/:id
DELETE /api/grupos/:id
```

O mesmo vale para `/api/componentes`, `/api/mural` e `/api/usuarios`.
`componentes` e `mural` aceitam o filtro `?grupo_id=` na listagem.

## Divisão sugerida por squad (conforme o fluxograma)

- **back**: rotas/controllers em `backend/src`, schema em `backend/db`
- **front**: páginas em `frontend/src/pages`, client de API em `frontend/src/api.js`
- **infra**: `docker-compose.yml`, deploy no GitHub + Vercel, variáveis de ambiente
- **QA**: casos de teste em `tests/robotframework`

## Próximos passos

- Autenticação (login de aluno/professor) e hash de senha real (bcrypt)
- Módulo de Chat entre membros do grupo
- Mapa de Salas
- Casos de teste automatizados com Robot Framework
