import client from './client';

// IMPORTANTE: Login usa form-urlencoded, NO JSON
export const login = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  const { data } = await client.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
};

export const getMe = async () => {
  const { data } = await client.get('/auth/me');
  return data;
};

export const registrarUsuario = async (payload) => {
  const { data } = await client.post('/auth/registro', payload);
  return data;
};

export const listUsuarios = async () => {
  const { data } = await client.get('/auth/usuarios');
  return data;
};

export const updateUsuario = async (id, payload) => {
  const { data } = await client.put(`/auth/usuarios/${id}`, payload);
  return data;
};

export const resetPassword = async (id, nueva_password) => {
  const { data } = await client.put(`/auth/usuarios/${id}/password`, { nueva_password });
  return data;
};
