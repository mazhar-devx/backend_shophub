const express = require('express');
const aiController = require('../controllers/aiController');
const router = express.Router();

const authController = require('../controllers/authController');

router.post('/chat', aiController.getChatResponse);
router.post('/deep-brain', aiController.getDeepBrainResponse);
router.post('/product-guide', aiController.getProductGuideResponse);
router.post('/trigger-auto-generate', aiController.triggerAutoGenerate);

// Auto-generator control (admin only)
router.get('/auto-generator/status',
    authController.protect,
    authController.restrictTo('admin'),
    aiController.getAutoGeneratorStatus
);

router.post('/auto-generator/enable',
    authController.protect,
    authController.restrictTo('admin'),
    aiController.enableAutoGenerator
);

router.post('/auto-generator/disable',
    authController.protect,
    authController.restrictTo('admin'),
    aiController.disableAutoGenerator
);

// Admin Only
router.post('/generate-bulk-reviews', 
    authController.protect, 
    authController.restrictTo('admin'), 
    aiController.generateBulkReviews
);

router.get('/logs',
    authController.protect,
    authController.restrictTo('admin'),
    aiController.getLogs
);

module.exports = router;
