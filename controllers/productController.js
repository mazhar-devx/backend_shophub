const Product = require('../models/productModel');
const Review = require('../models/reviewModel');
const APIFeatures = require('./baseController');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllProducts = catchAsync(async (req, res, next) => {
  // BUILD QUERY
  // 1) Filtering
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
  excludedFields.forEach(el => delete queryObj[el]);

  // 2) Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

  // Only show products with stock > 0
  let query = Product.find({ ...JSON.parse(queryStr), stock: { $gte: 0 } });

  // 3) Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query = query.or([
      { name: searchRegex },
      { description: searchRegex },
      { brand: searchRegex },
      { category: searchRegex },
      { tags: searchRegex }
    ]);
  }

  // 4) Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // 5) Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v');
  }

  // 6) Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 12;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // EXECUTE QUERY
  const products = await query;

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products
    }
  });
});

exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate({
    path: 'reviews',
    fields: 'review rating user'
  });

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.createProduct = catchAsync(async (req, res, next) => {
  // 1) Ensure images is an array
  let images = [];

  // If images (URLs) were provided in req.body
  if (req.body.images) {
    images = Array.isArray(req.body.images) ? [...req.body.images] : [req.body.images];
  }

  // 2) Add uploaded files
  if (req.files && req.files.length > 0) {
    const fileImages = req.files.map(file => file.path);
    images = [...images, ...fileImages];
  }

  // 3) Clean up images (remove any non-string values)
  images = images.filter(img => typeof img === 'string' && img.length > 0);

  // 4) Set images and main thumbnail
  req.body.images = images;
  if (!req.body.image && images.length > 0) {
    req.body.image = images[0];
  }

  const newProduct = await Product.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      product: newProduct
    }
  });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  // 1) Handle images - if provided in body, start with those
  let images = [];
  if (req.body.images) {
    images = Array.isArray(req.body.images) ? [...req.body.images] : [req.body.images];
  } else {
    // If not in body, we might want to fetch existing, but usually 
    // the frontend should send existing ones back.
    // For now, let's at least check if we have files.
  }

  // 2) Add new uploaded files
  if (req.files && req.files.length > 0) {
    const fileImages = req.files.map(file => file.path);
    images = [...images, ...fileImages];
  }

  // 3) Only update images if we actually have some (prevents overwriting with empty)
  if (images.length > 0) {
    images = images.filter(img => typeof img === 'string' && img.length > 0);
    req.body.images = images;

    // Update main image to the first one
    req.body.image = images[0];
  }

  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Advanced search functionality
exports.searchProducts = catchAsync(async (req, res, next) => {
  const { q, category, brand, minPrice, maxPrice, sortBy, page = 1, limit = 12 } = req.query;

  // Build search query (only in-stock products)
  let searchQuery = { stock: { $gte: 0 } };

  // Text search
  if (q) {
    const searchRegex = new RegExp(q, 'i');
    searchQuery.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { brand: searchRegex },
      { category: searchRegex },
      { tags: searchRegex }
    ];
  }

  // Category filter
  if (category && category !== 'all') {
    searchQuery.category = category;
  }

  // Brand filter
  if (brand && brand !== 'all') {
    searchQuery.brand = brand;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    searchQuery.price = {};
    if (minPrice) searchQuery.price.$gte = Number(minPrice);
    if (maxPrice) searchQuery.price.$lte = Number(maxPrice);
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;

  let query = Product.find(searchQuery);

  // Sorting
  switch (sortBy) {
    case 'price-low':
      query = query.sort('price');
      break;
    case 'price-high':
      query = query.sort('-price');
      break;
    case 'rating':
      query = query.sort('-ratingsAverage');
      break;
    case 'newest':
      query = query.sort('-createdAt');
      break;
    default:
      query = query.sort('-createdAt');
  }

  const products = await query.skip(skip).limit(Number(limit));
  const totalProducts = await Product.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalProducts / limit);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
});

// Get product categories stats
exports.getCategories = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        numProducts: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { numProducts: -1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

// Get trending products (top rated)
exports.getTrending = catchAsync(async (req, res, next) => {
  const products = await Product.find({ stock: { $gte: 0 } })
    .sort('-ratingsAverage -ratingsQuantity')
    .limit(8);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products
    }
  });
});

// Record Product View
exports.recordView = catchAsync(async (req, res, next) => {
  // Only if user is logged in
  if (req.user) {
    // Add to user history if not recently viewed (simple push for now)
    // We could use $addToSet but we want to track recency, so let's push and maybe trim later
    // Or updated "last viewed" if exists.

    // Simple approach: Push to start, slice to keep last 20
    // Use atomic update to avoid VersionError on concurrent requests
    await require('../models/userModel').findByIdAndUpdate(req.user._id, {
      $push: {
        viewedProducts: {
          $each: [{ product: req.params.id, date: Date.now() }],
          $slice: -50 // Keep last 50
        }
      }
    });
  }
  res.status(200).json({ status: 'success' });
});

// Get Recommendations
exports.getRecommendations = catchAsync(async (req, res, next) => {
  let recommendations = [];
  const currentProductId = req.query.currentId;
  const Product = require('../models/productModel'); // Ensure definition

  // Strategy 1: Contextual (Similar to current product)
  if (currentProductId) {
    const currentProduct = await Product.findById(currentProductId);
    if (currentProduct) {
      const similarProducts = await Product.find({
        category: currentProduct.category,
        _id: { $ne: currentProductId },
        stock: { $gte: 0 }
      }).limit(4);
      recommendations.push(...similarProducts);
    }
  }

  // Strategy 2: Personalized (Based on history) — Only if we need more
  if (recommendations.length < 4 && req.user && req.user.viewedProducts && req.user.viewedProducts.length > 0) {
    const viewedIds = req.user.viewedProducts.map(vp => vp.product);
    // Don't include what we already have
    const existingIds = recommendations.map(p => p._id.toString());
    existingIds.push(currentProductId); // Don't show current again

    const lastViewedEntry = req.user.viewedProducts[req.user.viewedProducts.length - 1];
    const lastProduct = await Product.findById(lastViewedEntry.product);

    if (lastProduct) {
      const personalRecs = await Product.find({
        category: lastProduct.category,
        _id: { $nin: [...viewedIds, ...existingIds] },
        stock: { $gte: 0 }
      }).limit(4 - recommendations.length);

      recommendations.push(...personalRecs);
    }
  }

  // Strategy 3: Fallback (Top Rated / Trending) — Fill the rest
  if (recommendations.length < 4) {
    const existingIds = recommendations.map(p => p._id.toString());
    if (currentProductId) existingIds.push(currentProductId);

    const fallbackRecs = await Product.find({
      _id: { $nin: existingIds },
      stock: { $gte: 0 }
    })
      .sort('-ratingsAverage -ratingsQuantity')
      .limit(4 - recommendations.length);

    recommendations.push(...fallbackRecs);
  }


  res.status(200).json({
    status: 'success',
    results: recommendations.length,
    data: {
      products: recommendations
    }
  });
});
