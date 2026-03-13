import client from './client';

export const list = async (skip = 0, limit = 100, q = null) => {
  const params = { skip, limit };
  if (q) params.q = q;
  const { data } = await client.get('/empresas/', { params });
  return data; // { items: [...], total: N }
};

export const getById = async (id) => {
  const { data } = await client.get(`/empresas/${id}`);
  return data;
};

export const create = async (payload) => {
  const { data } = await client.post('/empresas/', payload);
  return data;
};

export const update = async (id, payload) => {
  const { data } = await client.put(`/empresas/${id}`, payload);
  return data;
};

export const remove = async (id) => {
  await client.delete(`/empresas/${id}`);
};

// Busqueda predictiva para evitar duplicados
export const search = async (q) => {
  const { data } = await client.get('/empresas/', { params: { skip: 0, limit: 10, q } });
  return data.items;
};

// Sub-recurso: comerciales
export const listComerciales = async (empresaId) => {
  const { data } = await client.get(`/empresas/${empresaId}/comerciales`);
  return data;
};

export const asignarComercial = async (empresaId, comercialId) => {
  const { data } = await client.post(`/empresas/${empresaId}/comerciales`, {
    comercial_id: comercialId,
  });
  return data;
};

export const desasignarComercial = async (empresaId, comercialId) => {
  await client.delete(`/empresas/${empresaId}/comerciales/${comercialId}`);
};

export const compartirCliente = async (empresaId, payload) => {
  const { data } = await client.post(`/empresas/${empresaId}/compartir`, payload);
  return data;
};

// Import/Export Excel
export const exportarExcel = async () => {
  const response = await client.get('/empresas/exportar', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'empresas.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const importarExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post('/empresas/importar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { creadas: N, errores: [...] }
};

// Sub-recurso: archivos
export const listArchivos = async (empresaId) => {
  const { data } = await client.get(`/empresas/${empresaId}/archivos`);
  return data;
};

export const subirArchivo = async (empresaId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post(`/empresas/${empresaId}/archivos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const descargarArchivo = (empresaId, archivoId) => {
  return client.get(`/empresas/${empresaId}/archivos/${archivoId}/descargar`, {
    responseType: 'blob',
  });
};

export const eliminarArchivo = async (empresaId, archivoId) => {
  await client.delete(`/empresas/${empresaId}/archivos/${archivoId}`);
};
