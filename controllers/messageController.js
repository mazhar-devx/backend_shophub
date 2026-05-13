const Message = require('../models/messageModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getFriends = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  
  if (!user) return next(new AppError('User not found', 404));

  // Mutual following logic: 
  // 1. User A follows User B
  // 2. User B follows User A
  // This means User B's ID is in User A's "following" AND User A's ID is in User B's "following".
  const mongoose = require('mongoose');
  const friends = await User.find({
    _id: { $in: user.following || [] },
    following: new mongoose.Types.ObjectId(userId)
  }).select('name photo vendorName');

  res.status(200).json({
    status: 'success',
    data: {
      friends
    }
  });
});

exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const unreadCount = await Message.countDocuments({
    recipient: req.user.id,
    read: false
  });

  res.status(200).json({
    status: 'success',
    data: {
      unreadCount
    }
  });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { recipient, text, videoId } = req.body;

  if (!recipient) {
    return next(new AppError('Recipient is required', 400));
  }

  const message = await Message.create({
    sender: req.user.id,
    recipient,
    text,
    video: videoId
  });

  // If video shared, increment sharesCount
  if (videoId) {
     const Video = require('../models/videoModel');
     await Video.findByIdAndUpdate(videoId, { $inc: { sharesCount: 1 } });
  }

  // Create notification for Message
  const Notification = require('../models/notificationModel');
  await Notification.create({
    recipient,
    sender: req.user.id,
    type: 'message',
    video: videoId || null
  });

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'name photo vendorName')
    .populate('video');

  res.status(201).json({
    status: 'success',
    data: {
      message: populatedMessage
    }
  });
});

exports.getConversations = catchAsync(async (req, res, next) => {
  // Get all messages where user is sender or recipient
  const messages = await Message.find({
    $or: [{ sender: req.user.id }, { recipient: req.user.id }]
  }).sort('-createdAt');

  // Group by "other user"
  const conversationsMap = new Map();
  
  for (const msg of messages) {
    const otherUserId = msg.sender.toString() === req.user.id ? msg.recipient.toString() : msg.sender.toString();
    
    if (!conversationsMap.has(otherUserId)) {
      conversationsMap.set(otherUserId, msg);
    }
  }

  const conversationList = Array.from(conversationsMap.values());
  
  // Populate the "other user" details
  const populatedConversations = await Promise.all(conversationList.map(async (msg) => {
    const otherUserId = msg.sender.toString() === req.user.id ? msg.recipient : msg.sender;
    const otherUser = await User.findById(otherUserId).select('name photo vendorName');
    return {
      lastMessage: msg,
      otherUser
    };
  }));

  res.status(200).json({
    status: 'success',
    data: {
      conversations: populatedConversations
    }
  });
});

exports.getMessages = catchAsync(async (req, res, next) => {
  const otherUserId = req.params.userId;

  const messages = await Message.find({
    $or: [
      { sender: req.user.id, recipient: otherUserId },
      { sender: otherUserId, recipient: req.user.id }
    ]
  }).sort('createdAt').populate('video');

  // Mark recipient messages as read
  await Message.updateMany(
    { sender: otherUserId, recipient: req.user.id, read: false },
    { read: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      messages
    }
  });
});
