const express = require('express');
const messageController = require('../controllers/messageController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.get('/friends', messageController.getFriends);
router.get('/unread-count', messageController.getUnreadCount);
router.post('/send', messageController.sendMessage);
router.get('/conversations', messageController.getConversations);
router.get('/:userId', messageController.getMessages);

module.exports = router;
