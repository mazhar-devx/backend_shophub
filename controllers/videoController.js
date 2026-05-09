const Video = require('../models/videoModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllVideos = catchAsync(async (req, res, next) => {
  const videos = await Video.find()
    .populate({
      path: 'user',
      select: 'name photo vendorName'
    })
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: videos.length,
    data: {
      videos
    }
  });
});

exports.createVideo = catchAsync(async (req, res, next) => {
  // If a file was uploaded via multer, use that path
  if (req.file) {
    req.body.videoUrl = req.file.path;
  }

  if (!req.body.videoUrl) {
    return next(new AppError('Please provide a video URL or upload a video file', 400));
  }

  // Set user from auth middleware
  req.body.user = req.user.id;

  // Handle tags if they come as a string
  if (typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map(tag => tag.trim());
  }

  const newVideo = await Video.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      video: newVideo
    }
  });
});

exports.toggleLike = catchAsync(async (req, res, next) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return next(new AppError('No video found with that ID', 404));
  }

  const isLiked = video.likes.includes(req.user.id);
  
  const updatedVideo = await Video.findByIdAndUpdate(
    req.params.id,
    isLiked 
      ? { $pull: { likes: req.user.id } } 
      : { $addToSet: { likes: req.user.id } },
    { new: true, runValidators: false }
  );

  res.status(200).json({
    status: 'success',
    data: {
      isLiked: !isLiked,
      likeCount: updatedVideo.likes.length
    }
  });
});

exports.addComment = catchAsync(async (req, res, next) => {
  if (!req.body.text) {
    return next(new AppError('Comment text is required', 400));
  }

  const video = await Video.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        comments: {
          user: req.user.id,
          text: req.body.text
        }
      }
    },
    { new: true, runValidators: true }
  ).populate('comments.user', 'name photo');

  if (!video) {
    return next(new AppError('No video found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      comments: video.comments
    }
  });
});

exports.getUserVideos = catchAsync(async (req, res, next) => {
  const videos = await Video.find({ user: req.params.userId })
    .populate('user', 'name photo vendorName')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: videos.length,
    data: {
      videos
    }
  });
});
