const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
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
