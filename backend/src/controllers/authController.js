const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const presentUser = require('../utils/userPresenter');
const { isSameUtcDay, isYesterdayUtc } = require('../utils/dateUtils');
const User = require('../models/User');
const InviteCode = require('../models/InviteCode');

const normalizeUsername = (username) => String(username || '').trim().toLowerCase();
const normalizeInviteCode = (code) => String(code || '').trim().toUpperCase();

const register = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || '');
  const inviteCodeValue = normalizeInviteCode(req.body.inviteCode);

  if (!username || !password || !inviteCodeValue) {
    res.status(400);
    throw new Error('اسم المستخدم وكلمة المرور وكود الدعوة مطلوبة');
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  }

  const inviteCode = await InviteCode.findOne({ code: inviteCodeValue });
  if (!inviteCode || inviteCode.used) {
    res.status(400);
    throw new Error('كود الدعوة غير صالح أو مستخدم');
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    res.status(409);
    throw new Error('اسم المستخدم مستخدم بالفعل');
  }

  const user = await User.create({
    username,
    password,
    streak: 1,
    lastLoginDate: new Date(),
  });

  inviteCode.used = true;
  inviteCode.usedBy = user._id;
  await inviteCode.save();

  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: presentUser(user),
  });
});

const login = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || '');

  if (!username || !password) {
    res.status(400);
    throw new Error('اسم المستخدم وكلمة المرور مطلوبان');
  }

  const user = await User.findOne({ username }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('بيانات الدخول غير صحيحة');
  }

  const now = new Date();
  if (!isSameUtcDay(user.lastLoginDate, now)) {
    user.streak = isYesterdayUtc(user.lastLoginDate, now) ? user.streak + 1 : 1;
    user.lastLoginDate = now;
    await user.save();
  }

  res.json({
    success: true,
    token: generateToken(user._id),
    user: presentUser(user),
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: presentUser(req.user),
  });
});

module.exports = {
  register,
  login,
  me,
};
