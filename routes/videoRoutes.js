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
router.post('/:id/save-sound', videoController.saveSound);

// Video management
router.patch('/:id', videoController.updateVideo);
router.delete('/:id', videoController.deleteVideo);

// Comment routes
router.post('/:id/comment', upload.single('media'), videoController.addComment);
router.post('/:videoId/comment/:commentId/like', videoController.likeComment);
router.post('/:videoId/comment/:commentId/reply', upload.single('media'), videoController.replyToComment);

// Comment management
router.patch('/:videoId/comment/:commentId', videoController.updateComment);
router.delete('/:videoId/comment/:commentId', videoController.deleteComment);

// Reply management
router.patch('/:videoId/comment/:commentId/reply/:replyId', videoController.updateReply);
router.delete('/:videoId/comment/:commentId/reply/:replyId', videoController.deleteReply);

module.exports = router;
