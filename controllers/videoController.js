const Video = require('../models/videoModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllVideos = catchAsync(async (req, res, next) => {
  let filter = {};
  const watchedIds = req.query.watched ? req.query.watched.split(',').filter(id => id.trim() !== '') : [];
  
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

  // Filter by product link
  if (req.query.productLink) {
    filter.productLink = { $regex: req.query.productLink, $options: 'i' };
  }

  // Filter by soundId
  if (req.query.soundId) {
    filter.$or = [
      { _id: req.query.soundId },
      { soundId: req.query.soundId }
    ];
  }

  // Filter by search query (Search title, description, and tags)
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { tags: searchRegex }
    ];
  }

  // Exclude watched/liked videos for 'foryou' or 'following' feed if there are unseen ones
  if (req.query.sort === 'likes' || req.query.feed === 'following') {
    const exclusionFilter = { ...filter };
    
    // For 'foryou' feed, exclude user's own videos
    if (req.query.userId && !exclusionFilter.user) {
      exclusionFilter.user = { $ne: req.query.userId };
    }

    if (watchedIds.length > 0) {
      exclusionFilter._id = { $nin: watchedIds };
    }
    if (req.query.userId) {
      exclusionFilter.likes = { $ne: req.query.userId };
    }

    const count = await Video.countDocuments(exclusionFilter);
    if (count > 0) {
      filter = exclusionFilter;
    }
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
    // Exclude user's own videos from query if not already done
    if (req.query.userId && !filter.user) {
      filter.user = { $ne: req.query.userId };
    }
    query = query.sort('-likesCount -createdAt');
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination support
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

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
      // Add a significant random boost (0 to 15 points) to ensure freshness on every refresh
      const randomBoost = Math.random() * 15;
      
      // High boost for shopping products (videos with product links)
      const productLinkBoost = v.productLink ? 30 : 0;
      
      v.recScore = ((likesCount * 10 + commentsCount * 5 + viewsCount) / Math.pow(ageHours + 2, 1.5)) + randomBoost + productLinkBoost;
    });

    // 3. Sort by recommendation score
    videos.sort((a, b) => b.recScore - a.recScore);

    let preferredTags = [];
    if (req.query.userId) {
      try {
        const likedVideos = await Video.find({ likes: req.query.userId }).select('tags');
        if (likedVideos.length > 0) {
          const tagCounts = {};
          likedVideos.forEach(v => {
            v.tags.forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          });
          preferredTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 5);
        }
      } catch (err) {
        console.log('Recommendation error:', err);
      }
    }

    // Sort using watched history, likes status, product link status, and preferred tags
    videos.sort((a, b) => {
      const aLiked = req.query.userId ? a.likes.some(id => id.toString() === req.query.userId) : false;
      const bLiked = req.query.userId ? b.likes.some(id => id.toString() === req.query.userId) : false;
      
      const aWatched = watchedIds.includes(a._id.toString());
      const bWatched = watchedIds.includes(b._id.toString());

      // Assign status score: Watched + Liked (both watched and liked is 3, watched only is 2, liked only is 1, none is 0)
      const aStatusScore = (aWatched ? 2 : 0) + (aLiked ? 1 : 0);
      const bStatusScore = (bWatched ? 2 : 0) + (bLiked ? 1 : 0);

      // PUSH LIKED/WATCHED VIDEOS TO THE BOTTOM
      // Lower status score means not liked/not watched. We show them first!
      if (aStatusScore !== bStatusScore) {
        return aStatusScore - bStatusScore; 
      }

      // Prioritize product links (shopping videos) to show at the top for new/fresh feeds
      const aHasProduct = !!a.productLink;
      const bHasProduct = !!b.productLink;
      if (aHasProduct !== bHasProduct) {
        return aHasProduct ? -1 : 1;
      }

      // If both have same status, prioritize preferred tags (similar to user liked tags)
      const aHasPref = preferredTags.length > 0 && a.tags.some(t => preferredTags.includes(t));
      const bHasPref = preferredTags.length > 0 && b.tags.some(t => preferredTags.includes(t));

      if (aHasPref && !bHasPref) return -1;
      if (!aHasPref && bHasPref) return 1;

      return b.recScore - a.recScore; // fallback to recommendation score
    });
  }

  res.status(200).json({
    status: 'success',
    results: videos.length,
    data: {
      videos
    }
  });
});

