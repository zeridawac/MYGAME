const mongoose = require('mongoose');

const bankSnapshotSchema = new mongoose.Schema(
  {
    bankName: String,
    fullName: String,
    accountNumber: String,
    phone: String,
  },
  { _id: false }
);

const withdrawalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    bankSnapshot: {
      type: bankSnapshotSchema,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: 400,
    },
    adminNote: {
      type: String,
      trim: true,
      default: '',
      maxlength: 400,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
