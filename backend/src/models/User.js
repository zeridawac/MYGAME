const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const bankDetailsSchema = new mongoose.Schema(
  {
    bankName: { type: String, trim: true, default: '' },
    fullName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 40,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    coins: {
      type: Number,
      default: 500,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    spinCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSpinDate: {
      type: Date,
      default: null,
    },
    lastLoginDate: {
      type: Date,
      default: null,
    },
    bankDetails: {
      type: bankDetailsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
