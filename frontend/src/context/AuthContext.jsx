import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/config.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'reda_token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setToken(storedToken);
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const persistSession = useCallback((payload) => {
    localStorage.setItem(TOKEN_KEY, payload.token);
    setToken(payload.token);
    setUser(payload.user);
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    persistSession(data);
    return data.user;
  }, [persistSession]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    persistSession(data);
    return data.user;
  }, [persistSession]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      updateUser,
    }),
    [user, token, loading, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return value;
};
