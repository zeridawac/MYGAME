const mongoose = require('mongoose');

const taskSubmissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    proofText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    proofImage: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
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
    adminNote: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
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

taskSubmissionSchema.index({ user: 1, task: 1 });

module.exports = mongoose.model('TaskSubmission', taskSubmissionSchema);
