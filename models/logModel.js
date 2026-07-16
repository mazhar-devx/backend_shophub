const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'A log must have a message'],
    trim: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'error'],
    default: 'info'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
