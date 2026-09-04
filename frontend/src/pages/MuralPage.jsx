import { useEffect, useState } from 'react';
import { api } from '../api.js';

const VAZIO = { titulo: '', conteudo: '', tipo: 'aviso', grupo_id: '' };

export default function MuralPage() {
  const [avisos, setAvisos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const [listaAvisos, listaGrupos] = await Promise.all([
        api.listar('mural'),
        api.listar('grupos'),
      ]);
      setAvisos(listaAvisos);
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
    try {
      await api.criar('mural', { ...form, grupo_id: Number(form.grupo_id) });
      setForm(VAZIO);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function remover(id) {
    setErro('');
    try {
      await api.remover('mural', id);
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
      <h1>Mural (avisos, horários, labs)</h1>
      {erro && <p className="erro">{erro}</p>}

      <form onSubmit={onSubmit}>
        <input
          name="titulo"
          placeholder="Título"
          value={form.titulo}
          onChange={onChange}
          required
        />
        <input
          name="conteudo"
          placeholder="Conteúdo"
          value={form.conteudo}
          onChange={onChange}
          required
        />
        <select name="tipo" value={form.tipo} onChange={onChange}>
          <option value="aviso">Aviso</option>
          <option value="horario">Horário</option>
          <option value="lab">Lab</option>
        </select>
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
        <button type="submit">Publicar</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Tipo</th>
            <th>Grupo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {avisos.map((a) => (
            <tr key={a.id}>
              <td>
                <strong>{a.titulo}</strong>
                <br />
                <small>{a.conteudo}</small>
              </td>
              <td>{a.tipo}</td>
              <td>{nomeGrupo(a.grupo_id)}</td>
              <td>
                <button className="perigo" onClick={() => remover(a.id)}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {avisos.length === 0 && (
            <tr>
              <td colSpan={4}>Nenhum aviso publicado ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
