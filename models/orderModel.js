const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: [true, 'Order item must belong to a product']
  },
  quantity: {
    type: Number,
    required: [true, 'Order item must have a quantity'],
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Order item must have a price']
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  taxPercentage: {
    type: Number,
    default: 0
  }
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Order must belong to a user']
  },
  items: [orderItemSchema],
  shippingAddress: {
    address: {
      type: String,
      required: [true, 'Order must have a shipping address']
    },
    city: {
      type: String,
      required: [true, 'Order must have a city']
    },
    postalCode: {
      type: String,
      required: [true, 'Order must have a postal code']
    },
    country: {
      type: String,
      required: [true, 'Order must have a country']
    },
    phone: {
      type: String,
      required: [true, 'Order must have a phone number']
    },
    location: {
      lat: Number,
      lng: Number,
      address: String // specific formatted address from map if available
    }
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    required: [true, 'Order must have a payment method'],
    enum: {
      values: ['credit_card', 'paypal', 'cash_on_delivery'],
      message: 'Payment method is either: credit_card, paypal, cash_on_delivery'
    }
  },
  paymentResult: {
    id: String,
    status: String,
    update_time: String,
    email_address: String
  },
  itemsPrice: {
    type: Number,
    required: [true, 'Order must have items price'],
    default: 0
  },
  taxPrice: {
    type: Number,
    required: [true, 'Order must have tax price'],
    default: 0
  },
  shippingPrice: {
    type: Number,
    required: [true, 'Order must have shipping price'],
    default: 0
  },
  totalPrice: {
    type: Number,
    required: [true, 'Order must have total price'],
    default: 0
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false
  },
  paidAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    required: true,
    default: false
  },
  deliveredAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Populate user and product references
orderSchema.pre(/^find/, function (next) {
  this.populate('user', 'name email')
    .populate({
      path: 'items.product',
      select: 'name price images'
    });
  next();
});

// Calculate total price before saving
orderSchema.pre('save', function (next) {
  // Calculate items price
  this.itemsPrice = this.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Calculate tax from per-item taxPercentage
  this.taxPrice = this.items.reduce((acc, item) => {
    return acc + (item.price * item.quantity * ((item.taxPercentage || 0) / 100));
  }, 0);

  // Calculate shipping from per-item shippingCost
  this.shippingPrice = this.items.reduce((acc, item) => {
    return acc + (item.shippingCost || 0) * item.quantity;
  }, 0);

  // Calculate total price
  this.totalPrice = this.itemsPrice + this.taxPrice + this.shippingPrice;

  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
