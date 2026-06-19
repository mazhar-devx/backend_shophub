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
  video: {
    type: String
  },
  posterType: {
    type: String,
    enum: ['image', 'video', 'none'],
    default: 'image'
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
  views: {
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
  isExpensive: {
    type: Boolean,
    default: false
  },
  isWebsite: {
    type: Boolean,
    default: false
  },
  liveLink: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true
  },
  whatsappNumber: {
    type: String,
    trim: true
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
  },
  vendor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A product must belong to a vendor (admin)']
  },
  googleMerchantId: {
    type: String,
    sparse: true
  },
  googleMerchantSyncStatus: {
    type: String,
    enum: ['pending', 'synced', 'error'],
    default: 'pending'
  },
  googleMerchantLastError: {
    type: String
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
productSchema.pre('save', async function () {
  if (!this.isModified('name') && !this.isModified('slug') && !this.isNew) return;

  // If slug is not provided or name is modified, generate/regenerate slug
  const baseString = this.slug || this.name;
  if (!baseString) return; // Prevent crashes if name is missing during early hooks
  
  let slugBase = baseString.toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with -
    .replace(/^-+|-+$/g, '');     // Remove leading/trailing -

  const Product = this.constructor;
  let slug = slugBase;
  let exists = await Product.findOne({ slug, _id: { $ne: this._id } });
  
  if (exists) {
    // If it exists, append a short random string instead of a loop for better performance
    // or use a timestamp based approach
    const shortId = Math.random().toString(36).substring(2, 7);
    slug = `${slugBase}-${shortId}`;
  }

  this.slug = slug;
});

// POST-SAVE MIDDLEWARE: Sync to Google Merchant Center
productSchema.post('save', async function (doc) {
  // Only sync if not already syncing to avoid loops, and if not a bulk operation
  // For simplicity, we just trigger the service. It handles init and credential checks.
  const GoogleMerchantService = require('../utils/googleMerchantService');
  
  // We run this without await to not block the response
  GoogleMerchantService.syncProduct(doc).catch(err => {
    console.error('[GoogleMerchant] Auto-sync failed:', err.message);
  });
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
