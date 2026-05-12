const asyncHandler = require('../utils/asyncHandler');
const presentUser = require('../utils/userPresenter');
const Asset = require('../models/Asset');
const Portfolio = require('../models/Portfolio');

const roundMoney = (value) => Math.round(value * 100) / 100;

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

module.exports = {
  listAssets,
  getPortfolio,
  buyAsset,
  sellAsset,
};
