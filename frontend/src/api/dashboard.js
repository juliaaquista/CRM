import client from './client';

export const miResumen = async () => {
  const { data } = await client.get('/dashboard/mi-resumen');
  return data;
};
