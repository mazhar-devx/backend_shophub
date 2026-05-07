const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const aiController = require('./aiController');
const Product = require('../models/productModel'); // Import Product model

// Get all reviews
exports.getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};

  // VENDOR ISOLATION: If user is admin, they only see reviews for their products
  // SUPER ADMIN (mazhar.devx) can see everything
  if (req.user && req.user.role === 'admin' && req.user.vendorName !== 'mazhar.devx') {
    const myProducts = await Product.find({ vendor: req.user._id }).select('_id');
    const myProductIds = myProducts.map(p => p._id);
    filter = { product: { $in: myProductIds } };
  }

  if (req.params.productId) {
    let productId = req.params.productId;

    // Check if productId is a valid ObjectId, if not, find product by slug
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      const product = await Product.findOne({ slug: productId });
      if (!product) {
        return next(new AppError('No product found with that Slug', 404));
      }
      productId = product._id;
    }

    // Combine with vendor filter if necessary (security)
    if (filter.product && filter.product.$in && !filter.product.$in.includes(productId.toString())) {
        // If they requested a product they don't own
        return res.status(200).json({ status: 'success', results: 0, data: { reviews: [] } });
    }

    filter.product = productId;
  }

  const reviews = await Review.find(filter).populate({
    path: 'product',
    select: 'name image'
  }).populate({
    path: 'user',
    select: 'name photo'
  });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  });
});

// Get a single review
exports.getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

// Create a review
exports.createReview = catchAsync(async (req, res, next) => {
  // Allow nested routes
  if (!req.body.product) req.body.product = req.params.productId;
  if (!req.body.user) req.body.user = req.user.id;

  // Check if product is a valid ObjectId, if not, find product by slug
  if (req.body.product && !req.body.product.match(/^[0-9a-fA-F]{24}$/)) {
    const product = await Product.findOne({ slug: req.body.product });
    if (!product) {
      return next(new AppError('No product found with that Slug', 404));
    }
    req.body.product = product._id.toString();
  }

  // Check if user has already reviewed this product
  const existingReview = await Review.findOne({
    product: req.body.product,
    user: req.body.user
  });

  if (existingReview) {
    return next(new AppError('You have already reviewed this product', 400));
  }

  let newReview = await Review.create(req.body);

  // Generate AI Auto-Reply
  const aiReply = await aiController.generateReviewReply(newReview);
  newReview.aiReply = aiReply;
  await newReview.save();

  newReview = await newReview.populate({ path: 'user', select: 'name photo' });

  res.status(201).json({
    status: 'success',
    data: {
      review: newReview
    }
  });
});

// Update a review
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

// Delete a review
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findByIdAndDelete(req.params.id);

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});