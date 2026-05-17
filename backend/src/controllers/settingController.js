const asyncHandler = require('../utils/asyncHandler');
const { getCoinRate, getStorePopup, coinsToUsd } = require('../utils/settings');

const getPublicSettings = asyncHandler(async (req, res) => {
  const [coinRate, storePopup] = await Promise.all([getCoinRate(), getStorePopup()]);

  res.json({
    success: true,
    coinRate,
    storePopup,
    examples: {
      coins: 600,
      usd: coinsToUsd(600, coinRate.coinsPerDollar),
    },
  });
});

module.exports = {
  getPublicSettings,
};
