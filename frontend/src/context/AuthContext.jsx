import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, setToken as saveToken, removeToken } from '../utils/token';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar, verificar si hay token guardado
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch {
          removeToken();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const { access_token } = await authApi.login(email, password);
    saveToken(access_token);
    const userData = await authApi.getMe();
    setUser(userData);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  const isJefe = user?.rol === 'JEFE';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isJefe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
