const asyncHandler = require('../utils/asyncHandler');
const presentUser = require('../utils/userPresenter');
const { logActivity } = require('../utils/activity');
const TradingTrade = require('../models/TradingTrade');

const TRADE_DURATION_MS = 60 * 1000;
const PAYOUT_MULTIPLIER = 1.75;
const MIN_TRADE_AMOUNT = 10;
const ASSET = {
  symbol: 'RDA/DH',
  nameAr: 'ريدا درهم',
  name: 'REDA Dirham',
};

const roundPrice = (value) => Math.round(value * 10000) / 10000;
const roundCoins = (value) => Math.round(value * 100) / 100;

const pseudoRandom = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const interpolate = (from, to, amount) => from + (to - from) * amount;

const smoothNoise = (value, seed = 0) => {
  const floor = Math.floor(value);
  const fraction = value - floor;
  const eased = fraction * fraction * (3 - 2 * fraction);
  return interpolate(pseudoRandom(floor + seed), pseudoRandom(floor + 1 + seed), eased) - 0.5;
};

const spikePulse = (timestamp, windowSeconds, seed, strength) => {
  const second = timestamp / 1000;
  const windowIndex = Math.floor(second / windowSeconds);
  const phase = (second % windowSeconds) / windowSeconds;
  const roll = pseudoRandom(windowIndex + seed);

  if (roll < 0.9) return 0;

  const direction = pseudoRandom(windowIndex + seed + 31) > 0.5 ? 1 : -1;
  const pulse = Math.sin(Math.PI * phase);
  const pullback = phase > 0.54 ? Math.sin(Math.PI * (phase - 0.54) / 0.46) * -0.42 : 0;

  return direction * strength * (pulse + pullback);
};

const getSimulatedPrice = (timestamp = Date.now()) => {
  const second = timestamp / 1000;
  const channelCenter = 100 + Math.sin(second / 138) * 3.8 + Math.sin(second / 41) * 1.15;
  const support = channelCenter - 7.4 - Math.sin(second / 95) * 0.75;
  const resistance = channelCenter + 7.4 + Math.cos(second / 91) * 0.75;
  const trend = Math.sin(second / 54) * 3.2 + Math.sin(second / 19) * 1.55;
  const momentum = Math.sin(second / 6.6) * 0.85 + smoothNoise(second / 2.4, 901) * 1.15;
  const liquiditySweep = spikePulse(timestamp, 18, 2100, 4.6) + spikePulse(timestamp, 31, 4100, 6.2);
  let price = channelCenter + trend + momentum + liquiditySweep;

  if (price > resistance) {
    price -= (price - resistance) * 0.62;
  }

  if (price < support) {
    price += (support - price) * 0.62;
  }

  price += smoothNoise(second / 0.95, 1777) * 0.42;

  return roundPrice(Math.max(10, price));
};

const buildCandles = (now = Date.now(), count = 96, intervalMs = 2500) => {
  const alignedNow = Math.floor(now / intervalMs) * intervalMs;
  const candles = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const start = alignedNow - index * intervalMs;
    const samples = Array.from({ length: 8 }, (_, sampleIndex) =>
      getSimulatedPrice(start + (intervalMs / 7) * sampleIndex)
    );
    const open = samples[0];
    const close = samples[samples.length - 1];
    const range = Math.max(...samples) - Math.min(...samples);
    const shadow = 0.1 + pseudoRandom(Math.floor(start / 1000) + 404) * 0.34 + range * 0.12;
    const high = roundPrice(Math.max(...samples) + shadow);
    const low = roundPrice(Math.max(1, Math.min(...samples) - shadow));
    const impulse = Math.abs(close - open) + range;
    const volume = Math.round(1400 + impulse * 1800 + pseudoRandom(Math.floor(start / 1000) + 909) * 5200);

    candles.push({
      time: new Date(start).toISOString(),
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return candles;
};

const presentTrade = (trade, currentPrice = getSimulatedPrice()) => ({
  id: trade._id.toString(),
  direction: trade.direction,
  amount: trade.amount,
  entryPrice: trade.entryPrice,
  finalPrice: trade.finalPrice,
  startTime: trade.startTime,
  expiryTime: trade.expiryTime,
  status: trade.status,
  payout: trade.payout,
  profit: trade.profit,
  expectedPayout: roundCoins(trade.amount * PAYOUT_MULTIPLIER),
  currentPrice,
  remainingSeconds: Math.max(0, Math.ceil((trade.expiryTime.getTime() - Date.now()) / 1000)),
  resultLabel: trade.status === 'won' ? 'ربحت' : trade.status === 'lost' ? 'خسرت' : '',
});

const presentMarket = () => ({
  asset: ASSET,
  price: getSimulatedPrice(),
  candles: buildCandles(),
  serverTime: new Date().toISOString(),
  durationSeconds: TRADE_DURATION_MS / 1000,
  payoutPercent: 75,
  minTradeAmount: MIN_TRADE_AMOUNT,
});

const settleExpiredTrades = async (user) => {
  const expiredTrades = await TradingTrade.find({
    user: user._id,
    status: 'pending',
    expiryTime: { $lte: new Date() },
  }).sort({ expiryTime: 1 });

  const settledTrades = [];
  let shouldSaveUser = false;

  for (const trade of expiredTrades) {
    const finalPrice = getSimulatedPrice(trade.expiryTime.getTime());
    const won = trade.direction === 'buy' ? finalPrice > trade.entryPrice : finalPrice < trade.entryPrice;

    trade.finalPrice = finalPrice;
    trade.status = won ? 'won' : 'lost';
    trade.payout = won ? roundCoins(trade.amount * PAYOUT_MULTIPLIER) : 0;
    trade.profit = won ? roundCoins(trade.payout - trade.amount) : -trade.amount;

    if (won) {
      user.coins = roundCoins(user.coins + trade.payout);
      shouldSaveUser = true;
    }

    await trade.save();
    settledTrades.push(trade);

    await logActivity({
      user: user._id,
      type: 'investment',
      title: won ? 'صفقة تداول رابحة' : 'صفقة تداول خاسرة',
      coins: won ? trade.profit : trade.profit,
      metadata: {
        direction: trade.direction,
        amount: trade.amount,
        entryPrice: trade.entryPrice,
        finalPrice,
        payout: trade.payout,
      },
    });
  }

  if (shouldSaveUser) {
    await user.save();
  }

  return settledTrades;
};

const getMarket = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    market: presentMarket(),
  });
});

