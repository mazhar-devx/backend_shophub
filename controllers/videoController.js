const Video = require('../models/videoModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllVideos = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // If user wants following feed
  if (req.query.feed === 'following' && req.query.userId) {
    const User = require('../models/userModel');
    const user = await User.findById(req.query.userId);
    if (user && user.following) {
       filter = { user: { $in: user.following } };
    }
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

  // Filter by sound
  if (req.query.soundId) {
    filter.soundId = req.query.soundId;
  }

  let query = Video.find(filter)
    .populate({
      path: 'user',
      select: 'name photo vendorName followers following'
    })
    .populate({
      path: 'comments.user',
      select: 'name photo vendorName'
    })
    .populate({
      path: 'comments.replies.user',
      select: 'name photo vendorName'
    });

  // Sort logic
  if (req.query.sort === 'likes') {
    // For 'foryou' feed, if userId is provided, exclude user's own videos from the DB query
    if (req.query.userId && !filter.user) {
      filter.user = { $ne: req.query.userId };
    }
    // We fetch without strict sort here to allow full shuffling later, 
    // but we can keep it for now as a base query, then shuffle in JS.
    query = query.sort('-likesCount -createdAt');
  } else {
    query = query.sort('-createdAt');
  }

  let videos = await query;

  // Basic Recommendation Algorithm for 'foryou' feed
  if (req.query.sort === 'likes') {
    // 1. Randomize slightly to avoid static feed
    videos = videos.sort(() => Math.random() - 0.5);

    // 2. Calculate AI-inspired recommendation score
    videos.forEach(v => {
      const likesCount = v.likes?.length || 0;
      const commentsCount = v.comments?.length || 0;
      const viewsCount = v.views || 0;
      const ageHours = (Date.now() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60);
      
      // Scoring formula: (Engagement Weight) / (Time Decay)
      // We give high priority to likes and comments, and decay score over time
      v.recScore = (likesCount * 10 + commentsCount * 5 + viewsCount) / Math.pow(ageHours + 2, 1.5);
    });

    // 3. Sort by recommendation score
    videos.sort((a, b) => b.recScore - a.recScore);

    if (req.query.userId) {
      try {
        // 1. Find videos this user liked
        const likedVideos = await Video.find({ likes: req.query.userId }).select('tags');
        if (likedVideos.length > 0) {
          // 2. Extract and count tags
          const tagCounts = {};
          likedVideos.forEach(v => {
            v.tags.forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          });
          
          // 3. Get top 5 preferred tags
          const preferredTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 5);
          
          if (preferredTags.length > 0) {
            // 4. Sort fetched videos based on whether they contain preferred tags and if they've been liked
            videos.sort((a, b) => {
              // We want to prioritize videos the user HAS NOT liked yet
              const aLiked = a.likes.some(id => id.toString() === req.query.userId);
              const bLiked = b.likes.some(id => id.toString() === req.query.userId);

              // Push already liked videos lower to avoid repeating what they already liked
              if (!aLiked && bLiked) return -1;
              if (aLiked && !bLiked) return 1;

              const aHasPref = a.tags.some(t => preferredTags.includes(t));
              const bHasPref = b.tags.some(t => preferredTags.includes(t));
              
              if (aHasPref && !bHasPref) return -1;
              if (!aHasPref && bHasPref) return 1;
              
              return b.recScore - a.recScore; // maintain randomized order if both or neither have preferred tags
            });
          }
        }
      } catch (err) {
        console.log('Recommendation error:', err);
      }
    }
  }

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
  if (!req.body.text && !req.file) {
    return next(new AppError('Comment text or media is required', 400));
  }

  const commentData = {
    user: req.user.id,
    text: req.body.text || ''
  };

  if (req.file) {
    commentData.mediaUrl = req.file.path;
  }

  const video = await Video.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        comments: commentData
      }
    },
    { new: true, runValidators: true }
  ).populate('comments.user', 'name photo');

  if (!video) {
    return next(new AppError('No video found with that ID', 404));
  }

  // Create notification for Comment
  if (video.user.toString() !== req.user.id) {
    const Notification = require('../models/notificationModel');
    await Notification.create({
      recipient: video.user,
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

exports.likeComment = catchAsync(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError('No video found', 404));

  const comment = video.comments.id(req.params.commentId);
  if (!comment) return next(new AppError('No comment found', 404));

  const userId = req.user.id;
  const isLiked = comment.likes.some(id => id.toString() === userId.toString());

  if (isLiked) {
    comment.likes.pull(userId);
  } else {
    comment.likes.push(userId);
  }

  await video.save();

  res.status(200).json({
    status: 'success',
    data: {
      isLiked: !isLiked,
      likes: comment.likes.length
    }
  });
});

exports.replyToComment = catchAsync(async (req, res, next) => {
  if (!req.body.text && !req.file) {
    return next(new AppError('Reply text or media is required', 400));
  }

  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError('No video found', 404));

  const comment = video.comments.id(req.params.commentId);
  if (!comment) return next(new AppError('No comment found', 404));

  const replyData = {
    user: req.user.id,
    text: req.body.text || ''
  };

  if (req.file) {
    replyData.mediaUrl = req.file.path;
  }

  comment.replies.push(replyData);
  await video.save();

  // Populate user data
  await video.populate('comments.replies.user', 'name photo vendorName');

  res.status(200).json({
    status: 'success',
    data: {
      replies: video.comments.id(req.params.commentId).replies
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

exports.saveSound = catchAsync(async (req, res, next) => {
  const User = require('../models/userModel');
  const user = await User.findById(req.user.id);
  const videoId = req.params.id; // We use the original video ID as the sound ID

  const isSaved = user.savedSounds.includes(videoId);

  if (isSaved) {
    await User.findByIdAndUpdate(req.user.id, { $pull: { savedSounds: videoId } });
  } else {
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { savedSounds: videoId } });
  }

  res.status(200).json({
    status: 'success',
    data: {
      isSaved: !isSaved
    }
  });
});

exports.updateVideo = catchAsync(async (req, res, next) => {
  let video = await Video.findById(req.params.id);

  if (!video) {
    return next(new AppError('No video found with that ID', 404));
  }

  // Check if owner
  if (video.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to update this video', 403));
  }

  // Handle tags if they are sent as string
  if (req.body.tags && typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(t => t !== '');
  }

  const updatedVideo = await Video.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('user', 'name photo vendorName');

  res.status(200).json({
    status: 'success',
    data: {
      video: updatedVideo
    }
  });
});

exports.deleteVideo = catchAsync(async (req, res, next) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return next(new AppError('No video found with that ID', 404));
  }

  // Check if owner
  if (video.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to delete this video', 403));
  }

  await video.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.updateComment = catchAsync(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError('No video found', 404));

  const comment = video.comments.id(req.params.commentId);
  if (!comment) return next(new AppError('No comment found', 404));

  // Check if owner of comment
  if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to update this comment', 403));
  }

  if (req.body.text) comment.text = req.body.text;
  
  await video.save();

  res.status(200).json({
    status: 'success',
    data: {
      comment
    }
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError('No video found', 404));

  const comment = video.comments.id(req.params.commentId);
  if (!comment) return next(new AppError('No comment found', 404));

  // Check if owner of comment or owner of video
  if (comment.user.toString() !== req.user.id && video.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to delete this comment', 403));
  }

  video.comments.pull(req.params.commentId);
  await video.save();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.updateReply = catchAsync(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError('No video found', 404));

  const comment = video.comments.id(req.params.commentId);
  if (!comment) return next(new AppError('No comment found', 404));

  const reply = comment.replies.id(req.params.replyId);
  if (!reply) return next(new AppError('No reply found', 404));

  // Check if owner of reply
  if (reply.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to update this reply', 403));
  }

  if (req.body.text) reply.text = req.body.text;
  
  await video.save();

  res.status(200).json({
    status: 'success',
    data: {
      reply
    }
  });
});

exports.deleteReply = catchAsync(async (req, res, next) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError('No video found', 404));

  const comment = video.comments.id(req.params.commentId);
  if (!comment) return next(new AppError('No comment found', 404));

  const reply = comment.replies.id(req.params.replyId);
  if (!reply) return next(new AppError('No reply found', 404));

  // Check if owner of reply or owner of video or owner of comment
  if (reply.user.toString() !== req.user.id && video.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to delete this reply', 403));
  }

  comment.replies.pull(req.params.replyId);
  await video.save();

  res.status(204).json({
    status: 'success',
    data: null
  });
});
