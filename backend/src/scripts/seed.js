const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');
const Asset = require('../models/Asset');
const Announcement = require('../models/Announcement');
const Coupon = require('../models/Coupon');
const Task = require('../models/Task');
const GameConfig = require('../models/GameConfig');
const { defaultAssets, defaultGameConfigs } = require('../utils/defaultData');
const { setCoinRate } = require('../utils/settings');

dotenv.config();

const seed = async () => {
  await connectDB();

  let admin = await User.findOne({ username: 'admin' }).select('+password');

  if (!admin) {
    admin = new User({
      username: 'admin',
    });
  }

  admin.password = 'admin123456';
  admin.isAdmin = true;
  admin.coins = 10000;
  admin.points = 5000;
  admin.level = 10;
  admin.xp = 0;
  admin.streak = 1;
  admin.lastLoginDate = new Date();
  await admin.save();

  await InviteCode.findOneAndUpdate(
    { code: 'ADMINFIRST' },
    {
      code: 'ADMINFIRST',
      used: false,
      usedBy: null,
      createdBy: admin._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Promise.all(
    defaultAssets.map((asset) =>
      Asset.findOneAndUpdate(
        { symbol: asset.symbol },
        { ...asset, isActive: true, lastPriceUpdate: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );

  await Promise.all(
    defaultGameConfigs.map((config) =>
      GameConfig.findOneAndUpdate(
        { gameKey: config.gameKey },
        { $setOnInsert: config },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );

  await setCoinRate(1000);

  await Coupon.findOneAndUpdate(
    { code: 'WELCOME600' },
    {
      code: 'WELCOME600',
      title: 'هدية البداية',
      coins: 600,
      points: 60,
      usageLimit: 100,
      active: true,
      oneTimePerUser: true,
      createdBy: admin._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const existingTask = await Task.findOne({ title: 'تابع إعلان البداية' });
  if (!existingTask) {
    await Task.create({
      title: 'تابع إعلان البداية',
      description: 'اكتب رسالة قصيرة تؤكد أنك قرأت إعلان البداية وفهمت طريقة اللعب.',
      rewardCoins: 120,
      rewardPoints: 80,
      active: true,
      createdBy: admin._id,
    });
  }

  const existingAnnouncement = await Announcement.findOne({ title: 'مرحبا بك في REDA INVEST GAME' });
  if (!existingAnnouncement) {
    await Announcement.create({
      title: 'مرحبا بك في REDA INVEST GAME',
      body: 'ابدأ بجمع العملات، جرّب عجلة الحظ، ثم ابن محفظتك الاستثمارية الافتراضية.',
      createdBy: admin._id,
    });
  }

  console.log('Seed completed');
  console.log('Admin username: admin');
  console.log('Admin password: admin123456');
  console.log('Invite code: ADMINFIRST');

  await mongoose.connection.close();
};

seed().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.connection.close();
  process.exit(1);
});
