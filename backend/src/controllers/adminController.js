const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');
const Announcement = require('../models/Announcement');
const Asset = require('../models/Asset');
const Withdrawal = require('../models/Withdrawal');
const Coupon = require('../models/Coupon');
const Task = require('../models/Task');
const TaskSubmission = require('../models/TaskSubmission');
const GameConfig = require('../models/GameConfig');
const ActivityLog = require('../models/ActivityLog');
const { defaultGameConfigs } = require('../utils/defaultData');
const { getCoinRate, setCoinRate } = require('../utils/settings');
const { logActivity } = require('../utils/activity');

const toNumberOrCurrent = (value, current, min = 0) => {
  if (value === undefined || value === null || value === '') return current;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return current;
  return parsed;
};

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.json({
    success: true,
    users,
  });
});

const updateUserStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  user.coins = toNumberOrCurrent(req.body.coins, user.coins);
  user.points = toNumberOrCurrent(req.body.points, user.points);
  user.level = toNumberOrCurrent(req.body.level, user.level, 1);
  user.xp = toNumberOrCurrent(req.body.xp, user.xp);
  user.streak = toNumberOrCurrent(req.body.streak, user.streak);

  await user.save();

  res.json({
    success: true,
    message: 'تم تحديث المستخدم',
    user,
  });
});

const createInviteCode = asyncHandler(async (req, res) => {
  const requestedCode = String(req.body.code || '').trim().toUpperCase();
  const code =
    requestedCode ||
    `REDA${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now()
      .toString()
      .slice(-2)}`;

  const inviteCode = await InviteCode.create({
    code,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء كود الدعوة',
    inviteCode,
  });
});

const listInviteCodes = asyncHandler(async (req, res) => {
  const inviteCodes = await InviteCode.find()
    .populate('usedBy', 'username')
    .populate('createdBy', 'username')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    inviteCodes,
  });
});

const listAdminAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find()
    .populate('createdBy', 'username')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    announcements,
  });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const body = String(req.body.body || '').trim();

  if (!title || !body) {
    res.status(400);
    throw new Error('العنوان والمحتوى مطلوبان');
  }

  const announcement = await Announcement.create({
    title,
    body,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء الإعلان',
    announcement,
  });
});

const listAssets = asyncHandler(async (req, res) => {
  const assets = await Asset.find().sort({ createdAt: -1 });

  res.json({
    success: true,
    assets,
  });
});

const createAsset = asyncHandler(async (req, res) => {
  const symbol = String(req.body.symbol || '').trim().toUpperCase();
  const name = String(req.body.name || '').trim();
  const nameAr = String(req.body.nameAr || '').trim();
  const price = Number(req.body.price);
  const description = String(req.body.description || '').trim();

  if (!symbol || !name || !nameAr || !Number.isFinite(price) || price <= 0) {
    res.status(400);
    throw new Error('بيانات الأصل غير مكتملة');
  }

  const asset = await Asset.create({
    symbol,
    name,
    nameAr,
    price,
    description,
    lastPriceUpdate: new Date(),
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء الأصل',
    asset,
  });
});

const updateAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) {
    res.status(404);
    throw new Error('الأصل غير موجود');
  }

  if (req.body.symbol !== undefined) asset.symbol = String(req.body.symbol).trim().toUpperCase();
  if (req.body.name !== undefined) asset.name = String(req.body.name).trim();
  if (req.body.nameAr !== undefined) asset.nameAr = String(req.body.nameAr).trim();
  if (req.body.description !== undefined) asset.description = String(req.body.description).trim();
  if (req.body.price !== undefined && Number(req.body.price) > 0) {
    asset.price = Number(req.body.price);
  }
  if (req.body.isActive !== undefined) {
    asset.isActive = Boolean(req.body.isActive);
  }

  await asset.save();

  res.json({
    success: true,
    message: 'تم تحديث الأصل',
    asset,
  });
});

const listWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await Withdrawal.find()
    .populate('user', 'username coins')
    .populate('reviewedBy', 'username')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    withdrawals,
  });
});

