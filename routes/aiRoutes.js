const express = require('express');
const aiController = require('../controllers/aiController');
const router = express.Router();

router.post('/chat', aiController.getChatResponse);

module.exports = router;
