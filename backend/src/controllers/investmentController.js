const asyncHandler = require('../utils/asyncHandler');
const presentUser = require('../utils/userPresenter');
const { startOfUtcDay } = require('../utils/dateUtils');
const { logActivity } = require('../utils/activity');
const Asset = require('../models/Asset');
const Portfolio = require('../models/Portfolio');
const GameHistory = require('../models/GameHistory');

const roundMoney = (value) => Math.round(value * 100) / 100;
const SPIN_INVEST_KEY = 'spinInvest';
const SPIN_INVEST_NAME = 'Spin & Invest';
const SPIN_INVEST_PREMIUM_COST = 75;
const SPIN_INVEST_COOLDOWN_MS = 20 * 1000;

const spinInvestOutcomes = [
  {
    key: 'portfolioBoost',
    label: 'x2 portfolio boost',
    labelAr: 'تعزيز المحفظة x2',
    kind: 'reward',
    rarity: 'rare',
    weight: 5,
    coinDelta: 95,
    portfolioBoostPercent: 12,
    marketShockPercent: 4.6,
    description: 'موجة تفاؤل قوية رفعت تقييم المحفظة بشكل مؤقت.',
  },
  {
    key: 'instantProfit',
    label: 'Instant profit',
    labelAr: 'ربح فوري',
    kind: 'reward',
    rarity: 'common',
    weight: 12,
    coinDelta: 120,
    portfolioBoostPercent: 4,
    marketShockPercent: 1.8,
    description: 'صفقة سريعة أضافت ربحا فوريا إلى الرصيد.',
  },
  {
    key: 'marketPump',
    label: 'Market pump',
    labelAr: 'ضخ في السوق',
    kind: 'reward',
    rarity: 'common',
    weight: 10,
    coinDelta: 55,
    portfolioBoostPercent: 7,
    marketShockPercent: 5.5,
    description: 'السوق تحرك للأعلى بعد موجة شراء مفاجئة.',
  },
  {
    key: 'whale',
    label: 'Lucky whale event',
    labelAr: 'حوت محظوظ',
    kind: 'reward',
    rarity: 'epic',
    weight: 4,
    coinDelta: 220,
    portfolioBoostPercent: 10,
    marketShockPercent: 8,
    description: 'حوت دخل السوق في اللحظة المناسبة.',
  },
  {
    key: 'vipBoost',
    label: 'VIP boost',
    labelAr: 'تعزيز VIP',
    kind: 'reward',
    rarity: 'rare',
    weight: 7,
    coinDelta: 85,
    pointsDelta: 30,
    xpDelta: 35,
    portfolioBoostPercent: 5,
    marketShockPercent: 2.4,
    description: 'تعزيز VIP منحك نقاطا وخبرة مع ربح متوازن.',
  },
  {
    key: 'multiplier',
    label: 'Coin multiplier',
    labelAr: 'مضاعف الكوينات',
    kind: 'reward',
    rarity: 'rare',
    weight: 6,
    coinDelta: 160,
    portfolioBoostPercent: 3,
    marketShockPercent: 2.2,
    description: 'المضاعف اشتغل، لكن الربح بقي محدودا للحفاظ على التوازن.',
  },
  {
    key: 'jackpot',
    label: 'Jackpot reward',
    labelAr: 'جاكبوت نادر',
    kind: 'reward',
    rarity: 'ultra',
    weight: 1,
    coinDelta: 650,
    pointsDelta: 90,
    xpDelta: 120,
    portfolioBoostPercent: 18,
    marketShockPercent: 12,
    description: 'جاكبوت نادر جدا، أقوى نتيجة في Spin & Invest.',
  },
  {
    key: 'mystery',
    label: 'Mystery box',
    labelAr: 'صندوق غامض',
    kind: 'reward',
    rarity: 'common',
    weight: 10,
    coinDelta: 70,
    portfolioBoostPercent: 2,
    marketShockPercent: 1.2,
    description: 'الصندوق الغامض أعطى مكافأة صغيرة وممتعة.',
  },
  {
    key: 'temporaryProfit',
    label: 'Temporary profit increase',
    labelAr: 'زيادة ربح مؤقتة',
    kind: 'reward',
    rarity: 'common',
    weight: 9,
    coinDelta: 75,
    portfolioBoostPercent: 6,
    marketShockPercent: 3,
    description: 'ارتفاع قصير في شهية السوق أعطى دفعة مؤقتة.',
  },
  {
    key: 'shield',
    label: 'Market protection shield',
    labelAr: 'درع حماية السوق',
    kind: 'reward',
    rarity: 'rare',
    weight: 7,
    coinDelta: 35,
    portfolioBoostPercent: 1,
    marketShockPercent: 0.6,
    description: 'درع الحماية خفف المخاطر ومنح مكافأة رمزية.',
  },
  {
    key: 'portfolioCrash',
    label: 'Portfolio crash',
    labelAr: 'هبوط المحفظة',
    kind: 'punishment',
    rarity: 'common',
    weight: 8,
    coinDelta: -35,
    portfolioBoostPercent: -7,
    marketShockPercent: -5.8,
    description: 'هبوط مفاجئ في السوق، التأثير الحقيقي محدود على الكوينات فقط.',
  },
  {
    key: 'rugPull',
    label: 'Rug pull',
    labelAr: 'Rug Pull',
    kind: 'punishment',
    rarity: 'rare',
    weight: 3,
    coinDelta: -80,
    portfolioBoostPercent: -12,
    marketShockPercent: -9,
    description: 'حركة قاسية، لكن النظام يمنع تدمير المحفظة الفعلية.',
  },
  {
    key: 'randomTax',
    label: 'Random tax',
    labelAr: 'ضريبة عشوائية',
    kind: 'punishment',
    rarity: 'common',
    weight: 8,
    coinDelta: -45,
    portfolioBoostPercent: -2,
    marketShockPercent: -1.5,
    description: 'ضريبة عشوائية خفيفة للحفاظ على توازن اللعبة.',
  },
  {
    key: 'marketDump',
    label: 'Market dump',
    labelAr: 'Dump في السوق',
    kind: 'punishment',
    rarity: 'common',
    weight: 6,
    coinDelta: -25,
    portfolioBoostPercent: -6,
    marketShockPercent: -6.4,
    description: 'تفريغ سريع من السوق، بدون حذف أي أصل من محفظتك.',
  },
  {
    key: 'temporaryFreeze',
    label: 'Temporary freeze',
    labelAr: 'تجميد مؤقت',
    kind: 'punishment',
    rarity: 'common',
    weight: 5,
    coinDelta: 0,
    portfolioBoostPercent: 0,
    marketShockPercent: -0.5,
    description: 'السوق توقف لحظة، لا ربح ولا خسارة مباشرة.',
  },
];

