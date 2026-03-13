import client from './client';

export const list = async (params = {}) => {
  const { data } = await client.get('/productos/', { params });
  return data;
};

export const getById = async (id) => {
  const { data } = await client.get(`/productos/${id}`);
  return data;
};

export const create = async (payload) => {
  const { data } = await client.post('/productos/', payload);
  return data;
};

export const update = async (id, payload) => {
  const { data } = await client.put(`/productos/${id}`, payload);
  return data;
};

export const remove = async (id) => {
  await client.delete(`/productos/${id}`);
};

export const listCategorias = async () => {
  const { data } = await client.get('/productos/categorias');
  return data;
};

export const uploadFichaTecnica = async (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post(`/productos/${id}/ficha-tecnica`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const downloadFichaTecnica = async (id, filename) => {
  const response = await client.get(`/productos/${id}/ficha-tecnica`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || 'ficha_tecnica.pdf');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const deleteFichaTecnica = async (id) => {
  await client.delete(`/productos/${id}/ficha-tecnica`);
};
