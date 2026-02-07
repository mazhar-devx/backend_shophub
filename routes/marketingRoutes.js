const express = require('express');
const marketingController = require('../controllers/marketingController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public
router.post('/subscribe', marketingController.subscribe);
router.post('/validate-coupon', marketingController.validateCoupon);

// User Routes (Protected)
router.use(authController.protect);
router.get('/my-offers', marketingController.getMyOffers);

// Admin Only
router.use(authController.restrictTo('admin'));

router.get('/subscribers', marketingController.getSubscribers);
router.get('/coupons', marketingController.getAllCoupons);
router.post('/coupons', marketingController.createCoupon);
router.post('/send-offer', marketingController.sendOffer);

module.exports = router;
