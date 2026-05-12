const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'حدث خطأ غير متوقع';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join('، ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `${field} مستخدم بالفعل`;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'جلسة الدخول منتهية أو غير صالحة';
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${req.method} ${req.originalUrl}]`, message);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
