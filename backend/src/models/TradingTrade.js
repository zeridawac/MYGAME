const mongoose = require('mongoose');

const tradingTradeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['buy', 'sell'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    entryPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    finalPrice: {
      type: Number,
      default: null,
    },
    startTime: {
      type: Date,
      required: true,
    },
    expiryTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'won', 'lost'],
      default: 'pending',
      index: true,
    },
    payout: {
      type: Number,
      default: 0,
      min: 0,
    },
    profit: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

tradingTradeSchema.index({ user: 1, status: 1, expiryTime: -1 });

module.exports = mongoose.model('TradingTrade', tradingTradeSchema);
