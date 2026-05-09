const express = require('express');
const notificationController = require('../controllers/notificationController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.get('/', notificationController.getNotifications);
router.patch('/mark-as-read', notificationController.markAsRead);

module.exports = router;
