const express = require('express');
const marketingController = require('../controllers/marketingController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/subscribe', marketingController.subscribe);
router.post('/validate-coupon', marketingController.validateCoupon);

// Protected routes (Admin only)
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.get('/subscribers', marketingController.getSubscribers);
router.post('/coupons', marketingController.createCoupon);
router.get('/coupons', marketingController.getAllCoupons);
router.post('/send-offer', marketingController.sendOffer);

// Google Merchant Sync
router.post('/google-merchant/sync', marketingController.syncToGoogleMerchant);

module.exports = router;