const updateWithdrawalStatus = asyncHandler(async (req, res) => {
  const status = String(req.body.status || '').trim();
  const adminNote = String(req.body.adminNote || '').trim();

  if (!['approved', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('حالة السحب غير صحيحة');
  }

  const withdrawal = await Withdrawal.findById(req.params.id);
  if (!withdrawal) {
    res.status(404);
    throw new Error('طلب السحب غير موجود');
  }

  if (withdrawal.status !== 'pending') {
    res.status(400);
    throw new Error('تمت مراجعة هذا الطلب مسبقا');
  }

  withdrawal.status = status;
  withdrawal.adminNote = adminNote;
  withdrawal.reviewedBy = req.user._id;
  withdrawal.reviewedAt = new Date();

  if (status === 'rejected') {
    await User.findByIdAndUpdate(withdrawal.user, { $inc: { coins: withdrawal.amount } });
  }

  await withdrawal.save();

  res.json({
    success: true,
    message: status === 'approved' ? 'تم قبول طلب السحب' : 'تم رفض الطلب وإرجاع العملات',
    withdrawal,
  });
});

const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().populate('createdBy', 'username').sort({ createdAt: -1 });

  res.json({ success: true, coupons });
});

const createCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const title = String(req.body.title || '').trim();
  const coins = Number(req.body.coins || 0);
  const points = Number(req.body.points || 0);
  const usageLimit = Number(req.body.usageLimit || 1);

  if (!code || (!coins && !points) || usageLimit < 1) {
    res.status(400);
    throw new Error('بيانات الكوبون غير مكتملة');
  }

  const coupon = await Coupon.create({
    code,
    title,
    coins,
    points,
    usageLimit,
    active: req.body.active !== false,
    oneTimePerUser: req.body.oneTimePerUser !== false,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء كوبون الهدية',
    coupon,
  });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error('الكوبون غير موجود');
  }

  if (req.body.code !== undefined) coupon.code = String(req.body.code).trim().toUpperCase();
  if (req.body.title !== undefined) coupon.title = String(req.body.title).trim();
  if (req.body.coins !== undefined) coupon.coins = Math.max(0, Number(req.body.coins));
  if (req.body.points !== undefined) coupon.points = Math.max(0, Number(req.body.points));
  if (req.body.usageLimit !== undefined) coupon.usageLimit = Math.max(1, Number(req.body.usageLimit));
  if (req.body.active !== undefined) coupon.active = Boolean(req.body.active);
  if (req.body.oneTimePerUser !== undefined) coupon.oneTimePerUser = Boolean(req.body.oneTimePerUser);

  await coupon.save();

  res.json({
    success: true,
    message: 'تم تحديث الكوبون',
    coupon,
  });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error('الكوبون غير موجود');
  }

  await coupon.deleteOne();

  res.json({
    success: true,
    message: 'تم حذف الكوبون',
  });
});

const listTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find().populate('createdBy', 'username').sort({ createdAt: -1 });

  res.json({ success: true, tasks });
});

const createTask = asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const rewardCoins = Number(req.body.rewardCoins || 0);
  const rewardPoints = Number(req.body.rewardPoints || 0);
  const link = String(req.body.link || '').trim();

  if (!title || !description || (!rewardCoins && !rewardPoints)) {
    res.status(400);
    throw new Error('بيانات المهمة غير مكتملة');
  }

  const task = await Task.create({
    title,
    description,
    rewardCoins,
    rewardPoints,
    link,
    active: req.body.active !== false,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء المهمة',
    task,
  });
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('المهمة غير موجودة');
  }

  if (req.body.title !== undefined) task.title = String(req.body.title).trim();
  if (req.body.description !== undefined) task.description = String(req.body.description).trim();
  if (req.body.rewardCoins !== undefined) task.rewardCoins = Math.max(0, Number(req.body.rewardCoins));
  if (req.body.rewardPoints !== undefined) task.rewardPoints = Math.max(0, Number(req.body.rewardPoints));
  if (req.body.link !== undefined) task.link = String(req.body.link).trim();
  if (req.body.active !== undefined) task.active = Boolean(req.body.active);

  await task.save();

  res.json({
    success: true,
    message: 'تم تحديث المهمة',
    task,
  });
});

const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('المهمة غير موجودة');
  }

  await task.deleteOne();

  res.json({
    success: true,
    message: 'تم حذف المهمة',
  });
});

const listTaskSubmissions = asyncHandler(async (req, res) => {
  const submissions = await TaskSubmission.find()
    .populate('user', 'username coins points')
    .populate('task', 'title')
    .populate('reviewedBy', 'username')
    .sort({ createdAt: -1 });

  res.json({ success: true, submissions });
});