const pickWeighted = (items) => {
  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight || 1), 0);
  let ticket = Math.random() * totalWeight;

  for (const item of items) {
    ticket -= Number(item.weight || 1);
    if (ticket <= 0) return item;
  }

  return items[0];
};

const applyXp = (user, xp = 0) => {
  user.xp += xp;

  while (user.xp >= user.level * 100) {
    user.xp -= user.level * 100;
    user.level += 1;
  }
};

const updateMarketPrices = async () => {
  const assets = await Asset.find({ isActive: true }).sort({ symbol: 1 });
  const now = Date.now();

  await Promise.all(
    assets.map(async (asset) => {
      const lastUpdate = asset.lastPriceUpdate ? asset.lastPriceUpdate.getTime() : 0;
      if (now - lastUpdate < 30000) return;

      const movement = (Math.random() - 0.48) * 3;
      const nextPrice = Math.max(1, asset.price * (1 + movement / 100));
      asset.changePercent = roundMoney(movement);
      asset.price = roundMoney(nextPrice);
      asset.lastPriceUpdate = new Date(now);
      await asset.save();
    })
  );

  return Asset.find({ isActive: true }).sort({ symbol: 1 });
};

const getOrCreatePortfolio = async (userId) => {
  let portfolio = await Portfolio.findOne({ user: userId });

  if (!portfolio) {
    portfolio = await Portfolio.create({ user: userId, positions: [] });
  }

  return portfolio;
};

const listAssets = asyncHandler(async (req, res) => {
  const assets = await updateMarketPrices();

  res.json({
    success: true,
    assets,
  });
});

