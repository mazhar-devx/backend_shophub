const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },
    value: {
        type: Number,
        required: [true, 'Discount value is required'] // e.g., 10 for 10% or 10$
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: [true, 'Expiration date is required']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usageLimit: {
        type: Number,
        default: null // null means unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    }
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
