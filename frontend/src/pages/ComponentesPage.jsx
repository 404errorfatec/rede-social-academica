import { useEffect, useState } from 'react';
import { api } from '../api.js';

const VAZIO = { nome: '', carga_horaria: '', grupo_id: '' };

export default function ComponentesPage() {
  const [componentes, setComponentes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const [listaComponentes, listaGrupos] = await Promise.all([
        api.listar('componentes'),
        api.listar('grupos'),
      ]);
      setComponentes(listaComponentes);
      setGrupos(listaGrupos);
    } catch (err) {
      setErro(err.message);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErro('');
    const payload = {
      ...form,
      carga_horaria: form.carga_horaria ? Number(form.carga_horaria) : null,
      grupo_id: Number(form.grupo_id),
    };
    try {
      if (editandoId) {
        await api.atualizar('componentes', editandoId, payload);
      } else {
        await api.criar('componentes', payload);
      }
      setForm(VAZIO);
      setEditandoId(null);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  function editar(componente) {
    setEditandoId(componente.id);
    setForm({
      nome: componente.nome,
      carga_horaria: componente.carga_horaria ?? '',
      grupo_id: String(componente.grupo_id),
    });
  }

  async function remover(id) {
    setErro('');
    try {
      await api.remover('componentes', id);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  function nomeGrupo(id) {
    return grupos.find((g) => g.id === id)?.nome || `#${id}`;
  }

  return (
    <div>
      <h1>Componentes (Matérias)</h1>
      {erro && <p className="erro">{erro}</p>}

      <form onSubmit={onSubmit}>
        <input
          name="nome"
          placeholder="Nome da matéria"
          value={form.nome}
          onChange={onChange}
          required
        />
        <input
          name="carga_horaria"
          type="number"
          placeholder="Carga horária"
          value={form.carga_horaria}
          onChange={onChange}
        />
        <select name="grupo_id" value={form.grupo_id} onChange={onChange} required>
          <option value="" disabled>
            Selecione o grupo
          </option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </select>
        <button type="submit">{editandoId ? 'Salvar' : 'Adicionar'}</button>
        {editandoId && (
          <button
            type="button"
            className="secundario"
            onClick={() => {
              setEditandoId(null);
              setForm(VAZIO);
            }}
          >
            Cancelar
          </button>
        )}
      </form>

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Carga horária</th>
            <th>Grupo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {componentes.map((c) => (
            <tr key={c.id}>
              <td>{c.nome}</td>
              <td>{c.carga_horaria ?? '-'}</td>
              <td>{nomeGrupo(c.grupo_id)}</td>
              <td>
                <button className="secundario" onClick={() => editar(c)}>
                  Editar
                </button>{' '}
                <button className="perigo" onClick={() => remover(c.id)}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {componentes.length === 0 && (
            <tr>
              <td colSpan={4}>Nenhum componente cadastrado ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
