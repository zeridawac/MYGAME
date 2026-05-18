import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/config.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'reda_token';
const PENDING_LOCATION_KEY = 'reda_pending_location';

const readPendingLocation = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_LOCATION_KEY) || 'null');
  } catch {
    return null;
  }
};

const withPendingLocation = (payload) => {
  const location = readPendingLocation();
  return location ? { ...payload, location } : payload;
};

const timezoneLocation = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (timezone === 'Africa/Casablanca') {
    return { timezone, country: 'Morocco', city: 'Casablanca' };
  }

  const parts = timezone.split('/');
  return { timezone, country: parts[0] || '', city: (parts[1] || '').replace(/_/g, ' ') };
};

const browserLocationPayload = (position) => ({
  ...timezoneLocation(),
  permission: 'granted',
  unavailable: false,
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  timestamp: new Date(position.timestamp || Date.now()).toISOString(),
  capturedAt: new Date().toISOString(),
});

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

  useEffect(() => {
    if (!token || !user || !navigator.geolocation) {
      return undefined;
    }

    let cancelled = false;

    const syncLocation = async () => {
      try {
        if (navigator.permissions?.query) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (permission.state !== 'granted') return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (cancelled) return;
            try {
              const { data } = await api.patch('/auth/location', { location: browserLocationPayload(position) });
              if (data.user && !cancelled) setUser(data.user);
            } catch {
              // Location refresh should never interrupt the app.
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 9000, maximumAge: 2 * 60 * 1000 }
        );
      } catch {
        // Some browsers do not expose Permissions API consistently.
      }
    };

    syncLocation();
    const intervalId = window.setInterval(syncLocation, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, user?.id]);

  const persistSession = useCallback((payload) => {
    localStorage.setItem(TOKEN_KEY, payload.token);
    setToken(payload.token);
    setUser(payload.user);
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', withPendingLocation(credentials));
    persistSession(data);
    localStorage.removeItem(PENDING_LOCATION_KEY);
    return data.user;
  }, [persistSession]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', withPendingLocation(payload));
    persistSession(data);
    localStorage.removeItem(PENDING_LOCATION_KEY);
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
