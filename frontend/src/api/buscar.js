import client from './client';

export const buscar = async (q, limit = 10) => {
  const { data } = await client.get('/buscar/', { params: { q, limit } });
  return data;
};
