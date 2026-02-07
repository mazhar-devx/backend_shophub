const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.route('/')
  .get(productController.getAllProducts)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    upload.array('images', 5),
    productController.createProduct
  );

// Categories stats route
router.route('/categories')
  .get(productController.getCategories);

// Trending products route
router.route('/trending')
  .get(productController.getTrending);

router.route('/search')
  .get(productController.searchProducts);

router.get('/recommendations', authController.protect, productController.getRecommendations);
router.post('/:id/view', authController.protect, productController.recordView);

router.route('/:id')
  .get(productController.getProduct)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    upload.array('images', 5),
    productController.updateProduct
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    productController.deleteProduct
  );

// Nested route for reviews
router.use('/:productId/reviews', reviewRouter);

module.exports = router;