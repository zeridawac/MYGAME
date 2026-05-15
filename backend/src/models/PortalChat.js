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
      required: true,
      trim: true,
      maxlength: 2000,
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
