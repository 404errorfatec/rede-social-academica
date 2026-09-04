import { useEffect, useState } from 'react';
import { api } from '../api.js';

const VAZIO = { nome: '', curso: '', semestre: '', periodo: 'diurno' };

export default function GruposPage() {
  const [grupos, setGrupos] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      setGrupos(await api.listar('grupos'));
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
    try {
      if (editandoId) {
        await api.atualizar('grupos', editandoId, form);
      } else {
        await api.criar('grupos', form);
      }
      setForm(VAZIO);
      setEditandoId(null);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  function editar(grupo) {
    setEditandoId(grupo.id);
    setForm({
      nome: grupo.nome,
      curso: grupo.curso,
      semestre: grupo.semestre,
      periodo: grupo.periodo,
    });
  }

  async function remover(id) {
    setErro('');
    try {
      await api.remover('grupos', id);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <div>
      <h1>Grupos (Salas)</h1>
      {erro && <p className="erro">{erro}</p>}

      <form onSubmit={onSubmit}>
        <input
          name="nome"
          placeholder="Nome do grupo"
          value={form.nome}
          onChange={onChange}
          required
        />
        <input
          name="curso"
          placeholder="Curso"
          value={form.curso}
          onChange={onChange}
          required
        />
        <input
          name="semestre"
          placeholder="Semestre (ex: 2026/2)"
          value={form.semestre}
          onChange={onChange}
          required
        />
        <select name="periodo" value={form.periodo} onChange={onChange}>
          <option value="diurno">Diurno</option>
          <option value="noturno">Noturno</option>
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
            <th>Curso</th>
            <th>Semestre</th>
            <th>Período</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <tr key={g.id}>
              <td>{g.nome}</td>
              <td>{g.curso}</td>
              <td>{g.semestre}</td>
              <td>{g.periodo}</td>
              <td>
                <button className="secundario" onClick={() => editar(g)}>
                  Editar
                </button>{' '}
                <button className="perigo" onClick={() => remover(g.id)}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {grupos.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhum grupo cadastrado ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
