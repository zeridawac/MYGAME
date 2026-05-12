const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    averageBuyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    positions: {
      type: [positionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Portfolio', portfolioSchema);
