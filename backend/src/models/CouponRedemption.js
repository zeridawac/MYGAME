const mongoose = require('mongoose');

const couponRedemptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    coins: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

couponRedemptionSchema.index({ user: 1, coupon: 1 });

module.exports = mongoose.model('CouponRedemption', couponRedemptionSchema);
