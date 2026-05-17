const mongoose = require('mongoose');

const storeProductImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    path: { type: String, default: '' },
    name: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const storeProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2400,
    },
    category: {
      type: String,
      trim: true,
      default: 'منتجات رقمية',
      maxlength: 80,
      index: true,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 95,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: null,
      min: 0,
      max: 5,
    },
    promoBadge: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },
    sourceUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1200,
    },
    sourceProvider: {
      type: String,
      trim: true,
      default: '',
      maxlength: 40,
    },
    sourceCurrency: {
      type: String,
      trim: true,
      default: '',
      maxlength: 12,
    },
    sourcePriceAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    sourcePriceDh: {
      type: Number,
      default: null,
      min: 0,
    },
    sourceOriginalPriceAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    sourceOriginalPriceDh: {
      type: Number,
      default: null,
      min: 0,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    images: {
      type: [storeProductImageSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

storeProductSchema.index({ active: 1, featured: -1, createdAt: -1 });

module.exports = mongoose.model('StoreProduct', storeProductSchema);
