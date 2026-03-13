import client from './client';

export const list = async (params = {}) => {
  const { data } = await client.get('/ofertas/', { params });
  return data;
};

export const getById = async (id) => {
  const { data } = await client.get(`/ofertas/${id}`);
  return data;
};

export const create = async (payload) => {
  const { data } = await client.post('/ofertas/', payload);
  return data;
};

export const update = async (id, payload) => {
  const { data } = await client.put(`/ofertas/${id}`, payload);
  return data;
};

export const remove = async (id) => {
  await client.delete(`/ofertas/${id}`);
};

export const listKanban = async () => {
  const { data } = await client.get('/ofertas/kanban');
  return data;
};
