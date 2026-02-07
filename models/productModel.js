const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A product must have a name'],
    trim: true,
    maxlength: [100, 'A product name must have less than or equal to 100 characters'],
    minlength: [2, 'A product name must have more than or equal to 2 characters']
  },
  description: {
    type: String,
    required: [true, 'A product must have a description'],
    trim: true,
    maxlength: [2000, 'A product description must have less than or equal to 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'A product must have a price'],
    min: [0, 'Price must be above 0']
  },
  category: {
    type: String,
    required: [true, 'A product must have a category'],
    enum: {
      values: ['electronics', 'clothing', 'books', 'home', 'beauty', 'sports', 'other'],
      message: 'Category is either: electronics, clothing, books, home, beauty, sports, other'
    }
  },
  brand: {
    type: String,
    required: [true, 'A product must have a brand'],
    trim: true,
    maxlength: [50, 'A product brand must have less than or equal to 50 characters']
  },
  images: [{
    type: String,
    required: [true, 'A product must have at least one image']
  }],
  ratingsAverage: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be above 0'],
    max: [5, 'Rating must be below 5.0'],
    set: (val) => Math.round(val * 10) / 10 // 4.666666, 46.6666, 47, 4.7
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    required: [true, 'A product must have stock quantity'],
    min: [0, 'Stock must be above or equal to 0']
  },
  sold: {
    type: Number,
    default: 0
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount percentage must be above or equal to 0'],
    max: [100, 'Discount percentage must be below or equal to 100']
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create index for better query performance
productSchema.index({ price: 1, ratingsAverage: -1 });
productSchema.index({ slug: 1 });

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function () {
  return this.price - (this.price * this.discountPercentage / 100);
});

// Virtual for reviews (populated from Review collection)
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id'
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;