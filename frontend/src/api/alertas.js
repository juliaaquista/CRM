import client from './client';

export const list = async (params = {}) => {
  const { data } = await client.get('/alertas/', { params });
  return data;
};

export const getById = async (id) => {
  const { data } = await client.get(`/alertas/${id}`);
  return data;
};

export const create = async (payload) => {
  const { data } = await client.post('/alertas/', payload);
  return data;
};

export const update = async (id, payload) => {
  const { data } = await client.put(`/alertas/${id}`, payload);
  return data;
};

export const remove = async (id) => {
  await client.delete(`/alertas/${id}`);
};

export const calendario = async (desde, hasta) => {
  const params = {};
  if (desde) params.desde = desde instanceof Date ? desde.toISOString().split('T')[0] : desde;
  if (hasta) params.hasta = hasta instanceof Date ? hasta.toISOString().split('T')[0] : hasta;
  const { data } = await client.get('/alertas/calendario', { params });
  return data;
};
