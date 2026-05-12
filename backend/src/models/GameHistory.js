const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    gameKey: {
      type: String,
      required: true,
      trim: true,
      enum: ['spin', 'scratch', 'luckyBox', 'dailyReward'],
    },
    gameName: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
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
  },
  { timestamps: true }
);

gameHistorySchema.index({ user: 1, gameKey: 1, createdAt: -1 });

module.exports = mongoose.model('GameHistory', gameHistorySchema);
