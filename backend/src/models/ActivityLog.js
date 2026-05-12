const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      enum: ['game', 'coupon', 'task', 'withdrawal', 'investment', 'admin'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    coins: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
    xp: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
