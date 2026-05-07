const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
const aiController = require('../controllers/aiController');

const router = express.Router({ mergeParams: true });

// GET reviews is public (product page); POST/PATCH/DELETE require auth
router.get('/', reviewController.getAllReviews);

router.use(authController.protect);

router
  .route('/')
  .post(
    authController.restrictTo('user'),
    reviewController.createReview
  );

// AI Bulk Generate Route (Admin Only)
router
  .route('/generate-bulk')
  .post(
    authController.restrictTo('admin'),
    aiController.generateBulkReviews
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;