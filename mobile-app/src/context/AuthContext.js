import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { setAuthToken } from '../api/client';

const TOKEN_KEY = 'reda_mobile_token';
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback(async (payload) => {
    await SecureStore.setItemAsync(TOKEN_KEY, payload.token);
    setAuthToken(payload.token);
    setToken(payload.token);
    setUser(payload.user);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!storedToken) return;

      setAuthToken(storedToken);
      const { data } = await api.get('/auth/me');
      setToken(storedToken);
      setUser(data.user);
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (payload) => {
      const { data } = await api.post('/auth/login', payload);
      await persistSession(data);
      return data.user;
    },
    [persistSession]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await api.post('/auth/register', payload);
      await persistSession(data);
      return data.user;
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
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
      updateUser
    }),
    [user, token, loading, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
