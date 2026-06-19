const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOTP);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/firebase-sync', authController.firebaseSync);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.patch('/updateVendorName', authController.updateVendorName);
router.get('/me', userController.getMe, userController.getUser);
const { uploadUserPhoto } = require('../middleware/uploadMiddleware');

router.patch('/updateMe', uploadUserPhoto, userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

router.post('/:id/follow', userController.followUser);
router.post('/:id/unfollow', userController.unfollowUser);

router.get('/customers-stats', authController.restrictTo('admin'), userController.getCustomersWithStats);

router.get('/:id', userController.getUser);
router.get('/:id/saved-sounds', userController.getSavedSounds);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;