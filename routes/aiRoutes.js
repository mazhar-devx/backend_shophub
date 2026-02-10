const express = require('express');
const aiController = require('../controllers/aiController');
const router = express.Router();

router.post('/chat', aiController.getChatResponse);
router.post('/product-guide', aiController.getProductGuideResponse);

module.exports = router;
