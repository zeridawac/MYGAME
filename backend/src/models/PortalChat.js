const mongoose = require('mongoose');

const portalMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ['user', 'admin', 'system'],
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    imageName: {
      type: String,
      default: '',
    },
    imageMime: {
      type: String,
      default: '',
    },
    imageSize: {
      type: Number,
      default: 0,
    },
    imagePath: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    mediaName: {
      type: String,
      default: '',
    },
    mediaMime: {
      type: String,
      default: '',
    },
    mediaSize: {
      type: Number,
      default: 0,
    },
    mediaPath: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['', 'image', 'video'],
      default: '',
    },
    rewardCoins: {
      type: Number,
      default: 0,
    },
    readByUserAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const rewardHistorySchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    coins: {
      type: Number,
      required: true,
      min: 1,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const portalChatSchema = new mongoose.Schema(
  {
    roomKey: {
      type: String,
      required: true,
      unique: true,
      default: 'main',
    },
    messages: {
      type: [portalMessageSchema],
      default: [],
    },
    coinBalance: {
      type: Number,
      default: 500,
      min: 0,
    },
    rewardHistory: {
      type: [rewardHistorySchema],
      default: [],
    },
    lastClearedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PortalChat', portalChatSchema);
