const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A product must have a name'],
    trim: true,
    maxlength: [100, 'A product name must have less than or equal to 100 characters'],
    minlength: [2, 'A product name must have more than or equal to 2 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true
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
    required: [true, 'A product must have a category']
  },
  brand: {
    type: String,
    required: [true, 'A product must have a brand'],
    trim: true,
    maxlength: [50, 'A product brand must have less than or equal to 50 characters']
  },
  image: {
    type: String,
    required: [true, 'A product must have a main image']
  },
  images: {
    type: [String],
    required: [true, 'A product must have at least one image'],
    validate: {
      validator: function (v) {
        return v && v.length > 0;
      },
      message: 'A product must have at least one image'
    }
  },
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
    min: [0, 'Stock must be above or equal to 0'],
    default: 0
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
  }],
  shippingCost: {
    type: Number,
    default: 0
  },
  taxPercentage: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    enum: ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED'],
    default: 'PKR'
  },
  specifications: {
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        default: 'cm'
      }
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        default: 'g'
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create index for better query performance
productSchema.index({ price: 1, ratingsAverage: -1 });
// productSchema.index({ slug: 1 }); // Already defined in field

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
productSchema.pre('save', function (next) {
  if (!this.isModified('name') && !this.isNew) return next();

  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with -
      .replace(/^-+|-+$/g, '');     // Remove leading/trailing -

    // Append random string to ensure uniqueness if needed (simple collision avoidance)
    // For a real prod app, you'd check DB for existence. 
    // Using a timestamp suffix if duplicate logic isn't in controller
  }
  next();
});

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
