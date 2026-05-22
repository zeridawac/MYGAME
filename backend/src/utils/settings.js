const Setting = require('../models/Setting');

const DEFAULT_COINS_PER_DOLLAR = 1000;
const DEFAULT_STORE_POPUP = {
  enabled: true,
  title: 'إعلان المتجر',
  message:
    'تم إطلاق متجر جديد داخل المنصة. يمكنك الآن اختيار منتجات متنوعة والدفع باستعمال الكوينات فقط. سيتم إيصال المنتجات قريباً فور فتح الموقع بشكل كامل.',
  buttonText: 'دخول المتجر',
  targetPath: '/store',
};
const DEFAULT_PLATFORM_SETTINGS = {
  maintenanceMode: false,
  storeEnabled: true,
};

const getCoinRate = async () => {
  const setting = await Setting.findOne({ key: 'coinConversion' });
  const coinsPerDollar = Number(setting?.value?.coinsPerDollar || DEFAULT_COINS_PER_DOLLAR);

  return {
    coinsPerDollar,
  };
};

const setCoinRate = async (coinsPerDollar) => {
  const parsed = Number(coinsPerDollar);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('قيمة التحويل غير صحيحة');
  }

  return Setting.findOneAndUpdate(
    { key: 'coinConversion' },
    { value: { coinsPerDollar: parsed } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const coinsToUsd = (coins, coinsPerDollar) => {
  const value = Number(coins || 0) / Number(coinsPerDollar || DEFAULT_COINS_PER_DOLLAR);
  return Math.round(value * 100) / 100;
};

const getStorePopup = async () => {
  const setting = await Setting.findOne({ key: 'storePopup' });

  return {
    ...DEFAULT_STORE_POPUP,
    ...(setting?.value || {}),
  };
};

const setStorePopup = async (payload = {}) => {
  const nextValue = {
    enabled: payload.enabled !== false,
    title: String(payload.title || DEFAULT_STORE_POPUP.title).trim(),
    message: String(payload.message || DEFAULT_STORE_POPUP.message).trim(),
    buttonText: String(payload.buttonText || DEFAULT_STORE_POPUP.buttonText).trim(),
    targetPath: String(payload.targetPath || DEFAULT_STORE_POPUP.targetPath).trim() || '/store',
  };

  return Setting.findOneAndUpdate(
    { key: 'storePopup' },
    { value: nextValue },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const getPlatformSettings = async () => {
  const setting = await Setting.findOne({ key: 'platformSettings' });

  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...(setting?.value || {}),
  };
};

const setPlatformSettings = async (payload = {}) => {
  const current = await getPlatformSettings();
  const nextValue = {
    ...current,
    maintenanceMode:
      payload.maintenanceMode === undefined ? current.maintenanceMode : Boolean(payload.maintenanceMode),
    storeEnabled: payload.storeEnabled === undefined ? current.storeEnabled : Boolean(payload.storeEnabled),
  };

  return Setting.findOneAndUpdate(
    { key: 'platformSettings' },
    { value: nextValue },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = {
  DEFAULT_COINS_PER_DOLLAR,
  DEFAULT_STORE_POPUP,
  DEFAULT_PLATFORM_SETTINGS,
  getCoinRate,
  getPlatformSettings,
  getStorePopup,
  setCoinRate,
  setPlatformSettings,
  setStorePopup,
  coinsToUsd,
};