const getTrades = asyncHandler(async (req, res) => {
  const settledTrades = await settleExpiredTrades(req.user);
  const currentPrice = getSimulatedPrice();
  const activeTrade = await TradingTrade.findOne({
    user: req.user._id,
    status: 'pending',
  }).sort({ createdAt: -1 });
  const recentTrades = await TradingTrade.find({
    user: req.user._id,
    status: { $ne: 'pending' },
  })
    .sort({ createdAt: -1 })
    .limit(12);

  res.json({
    success: true,
    market: presentMarket(),
    activeTrade: activeTrade ? presentTrade(activeTrade, currentPrice) : null,
    recentTrades: recentTrades.map((trade) => presentTrade(trade, currentPrice)),
    settledTrades: settledTrades.map((trade) => presentTrade(trade, currentPrice)),
    user: presentUser(req.user),
  });
});

const openTrade = asyncHandler(async (req, res) => {
  await settleExpiredTrades(req.user);

  const activeTrade = await TradingTrade.findOne({
    user: req.user._id,
    status: 'pending',
  });

  if (activeTrade) {
    res.status(400);
    throw new Error('لديك صفقة مفتوحة بالفعل. انتظر انتهاء العداد.');
  }

  const direction = String(req.body?.direction || '').trim();
  const amount = roundCoins(Number(req.body?.amount));

  if (!['buy', 'sell'].includes(direction)) {
    res.status(400);
    throw new Error('اختر نوع الصفقة: شراء أو بيع.');
  }

  if (!Number.isFinite(amount) || amount < MIN_TRADE_AMOUNT) {
    res.status(400);
    throw new Error(`أقل مبلغ للتداول هو ${MIN_TRADE_AMOUNT} كوين.`);
  }

  if (req.user.coins < amount) {
    res.status(400);
    throw new Error('رصيد الكوينات غير كاف لفتح هذه الصفقة.');
  }

  const startTime = new Date();
  const entryPrice = getSimulatedPrice(startTime.getTime());

  req.user.coins = roundCoins(req.user.coins - amount);
  await req.user.save();

  const trade = await TradingTrade.create({
    user: req.user._id,
    direction,
    amount,
    entryPrice,
    startTime,
    expiryTime: new Date(startTime.getTime() + TRADE_DURATION_MS),
  });

  await logActivity({
    user: req.user._id,
    type: 'investment',
    title: direction === 'buy' ? 'فتح صفقة شراء' : 'فتح صفقة بيع',
    coins: -amount,
    metadata: {
      direction,
      amount,
      entryPrice,
      expiryTime: trade.expiryTime,
    },
  });

  const currentPrice = getSimulatedPrice();

  res.status(201).json({
    success: true,
    message: 'تم فتح الصفقة بنجاح.',
    market: presentMarket(),
    activeTrade: presentTrade(trade, currentPrice),
    user: presentUser(req.user),
  });
});

module.exports = {
  getMarket,
  getTrades,
  openTrade,
};
