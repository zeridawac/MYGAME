const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { getRequestIp } = require('../utils/requestMeta');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401);
    throw new Error('يجب تسجيل الدخول أولا');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.userId);

  if (!user) {
    res.status(401);
    throw new Error('جلسة الدخول غير صالحة');
  }

  req.user = user;
  const now = new Date();
  const lastActiveAt = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
  if (!lastActiveAt || now.getTime() - lastActiveAt > 60 * 1000) {
    user.lastActiveAt = now;
    user.ipAddress = getRequestIp(req);
    await user.save();
  }
  next();
});

const adminOnly = (req, res, next) => {
  if (!req.user?.isAdmin) {
    res.status(403);
    throw new Error('هذه الصفحة مخصصة للمدير فقط');
  }

  next();
};

module.exports = {
  protect,
  adminOnly,
};
