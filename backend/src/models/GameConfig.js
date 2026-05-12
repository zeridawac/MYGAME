const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    coins: {
      type: Number,
      default: 0,
      min: 0,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    weight: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const gameConfigSchema = new mongoose.Schema(
  {
    gameKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ['spin', 'scratch', 'luckyBox', 'dailyReward'],
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },
    dailyLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    active: {
      type: Boolean,
      default: true,
    },
    rewards: {
      type: [rewardSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GameConfig', gameConfigSchema);
