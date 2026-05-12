const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 12,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    changePercent: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 400,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastPriceUpdate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Asset', assetSchema);
