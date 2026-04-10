import axios from 'axios';
import { getToken, removeToken } from '../utils/token';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002/api',
});

// Interceptor: agregar JWT token a cada request
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: manejar 401 globalmente (solo para sesiones expiradas, no para el login en sí)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isLoginRequest = url.includes('/auth/login');
      const hadToken = !!getToken();
      // Solo forzar logout si había un token válido (sesión expirada) y no es el request de login
      if (hadToken && !isLoginRequest) {
        removeToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