exports.getVideo = catchAsync(async (req, res, next) => {
  const video = await Video.findById(req.params.id)
    .populate({ path: 'user', select: 'name photo vendorName followers following' })
    .populate({ path: 'comments.user', select: 'name photo vendorName' })
    .populate({ path: 'comments.replies.user', select: 'name photo vendorName' });

  if (!video) {
    return next(new AppError('No video found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { video }
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
  );

  if (!video) {
    return next(new AppError('No video found with that ID', 404));
  }

  // Populate user data after update
  await video.populate([
    { path: 'comments.user', select: 'name photo vendorName' },
    { path: 'comments.replies.user', select: 'name photo vendorName' }
  ]);

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
  // Populate all user data for the whole video to ensure consistency
  await video.populate([
    { path: 'comments.user', select: 'name photo vendorName' },
    { path: 'comments.replies.user', select: 'name photo vendorName' }
  ]);

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
    .populate({
      path: 'comments.user',
      select: 'name photo vendorName'
    })
    .populate({
      path: 'comments.replies.user',
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

exports.saveSound = catchAsync(async (req, res, next) => {
  const User = require('../models/userModel');
  const user = await User.findById(req.user.id);
  const videoId = req.params.id; // We use the original video ID as the sound ID

  const isSaved = user.savedSounds.map(id => id.toString()).includes(videoId.toString());

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
  
  // Populate for consistent response
  await video.populate([
    { path: 'comments.user', select: 'name photo vendorName' },
    { path: 'comments.replies.user', select: 'name photo vendorName' }
  ]);

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

exports.syncProductVideos = catchAsync(async (req, res, next) => {
  const Product = require('../models/productModel');
  
  // Find all products that have a video
  const products = await Product.find({
    video: { $exists: true, $ne: '' }
  });

  let syncedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    // Check if the product has images
    const hasImages = (product.images && product.images.length > 0 && product.images[0] !== 'default.jpg') || (product.image && product.image !== 'default.jpg');
    if (!hasImages) {
      skippedCount++;
      continue;
    }

    const pLink = product.slug || product._id.toString();
    const pVideo = product.video;

    // Check if a video with the same productLink or videoUrl already exists
    const existingVideo = await Video.findOne({
      $or: [
        { productLink: pLink },
        { videoUrl: pVideo }
      ]
    });

    if (existingVideo) {
      skippedCount++;
      continue;
    }

    // Construct thumbnail URL
    const pImage = (product.images && product.images.length > 0 && product.images[0] !== 'default.jpg')
      ? product.images[0]
      : product.image;

    // Generate exactly 10 tags
    const baseTags = [
      product.category,
      product.brand,
      ...(product.tags || [])
    ].filter(t => t && t.trim() !== '');

    const defaultTags = ['trending', 'shopping', 'foryou', 'fashion', 'luxury', 'shop', 'deals', 'popular', 'best', 'viral'];
    const uniqueTagsSet = new Set(baseTags);
    
    // Add default tags until we have exactly 10 tags
    for (const tag of defaultTags) {
      if (uniqueTagsSet.size >= 10) break;
      uniqueTagsSet.add(tag);
    }
    
    const finalTags = Array.from(uniqueTagsSet).slice(0, 10);

    // Create new Video (defaulting to current admin user)
    await Video.create({
      user: req.user._id,
      videoUrl: pVideo,
      thumbnailUrl: pImage,
      name: product.name,
      description: product.description ? product.description.substring(0, 480) : `Check out ${product.name}!`,
      tags: finalTags,
      productLink: pLink
    });

    syncedCount++;
  }

  res.status(200).json({
    status: 'success',
    message: `Synchronized successfully! ${syncedCount} videos added, ${skippedCount} products skipped (either no images/video or already synced).`,
    data: {
      syncedCount,
      skippedCount
    }
  });
});
