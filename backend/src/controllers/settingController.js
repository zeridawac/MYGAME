const asyncHandler = require('../utils/asyncHandler');
const { getCoinRate, getPlatformSettings, getStorePopup, coinsToUsd } = require('../utils/settings');

const getPublicSettings = asyncHandler(async (req, res) => {
  const [coinRate, storePopup, platform] = await Promise.all([getCoinRate(), getStorePopup(), getPlatformSettings()]);

  res.json({
    success: true,
    coinRate,
    storePopup,
    platform,
    examples: {
      coins: 600,
      usd: coinsToUsd(600, coinRate.coinsPerDollar),
    },
  });
});

module.exports = {
  getPublicSettings,
};
