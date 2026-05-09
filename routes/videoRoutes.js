const express = require('express');
const videoController = require('../controllers/videoController');
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', videoController.getAllVideos);
router.get('/user/:userId', videoController.getUserVideos);

// Protected routes
router.use(authController.protect);

router.post(
  '/', 
  upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnailFile', maxCount: 1 }
  ]),
  videoController.createVideo
);

router.post('/:id/like', videoController.toggleLike);
router.post('/:id/save', videoController.toggleSaveVideo);
router.post('/:id/comment', videoController.addComment);

module.exports = router;
