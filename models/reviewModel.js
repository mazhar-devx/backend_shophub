const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [true, 'Review cannot be empty'],
    trim: true,
    maxlength: [2000, 'A review must have less than or equal to 2000 characters']
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0'],
    required: [true, 'A review must have a rating']
  },
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: [true, 'Review must belong to a product']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: function() { return !this.isDummy; }
  },
  isDummy: {
    type: Boolean,
    default: false
  },
  dummyName: {
    type: String,
    trim: true
  },
  dummyPhoto: {
    type: String,
    default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  aiReply: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create index for better query performance
// We no longer enforce uniqueness at the DB level to allow multiple AI dummy reviews.
// Uniqueness for real users is handled in the reviewController.
reviewSchema.index({ product: 1, user: 1 });
// Also add an index for dummy reviews to avoid any implicit collisions if needed, 
// but the main goal is to let dummy reviews coexist with the same product ID.

// Populate user references
reviewSchema.pre(/^find/, function () {
  this.populate({
    path: 'user',
    select: 'name photo'
  });
});

// Calculate average ratings for a product
reviewSchema.statics.calcAverageRatings = async function (productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId }
    },
    {
      $group: {
        _id: '$product',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await this.model('Product').findByIdAndUpdate(productId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await this.model('Product').findByIdAndUpdate(productId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// Update product ratings after a review is saved
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.product);
});

// Update product ratings after a review is removed or updated
reviewSchema.post(/^findOneAnd/, function (doc) {
  if (doc) {
    doc.constructor.calcAverageRatings(doc.product);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;