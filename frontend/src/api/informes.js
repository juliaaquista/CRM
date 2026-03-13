import client from './client';

export const getResumen = async (filters = {}) => {
  const params = {};
  if (filters.desde) params.desde = filters.desde;
  if (filters.hasta) params.hasta = filters.hasta;
  if (filters.comercial_id) params.comercial_id = filters.comercial_id;
  if (filters.empresa_id) params.empresa_id = filters.empresa_id;
  if (filters.producto_id) params.producto_id = filters.producto_id;
  if (filters.estado_oferta) params.estado_oferta = filters.estado_oferta;
  if (filters.origen) params.origen = filters.origen;
  const { data } = await client.get('/informes/resumen', { params });
  return data;
};
