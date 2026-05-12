const asyncHandler = require('../utils/asyncHandler');
const presentUser = require('../utils/userPresenter');
const { logActivity } = require('../utils/activity');
const Coupon = require('../models/Coupon');
const CouponRedemption = require('../models/CouponRedemption');

const redeemCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();

  if (!code) {
    res.status(400);
    throw new Error('أدخل كود الهدية');
  }

  const coupon = await Coupon.findOne({ code });
  if (!coupon || !coupon.active) {
    res.status(400);
    throw new Error('كود الهدية غير صالح أو غير نشط');
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    res.status(400);
    throw new Error('تم استهلاك عدد استخدامات هذا الكود');
  }

  if (coupon.oneTimePerUser) {
    const previous = await CouponRedemption.findOne({
      user: req.user._id,
      coupon: coupon._id,
    });

    if (previous) {
      res.status(400);
      throw new Error('استعملت هذا الكود من قبل');
    }
  }

  req.user.coins += coupon.coins;
  req.user.points += coupon.points;
  coupon.usedCount += 1;

  const redemption = await CouponRedemption.create({
    user: req.user._id,
    coupon: coupon._id,
    code: coupon.code,
    coins: coupon.coins,
    points: coupon.points,
  });

  await Promise.all([req.user.save(), coupon.save()]);
  await logActivity({
    user: req.user._id,
    type: 'coupon',
    title: `هدية ${coupon.code}`,
    coins: coupon.coins,
    points: coupon.points,
    metadata: { coupon: coupon._id },
  });

  res.json({
    success: true,
    message: 'تم تفعيل الهدية وإضافة المكافأة',
    redemption,
    user: presentUser(req.user),
  });
});

const listMyRedemptions = asyncHandler(async (req, res) => {
  const redemptions = await CouponRedemption.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30);

  res.json({
    success: true,
    redemptions,
  });
});

module.exports = {
  redeemCoupon,
  listMyRedemptions,
};
