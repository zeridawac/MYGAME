const asyncHandler = require('../utils/asyncHandler');
const presentUser = require('../utils/userPresenter');
const { getCoinRate, coinsToUsd } = require('../utils/settings');
const Portfolio = require('../models/Portfolio');
const Announcement = require('../models/Announcement');
const Withdrawal = require('../models/Withdrawal');
const ActivityLog = require('../models/ActivityLog');

const getDashboard = asyncHandler(async (req, res) => {
  const portfolio = await Portfolio.findOne({ user: req.user._id }).populate('positions.asset');
  const announcements = await Announcement.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title body createdAt');
  const pendingWithdrawals = await Withdrawal.countDocuments({
    user: req.user._id,
    status: 'pending',
  });
  const coinRate = await getCoinRate();
  const recentActivity = await ActivityLog.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(8);

  const positions = portfolio?.positions || [];
  const currentValue = positions.reduce((total, position) => {
    if (!position.asset) return total;
    return total + position.quantity * position.asset.price;
  }, 0);

  const investedValue = positions.reduce((total, position) => {
    return total + position.quantity * position.averageBuyPrice;
  }, 0);

  res.json({
    success: true,
    user: presentUser(req.user),
    portfolioSummary: {
      positionsCount: positions.length,
      currentValue: Math.round(currentValue),
      investedValue: Math.round(investedValue),
      profitLoss: Math.round(currentValue - investedValue),
    },
    pendingWithdrawals,
    announcements,
    coinRate: {
      coinsPerDollar: coinRate.coinsPerDollar,
      dollarEquivalent: coinsToUsd(req.user.coins, coinRate.coinsPerDollar),
    },
    recentActivity,
  });
});

module.exports = {
  getDashboard,
};
