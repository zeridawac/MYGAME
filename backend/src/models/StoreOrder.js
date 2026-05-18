const mongoose = require('mongoose');

const storeOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreProduct',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    size: {
      type: String,
      trim: true,
      default: '',
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const storeOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [storeOrderItemSchema],
      required: true,
    },
    totalCoins: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['paid', 'cancelled'],
      default: 'paid',
      index: true,
    },
  },
  { timestamps: true }
);

storeOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StoreOrder', storeOrderSchema);
