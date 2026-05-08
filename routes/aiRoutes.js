const express = require('express');
const aiController = require('../controllers/aiController');
const router = express.Router();

const authController = require('../controllers/authController');

router.post('/chat', aiController.getChatResponse);
router.post('/deep-brain', aiController.getDeepBrainResponse);
router.post('/product-guide', aiController.getProductGuideResponse);

// Admin Only
router.post('/generate-bulk-reviews', 
    authController.protect, 
    authController.restrictTo('admin'), 
    aiController.generateBulkReviews
);

module.exports = router;
