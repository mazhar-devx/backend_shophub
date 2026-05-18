const Blog = require('../models/blogModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllBlogs = catchAsync(async (req, res, next) => {
  // 1) Filtering
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
  excludedFields.forEach(el => delete queryObj[el]);

  // Default to only published blogs for non-admins
  let filter = { ...queryObj, isPublished: true };
  if (req.user && req.user.role === 'admin') {
    filter = { ...queryObj }; // Admins see all
  }

  let query = Blog.find(filter);

  // 2) Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query = query.or([
      { title: searchRegex },
      { content: searchRegex },
      { tags: searchRegex }
    ]);
  }

  // 3) Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // 4) Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 12;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const blogs = await query.populate('linkedProduct', 'name price image slug');

  res.status(200).json({
    status: 'success',
    results: blogs.length,
    data: {
      blogs
    }
  });
});

exports.getBlog = catchAsync(async (req, res, next) => {
  let query;

  if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    query = Blog.findById(req.params.id);
  } else {
    query = Blog.findOne({ slug: req.params.id });
  }

  const blog = await query.populate('linkedProduct', 'name price image slug description');

  if (!blog) {
    return next(new AppError('No blog found with that ID or Slug', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      blog
    }
  });
});

exports.createBlog = catchAsync(async (req, res, next) => {
  const newBlog = await Blog.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      blog: newBlog
    }
  });
});

exports.updateBlog = catchAsync(async (req, res, next) => {
  const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!blog) {
    return next(new AppError('No blog found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      blog
    }
  });
});

exports.deleteBlog = catchAsync(async (req, res, next) => {
  const blog = await Blog.findByIdAndDelete(req.params.id);

  if (!blog) {
    return next(new AppError('No blog found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});
