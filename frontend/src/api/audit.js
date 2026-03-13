import client from './client';

export const list = async ({ entidad, entidad_id, usuario_id, desde, hasta, skip = 0, limit = 50 } = {}) => {
  const params = { skip, limit };
  if (entidad) params.entidad = entidad;
  if (entidad_id != null) params.entidad_id = entidad_id;
  if (usuario_id != null) params.usuario_id = usuario_id;
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  const { data } = await client.get('/audit/', { params });
  return data; // { items: [...], total: N }
};
