const Setting = require('../models/Setting');

const DEFAULT_COINS_PER_DOLLAR = 1000;

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

module.exports = {
  DEFAULT_COINS_PER_DOLLAR,
  getCoinRate,
  setCoinRate,
  coinsToUsd,
};
