import client from './client';

export const list = async (params = {}) => {
  const { data } = await client.get('/contactos/', { params });
  return data;
};

export const getById = async (id) => {
  const { data } = await client.get(`/contactos/${id}`);
  return data;
};

export const create = async (payload) => {
  const { data } = await client.post('/contactos/', payload);
  return data;
};

export const update = async (id, payload) => {
  const { data } = await client.put(`/contactos/${id}`, payload);
  return data;
};

export const remove = async (id) => {
  await client.delete(`/contactos/${id}`);
};
