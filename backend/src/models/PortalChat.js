const mongoose = require('mongoose');

const portalMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ['user', 'admin'],
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
    lastClearedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PortalChat', portalChatSchema);