const getPortfolio = asyncHandler(async (req, res) => {
  await updateMarketPrices();
  const portfolio = await getOrCreatePortfolio(req.user._id);
  await portfolio.populate('positions.asset');

  const positions = portfolio.positions.map((position) => {
    const currentValue = position.quantity * position.asset.price;
    const investedValue = position.quantity * position.averageBuyPrice;

    return {
      asset: position.asset,
      quantity: position.quantity,
      averageBuyPrice: position.averageBuyPrice,
      currentValue: roundMoney(currentValue),
      profitLoss: roundMoney(currentValue - investedValue),
    };
  });

  const totalValue = positions.reduce((sum, position) => sum + position.currentValue, 0);

  res.json({
    success: true,
    positions,
    totalValue: roundMoney(totalValue),
  });
});

const buyAsset = asyncHandler(async (req, res) => {
  const assetId = req.body.assetId;
  const quantity = Number(req.body.quantity);

  if (!assetId || !Number.isFinite(quantity) || quantity <= 0) {
    res.status(400);
    throw new Error('اختر الأصل والكمية بشكل صحيح');
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    res.status(404);
    throw new Error('الأصل غير موجود');
  }

  const cost = roundMoney(asset.price * quantity);
  if (req.user.coins < cost) {
    res.status(400);
    throw new Error('رصيد العملات غير كاف');
  }

  const portfolio = await getOrCreatePortfolio(req.user._id);
  const existingPosition = portfolio.positions.find(
    (position) => position.asset.toString() === asset._id.toString()
  );

  if (existingPosition) {
    const oldTotal = existingPosition.quantity * existingPosition.averageBuyPrice;
    const newTotal = quantity * asset.price;
    existingPosition.quantity = roundMoney(existingPosition.quantity + quantity);
    existingPosition.averageBuyPrice = roundMoney(
      (oldTotal + newTotal) / existingPosition.quantity
    );
  } else {
    portfolio.positions.push({
      asset: asset._id,
      quantity: roundMoney(quantity),
      averageBuyPrice: asset.price,
    });
  }

  req.user.coins = roundMoney(req.user.coins - cost);
  await Promise.all([portfolio.save(), req.user.save()]);

  res.json({
    success: true,
    message: 'تم شراء الأصل بنجاح',
    cost,
    user: presentUser(req.user),
  });
});

const sellAsset = asyncHandler(async (req, res) => {
  const assetId = req.body.assetId;
  const quantity = Number(req.body.quantity);

  if (!assetId || !Number.isFinite(quantity) || quantity <= 0) {
    res.status(400);
    throw new Error('اختر الأصل والكمية بشكل صحيح');
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    res.status(404);
    throw new Error('الأصل غير موجود');
  }

  const portfolio = await getOrCreatePortfolio(req.user._id);
  const position = portfolio.positions.find(
    (item) => item.asset.toString() === asset._id.toString()
  );

  if (!position || position.quantity < quantity) {
    res.status(400);
    throw new Error('لا تملك كمية كافية للبيع');
  }

  const revenue = roundMoney(asset.price * quantity);
  position.quantity = roundMoney(position.quantity - quantity);
  req.user.coins = roundMoney(req.user.coins + revenue);

  portfolio.positions = portfolio.positions.filter((item) => item.quantity > 0);
  await Promise.all([portfolio.save(), req.user.save()]);

  res.json({
    success: true,
    message: 'تم بيع الأصل بنجاح',
    revenue,
    user: presentUser(req.user),
  });
});

