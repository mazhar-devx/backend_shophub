const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Video must belong to a user']
  },
  videoUrl: {
    type: String,
    required: [true, 'Video must have a URL']
  },
  thumbnailUrl: {
    type: String
  },
  name: {
    type: String,
    required: [true, 'Video must have a name'],
    trim: true,
    maxlength: [100, 'Video name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  tags: [String],
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  likesCount: {
    type: Number,
    default: 0
  },
  soundId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Video'
  },
  productLink: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for like count
videoSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
videoSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Update likesCount before saving
videoSchema.pre('save', async function() {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