const reviewTaskSubmission = asyncHandler(async (req, res) => {
  const status = String(req.body.status || '').trim();
  const adminNote = String(req.body.adminNote || '').trim();

  if (!['approved', 'rejected'].includes(status)) {
    res.status(400);
    throw new Error('حالة المراجعة غير صحيحة');
  }

  const submission = await TaskSubmission.findById(req.params.id).populate('task', 'title');
  if (!submission) {
    res.status(404);
    throw new Error('إرسال المهمة غير موجود');
  }

  if (submission.status !== 'pending') {
    res.status(400);
    throw new Error('تمت مراجعة هذا الإرسال مسبقا');
  }

  submission.status = status;
  submission.adminNote = adminNote;
  submission.reviewedBy = req.user._id;
  submission.reviewedAt = new Date();

  if (status === 'approved') {
    await User.findByIdAndUpdate(submission.user, {
      $inc: {
        coins: submission.rewardCoins,
        points: submission.rewardPoints,
      },
    });
    await logActivity({
      user: submission.user,
      type: 'task',
      title: `مهمة مقبولة: ${submission.task?.title || 'مهمة'}`,
      coins: submission.rewardCoins,
      points: submission.rewardPoints,
      metadata: { task: submission.task?._id },
    });
  }

  await submission.save();
  await submission.populate('user', 'username coins points');

  res.json({
    success: true,
    message: status === 'approved' ? 'تم قبول المهمة وإضافة المكافأة' : 'تم رفض المهمة',
    submission,
  });
});

const getCoinConversion = asyncHandler(async (req, res) => {
  const coinRate = await getCoinRate();

  res.json({ success: true, coinRate });
});

const updateCoinConversion = asyncHandler(async (req, res) => {
  const setting = await setCoinRate(req.body.coinsPerDollar);

  res.json({
    success: true,
    message: 'تم تحديث قيمة العملات',
    coinRate: setting.value,
  });
});

const listGameConfigs = asyncHandler(async (req, res) => {
  await Promise.all(
    defaultGameConfigs.map((config) =>
      GameConfig.findOneAndUpdate({ gameKey: config.gameKey }, { $setOnInsert: config }, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
    )
  );

  const gameConfigs = await GameConfig.find().sort({ gameKey: 1 });

  res.json({ success: true, gameConfigs });
});

const updateGameConfig = asyncHandler(async (req, res) => {
  const config = await GameConfig.findOne({ gameKey: req.params.gameKey });
  if (!config) {
    res.status(404);
    throw new Error('إعداد اللعبة غير موجود');
  }

  if (req.body.dailyLimit !== undefined) config.dailyLimit = Math.max(1, Number(req.body.dailyLimit));
  if (req.body.active !== undefined) config.active = Boolean(req.body.active);
  if (req.body.rewards !== undefined) {
    const rewards = Array.isArray(req.body.rewards) ? req.body.rewards : JSON.parse(req.body.rewards);
    config.rewards = rewards
      .filter((reward) => reward.label)
      .map((reward) => ({
        label: String(reward.label).trim(),
        coins: Math.max(0, Number(reward.coins || 0)),
        points: Math.max(0, Number(reward.points || 0)),
        xp: Math.max(0, Number(reward.xp || 0)),
        weight: Math.max(1, Number(reward.weight || 1)),
      }));
  }

  await config.save();

  res.json({
    success: true,
    message: 'تم تحديث إعداد اللعبة',
    gameConfig: config,
  });
});

const listActivity = asyncHandler(async (req, res) => {
  const activity = await ActivityLog.find()
    .populate('user', 'username coins points')
    .sort({ createdAt: -1 })
    .limit(80);

  res.json({ success: true, activity });
});

module.exports = {
  listUsers,
  updateUserStats,
  createInviteCode,
  listInviteCodes,
  listAdminAnnouncements,
  createAnnouncement,
  listAssets,
  createAsset,
  updateAsset,
  listWithdrawals,
  updateWithdrawalStatus,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  listTaskSubmissions,
  reviewTaskSubmission,
  getCoinConversion,
  updateCoinConversion,
  listGameConfigs,
  updateGameConfig,
  listActivity,
};
