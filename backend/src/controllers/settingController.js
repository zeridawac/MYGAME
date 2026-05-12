const asyncHandler = require('../utils/asyncHandler');
const { getCoinRate, coinsToUsd } = require('../utils/settings');

const getPublicSettings = asyncHandler(async (req, res) => {
  const coinRate = await getCoinRate();

  res.json({
    success: true,
    coinRate,
    examples: {
      coins: 600,
      usd: coinsToUsd(600, coinRate.coinsPerDollar),
    },
  });
});

module.exports = {
  getPublicSettings,
};
