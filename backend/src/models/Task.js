const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    rewardCoins: {
      type: Number,
      default: 0,
      min: 0,
    },
    rewardPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    link: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
