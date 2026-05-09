const Video = require('../models/videoModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllVideos = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // If user wants following feed
  if (req.query.feed === 'following' && req.user) {
    const User = require('../models/userModel');
    const user = await User.findById(req.user.id);
    filter = { user: { $in: user.following } };
  }

  // If user wants liked videos
  if (req.query.feed === 'liked' && req.query.userId) {
    filter = { likes: req.query.userId };
  }

  // If user wants saved videos (only for own profile/auth user)
  if (req.query.feed === 'saved' && req.query.userId) {
    const User = require('../models/userModel');
    const user = await User.findById(req.query.userId);
    filter = { _id: { $in: user.savedVideos } };
  }

  // Filter by tag
  if (req.query.tag) {
    filter.tags = req.query.tag;
  }

  let query = Video.find(filter)
    .populate({
      path: 'user',
      select: 'name photo vendorName followers following'
    });

  // Sort logic
  if (req.query.sort === 'likes') {
    query = query.sort('-likesCount -createdAt');
  } else {
    query = query.sort('-createdAt');
  }

  const videos = await query;

  res.status(200).json({
    status: 'success',
    results: videos.length,
    data: {
      videos
    }
  });
});

exports.toggleSaveVideo = catchAsync(async (req, res, next) => {
  const User = require('../models/userModel');
  const user = await User.findById(req.user.id);
  
  const isSaved = user.savedVideos.includes(req.params.id);
  
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    isSaved 
      ? { $pull: { savedVideos: req.params.id } } 
      : { $addToSet: { savedVideos: req.params.id } },
    { new: true }
  );

  // Create notification for Save
  if (!isSaved) {
    const video = await Video.findById(req.params.id);
    if (video.user.toString() !== req.user.id) {
       const Notification = require('../models/notificationModel');
       await Notification.create({
         recipient: video.user,
         sender: req.user.id,
         type: 'save',
         video: video._id
       });
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      isSaved: !isSaved
    }
  });
});

exports.createVideo = catchAsync(async (req, res, next) => {
  // If files were uploaded via multer (using fields)
  if (req.files) {
    if (req.files.videoFile) {
      req.body.videoUrl = req.files.videoFile[0].path;
    }
    if (req.files.thumbnailFile) {
      req.body.thumbnailUrl = req.files.thumbnailFile[0].path;
    }
  }

  // Fallback for single file upload (just in case)
  if (req.file) {
    req.body.videoUrl = req.file.path;
  }

  if (!req.body.videoUrl) {
    return next(new AppError('Please provide a video URL or upload a video file', 400));
  }

  // Set user from auth middleware
  req.body.user = req.user.id;

  // Handle tags safely
  if (req.body.tags && typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(t => t !== '');
  } else if (!req.body.tags) {
    req.body.tags = [];
  }

  console.log("[VideoController] Create Request Body:", req.body);
  console.log("[VideoController] Create Request Files:", req.files);

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
  
  if (isLiked) {
    video.likes = video.likes.filter(id => id.toString() !== req.user.id.toString());
  } else {
    video.likes.push(req.user.id);
  }

  await video.save({ validateBeforeSave: false });

  // Create notification for Like
  if (!isLiked && video.user.toString() !== req.user.id) {
    const Notification = require('../models/notificationModel');
    await Notification.create({
      recipient: video.user,
      sender: req.user.id,
      type: 'like',
      video: video._id
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      isLiked: !isLiked,
      likeCount: video.likes.length
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

  // Create notification for Comment
  if (video.user._id.toString() !== req.user.id) {
    const Notification = require('../models/notificationModel');
    await Notification.create({
      recipient: video.user._id,
      sender: req.user.id,
      type: 'comment',
      video: video._id
    });
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
