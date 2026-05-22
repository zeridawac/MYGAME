import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/config.js';

const SettingsContext = createContext(null);

const defaultSettings = {
  platform: {
    maintenanceMode: false,
    storeEnabled: true,
  },
  storePopup: null,
  coinRate: null,
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings({
        platform: {
          ...defaultSettings.platform,
          ...(data.platform || {}),
        },
        storePopup: data.storePopup || null,
        coinRate: data.coinRate || null,
      });
    } catch {
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const value = useMemo(
    () => ({
      ...settings,
      loading,
      refreshSettings,
      updatePlatformLocal: (platform) =>
        setSettings((current) => ({
          ...current,
          platform: {
            ...current.platform,
            ...platform,
          },
        })),
    }),
    [loading, refreshSettings, settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings must be used inside SettingsProvider');
  }

  return value;
};
