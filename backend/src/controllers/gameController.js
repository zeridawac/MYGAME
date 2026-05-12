const asyncHandler = require('../utils/asyncHandler');
const presentUser = require('../utils/userPresenter');
const { isSameUtcDay, startOfUtcDay } = require('../utils/dateUtils');
const { defaultGameConfigs } = require('../utils/defaultData');
const { logActivity } = require('../utils/activity');
const GameConfig = require('../models/GameConfig');
const GameHistory = require('../models/GameHistory');
const SpinHistory = require('../models/SpinHistory');

const applyXp = (user, xp) => {
  user.xp += xp;

  while (user.xp >= user.level * 100) {
    user.xp -= user.level * 100;
    user.level += 1;
  }
};

const getConfig = async (gameKey) => {
  let config = await GameConfig.findOne({ gameKey });

  if (!config) {
    const defaultConfig = defaultGameConfigs.find((item) => item.gameKey === gameKey);
    config = await GameConfig.create(defaultConfig);
  }

  return config;
};

const pickReward = (rewards) => {
  const safeRewards = rewards?.length ? rewards : [{ label: 'مكافأة بسيطة', coins: 10, points: 5, xp: 5, weight: 1 }];
  const totalWeight = safeRewards.reduce((total, reward) => total + Number(reward.weight || 1), 0);
  let ticket = Math.random() * totalWeight;

  for (const reward of safeRewards) {
    ticket -= Number(reward.weight || 1);
    if (ticket <= 0) return reward;
  }

  return safeRewards[0];
};

const playGame = async (user, gameKey) => {
  const config = await getConfig(gameKey);

  if (!config.active) {
    const error = new Error('هذه اللعبة غير متاحة حاليا');
    error.statusCode = 400;
    throw error;
  }

  const todayStart = startOfUtcDay();
  const playsToday = await GameHistory.countDocuments({
    user: user._id,
    gameKey,
    createdAt: { $gte: todayStart },
  });

  if (playsToday >= config.dailyLimit) {
    const error = new Error('وصلت إلى الحد اليومي لهذه اللعبة');
    error.statusCode = 400;
    throw error;
  }

  const reward = pickReward(config.rewards);

  user.coins += reward.coins;
  user.points += reward.points;
  applyXp(user, reward.xp);

  if (gameKey === 'spin') {
    const now = new Date();
    if (!isSameUtcDay(user.lastSpinDate, now)) {
      user.spinCount = 0;
    }
    user.spinCount += 1;
    user.lastSpinDate = now;
  }

  await user.save();

  const history = await GameHistory.create({
    user: user._id,
    gameKey,
    gameName: config.nameAr,
    label: reward.label,
    coins: reward.coins,
    points: reward.points,
    xp: reward.xp,
  });

  if (gameKey === 'spin') {
    await SpinHistory.create({
      user: user._id,
      label: reward.label,
      coins: reward.coins,
      points: reward.points,
      xp: reward.xp,
    });
  }

  await logActivity({
    user: user._id,
    type: 'game',
    title: `${config.nameAr}: ${reward.label}`,
    coins: reward.coins,
    points: reward.points,
    xp: reward.xp,
    metadata: { gameKey },
  });

  return {
    config,
    reward: {
      label: reward.label,
      coins: reward.coins,
      points: reward.points,
      xp: reward.xp,
    },
    history,
    remainingPlays: Math.max(0, config.dailyLimit - playsToday - 1),
  };
};

const spinWheel = asyncHandler(async (req, res) => {
  const user = req.user;
  const now = new Date();

  if (!isSameUtcDay(user.lastSpinDate, now)) {
    user.spinCount = 0;
  }

  const config = await getConfig('spin');
  if (user.spinCount >= config.dailyLimit) {
    res.status(400);
    throw new Error('لقد استعملت محاولتي الدوران لهذا اليوم');
  }

  const result = await playGame(user, 'spin');

  res.json({
    success: true,
    message: 'تمت إضافة المكافأة إلى حسابك',
    reward: result.reward,
    remainingSpins: result.remainingPlays,
    history: result.history,
    user: presentUser(user),
  });
});

const playScratch = asyncHandler(async (req, res) => {
  const result = await playGame(req.user, 'scratch');

  res.json({
    success: true,
    message: 'تم ربح بطاقة الحظ',
    reward: result.reward,
    remainingPlays: result.remainingPlays,
    history: result.history,
    user: presentUser(req.user),
  });
});

const playLuckyBox = asyncHandler(async (req, res) => {
  const selectedBox = Number(req.body.selectedBox || 1);
  const result = await playGame(req.user, 'luckyBox');

  res.json({
    success: true,
    message: 'تم فتح صندوق الحظ',
    selectedBox,
    reward: result.reward,
    remainingPlays: result.remainingPlays,
    history: result.history,
    user: presentUser(req.user),
  });
});

const claimDailyReward = asyncHandler(async (req, res) => {
  const result = await playGame(req.user, 'dailyReward');

  res.json({
    success: true,
    message: 'تم استلام المكافأة اليومية',
    reward: result.reward,
    remainingPlays: result.remainingPlays,
    history: result.history,
    user: presentUser(req.user),
  });
});

const getSpinHistory = asyncHandler(async (req, res) => {
  const history = await GameHistory.find({ user: req.user._id, gameKey: 'spin' })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({
    success: true,
    history,
  });
});

const getGameHistory = asyncHandler(async (req, res) => {
  const history = await GameHistory.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30);

  res.json({
    success: true,
    history,
  });
});

const getGameSummary = asyncHandler(async (req, res) => {
  const configs = await Promise.all(defaultGameConfigs.map((item) => getConfig(item.gameKey)));
  const todayStart = startOfUtcDay();

  const games = await Promise.all(
    configs.map(async (config) => {
      const playsToday = await GameHistory.countDocuments({
        user: req.user._id,
        gameKey: config.gameKey,
        createdAt: { $gte: todayStart },
      });

      return {
        gameKey: config.gameKey,
        nameAr: config.nameAr,
        dailyLimit: config.dailyLimit,
        active: config.active,
        playsToday,
        remainingPlays: Math.max(0, config.dailyLimit - playsToday),
      };
    })
  );

  res.json({
    success: true,
    games,
  });
});

module.exports = {
  spinWheel,
  playScratch,
  playLuckyBox,
  claimDailyReward,
  getSpinHistory,
  getGameHistory,
  getGameSummary,
};
