const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const mensagem = data?.erro || `Erro ${res.status}`;
    throw new Error(mensagem);
  }

  return data;
}

// Pequeno client REST genérico usado pelas páginas do CRUD.
export const api = {
  listar: (recurso, query = '') => request(`/${recurso}${query}`),
  buscar: (recurso, id) => request(`/${recurso}/${id}`),
  criar: (recurso, body) =>
    request(`/${recurso}`, { method: 'POST', body: JSON.stringify(body) }),
  atualizar: (recurso, id, body) =>
    request(`/${recurso}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remover: (recurso, id) => request(`/${recurso}/${id}`, { method: 'DELETE' }),
};