const spinInvest = asyncHandler(async (req, res) => {
  const user = req.user;
  const wantsPremium = Boolean(req.body?.premium);
  const todayStart = startOfUtcDay();
  const [freeSpinsToday, lastSpin, portfolio] = await Promise.all([
    GameHistory.countDocuments({
      user: user._id,
      gameKey: SPIN_INVEST_KEY,
      createdAt: { $gte: todayStart },
      'metadata.isPremium': { $ne: true },
    }),
    GameHistory.findOne({ user: user._id, gameKey: SPIN_INVEST_KEY }).sort({ createdAt: -1 }),
    getOrCreatePortfolio(user._id),
  ]);

  if (lastSpin) {
    const elapsed = Date.now() - lastSpin.createdAt.getTime();

    if (elapsed < SPIN_INVEST_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((SPIN_INVEST_COOLDOWN_MS - elapsed) / 1000);
      res.status(429);
      throw new Error(`انتظر ${remainingSeconds} ثانية قبل اللفة التالية`);
    }
  }

  const freeSpinAvailable = freeSpinsToday < 1;

  if (!freeSpinAvailable && !wantsPremium) {
    res.status(400);
    throw new Error('استعملت اللفة المجانية اليوم. استعمل لفة بريميوم إذا أردت المتابعة.');
  }

  const cost = freeSpinAvailable && !wantsPremium ? 0 : SPIN_INVEST_PREMIUM_COST;

  if (cost > 0 && user.coins < cost) {
    res.status(400);
    throw new Error('رصيد الكوينات غير كاف للفة البريميوم');
  }

  await updateMarketPrices();
  await portfolio.populate('positions.asset');

  const portfolioTotal = portfolio.positions.reduce((sum, position) => {
    if (!position.asset) return sum;
    return sum + position.quantity * position.asset.price;
  }, 0);

  const pickedOutcome = { ...pickWeighted(spinInvestOutcomes) };
  pickedOutcome.coinDelta = Number(pickedOutcome.coinDelta || 0);
  pickedOutcome.pointsDelta = Number(pickedOutcome.pointsDelta || 0);
  pickedOutcome.xpDelta = Number(pickedOutcome.xpDelta || 0);

  if (pickedOutcome.key === 'portfolioBoost') {
    pickedOutcome.coinDelta += Math.min(180, Math.round(portfolioTotal * 0.04));
  }

  if (pickedOutcome.key === 'randomTax') {
    pickedOutcome.coinDelta = -Math.min(120, Math.max(20, Math.round(user.coins * 0.08)));
  }

  const surprise = Math.random() < 0.12 && pickedOutcome.kind === 'reward';
  const surpriseCoins = surprise ? Math.floor(15 + Math.random() * 46) : 0;
  const nearMiss = pickedOutcome.kind === 'punishment' || Math.random() < 0.22;
  const almostWon = nearMiss
    ? spinInvestOutcomes.find((item) => item.rarity === 'ultra')
    : null;
  const netCoins = pickedOutcome.coinDelta + surpriseCoins - cost;

  user.coins = roundMoney(Math.max(0, user.coins + netCoins));
  user.points += pickedOutcome.pointsDelta;
  applyXp(user, pickedOutcome.xpDelta);
  await user.save();

  const history = await GameHistory.create({
    user: user._id,
    gameKey: SPIN_INVEST_KEY,
    gameName: SPIN_INVEST_NAME,
    label: pickedOutcome.labelAr,
    coins: roundMoney(netCoins),
    points: pickedOutcome.pointsDelta,
    xp: pickedOutcome.xpDelta,
    metadata: {
      outcomeKey: pickedOutcome.key,
      rarity: pickedOutcome.rarity,
      isPremium: cost > 0,
      cost,
      coinDelta: pickedOutcome.coinDelta,
      surpriseCoins,
      portfolioBoostPercent: pickedOutcome.portfolioBoostPercent,
      marketShockPercent: pickedOutcome.marketShockPercent,
    },
  });

  await logActivity({
    user: user._id,
    type: 'investment',
    title: `${SPIN_INVEST_NAME}: ${pickedOutcome.labelAr}`,
    coins: roundMoney(netCoins),
    points: pickedOutcome.pointsDelta,
    xp: pickedOutcome.xpDelta,
    metadata: {
      gameKey: SPIN_INVEST_KEY,
      outcomeKey: pickedOutcome.key,
      rarity: pickedOutcome.rarity,
      cost,
      surpriseCoins,
    },
  });

  res.json({
    success: true,
    message: pickedOutcome.kind === 'punishment' ? 'تم تنفيذ اللفة مع تأثير سلبي محدود' : 'تم تنفيذ اللفة بنجاح',
    spin: {
      id: history._id,
      cost,
      isPremium: cost > 0,
      remainingFreeSpins: freeSpinAvailable && !wantsPremium ? 0 : Math.max(0, 1 - freeSpinsToday),
      cooldownSeconds: Math.ceil(SPIN_INVEST_COOLDOWN_MS / 1000),
      netCoins: roundMoney(netCoins),
      surpriseCoins,
      nearMiss,
      almostWon: almostWon
        ? {
            label: almostWon.label,
            labelAr: almostWon.labelAr,
            rarity: almostWon.rarity,
          }
        : null,
      luckStreak: Math.floor(1 + Math.random() * 6),
      portfolioTotal: roundMoney(portfolioTotal),
      outcome: {
        ...pickedOutcome,
        coinDelta: roundMoney(pickedOutcome.coinDelta),
      },
    },
    user: presentUser(user),
  });
});

module.exports = {
  listAssets,
  getPortfolio,
  buyAsset,
  sellAsset,
  spinInvest,
};
