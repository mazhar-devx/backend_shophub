const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
    trim: true,
    maxlength: [40, 'A user name must have less than or equal to 40 characters'],
    minlength: [2, 'A user name must have more than or equal to 2 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'A user description must have less than or equal to 500 characters']
  },
  followers: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  savedVideos: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Video'
  }],
  savedSounds: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Video'
  }],
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  vendorName: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Allow multiple nulls for non-admins
    minlength: [2, 'Vendor name must have more than or equal to 2 characters'],
    maxlength: [40, 'Vendor name must have less than or equal to 40 characters']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'A password must have more than or equal to 8 characters'],
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  viewedProducts: [{
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  marketingOffers: [{
    code: String,
    message: String,
    receivedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    discountValue: Number,
    discountType: String
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function () {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return;

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
});

// Update passwordChangedAt property
userSchema.pre('save', function () {
  if (!this.isModified('password') || this.isNew) return;

  this.passwordChangedAt = Date.now() - 1000;
});

// Filter out inactive users
userSchema.pre(/^find/, function () {
  // this points to the current query
  this.find({ active: { $ne: false } });
});

// Compare passwords
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if user changed password after the token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

// Create password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;