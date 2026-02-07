const Newsletter = require('../models/newsletterModel');
const Coupon = require('../models/couponModel');
const User = require('../models/userModel'); // Import User
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const crypto = require('crypto');

// Subscribe to newsletter
exports.subscribe = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return next(new AppError('Please provide an email address', 400));
    }

    // Check if exists
    const existing = await Newsletter.findOne({ email });
    if (existing) {
        return res.status(200).json({
            status: 'success',
            message: 'Already subscribed!'
        });
    }

    const newSub = await Newsletter.create({ email });

    res.status(201).json({
        status: 'success',
        data: {
            newsletter: newSub
        }
    });
});

// Admin: Get all subscribers
exports.getSubscribers = catchAsync(async (req, res, next) => {
    const subscribers = await Newsletter.find().sort('-subscribedAt');

    res.status(200).json({
        status: 'success',
        results: subscribers.length,
        data: {
            subscribers
        }
    });
});

// Coupons
exports.createCoupon = catchAsync(async (req, res, next) => {
    const newCoupon = await Coupon.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            coupon: newCoupon
        }
    });
});

exports.getAllCoupons = catchAsync(async (req, res, next) => {
    const coupons = await Coupon.find().sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: coupons.length,
        data: {
            coupons
        }
    });
});

exports.validateCoupon = catchAsync(async (req, res, next) => {
    const { code } = req.body;
    if (!code) {
        return next(new AppError('Please provide a coupon code', 400));
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
        return next(new AppError('Invalid or expired coupon code', 400));
    }

    if (coupon.expiresAt < Date.now()) {
        return next(new AppError('Coupon has expired', 400));
    }

    res.status(200).json({
        status: 'success',
        data: {
            coupon
        }
    });
});

// Simulate Sending Offer
exports.sendOffer = catchAsync(async (req, res, next) => {
    const { email, type, discountValue } = req.body;

    // Generate a unique code
    const code = `ULTRA${Math.floor(1000 + Math.random() * 9000)}`;

    // Create the coupon automatically
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days exp

    const newCoupon = await Coupon.create({
        code,
        discountType: type || 'percentage',
        value: discountValue || 10,
        expiresAt: expires
    });

    // Save to User Profile if exists (User Specific Offer)
    const user = await User.findOne({ email });
    if (user) {
        user.marketingOffers.push({
            code,
            message: `Special Offer: ${discountValue || 10}${type === 'fixed' ? '$' : '%'} OFF!`,
            expiresAt: expires,
            discountValue: discountValue || 10,
            discountType: type || 'percentage'
        });
        await user.save({ validateBeforeSave: false });
    }

    // Log "Sending Email"
    console.log(`
    =========================================
    📧 EMAIL SENT TO: ${email}
    SUBJECT: Special Offer For You!
    BODY: Hey! Here is your exclusive code: ${code}
    Get ${newCoupon.value}${newCoupon.discountType === 'percentage' ? '%' : '$'} OFF!
    =========================================
    `);

    res.status(200).json({
        status: 'success',
        message: 'Offer sent successfully',
        data: {
            coupon: newCoupon
        }
    });
});

exports.getMyOffers = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    // Filter expired offers logic could go here, but let's just return all for now or simple filter
    const activeOffers = user.marketingOffers.filter(offer => new Date(offer.expiresAt) > Date.now());

    res.status(200).json({
        status: 'success',
        results: activeOffers.length,
        data: {
            offers: activeOffers
        }
    });
});
