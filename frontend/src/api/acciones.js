import client from './client';

export const list = async (params = {}) => {
  const { data } = await client.get('/acciones/', { params });
  return data;
};

export const calendario = async (desde, hasta) => {
  const params = {};
  if (desde) params.desde = desde.toISOString();
  if (hasta) params.hasta = hasta.toISOString();
  const { data } = await client.get('/acciones/calendario', { params });
  return data;
};

export const getById = async (id) => {
  const { data } = await client.get(`/acciones/${id}`);
  return data;
};

export const create = async (payload) => {
  const { data } = await client.post('/acciones/', payload);
  return data;
};

export const update = async (id, payload) => {
  const { data } = await client.put(`/acciones/${id}`, payload);
  return data;
};

export const remove = async (id) => {
  await client.delete(`/acciones/${id}`);
};
