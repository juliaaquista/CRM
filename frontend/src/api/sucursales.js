import client from './client';

export const listByEmpresa = async (empresaId) => {
  const { data } = await client.get(`/empresas/${empresaId}/sucursales/`);
  return data;
};

export const create = async (empresaId, payload) => {
  const { data } = await client.post(`/empresas/${empresaId}/sucursales/`, payload);
  return data;
};

export const update = async (empresaId, sucursalId, payload) => {
  const { data } = await client.put(`/empresas/${empresaId}/sucursales/${sucursalId}`, payload);
  return data;
};

export const remove = async (empresaId, sucursalId) => {
  await client.delete(`/empresas/${empresaId}/sucursales/${sucursalId}`);
};

export const listAll = async () => {
  const { data } = await client.get('/sucursales/');
  return data;
};
