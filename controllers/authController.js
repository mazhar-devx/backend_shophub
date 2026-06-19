const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const sendEmail = require('../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm
    });

    // Generate 6-digit OTP
    const otp = newUser.createOTPToken();
    await newUser.save({ validateBeforeSave: false });

    // Print OTP to terminal for debugging/development
    console.log(`\n\n[DEV] OTP FOR ${newUser.email}: ${otp}\n\n`);

    let message = 'OTP sent to email!';
    try {
      await sendEmail({
        email: newUser.email,
        subject: 'Your Account Verification Code',
        message: `Your verification code is: ${otp}\nIt is valid for 10 minutes.`
      });
    } catch (err) {
      console.warn('Email could not be sent. Check your config.env settings.');
      message = `Email server not configured (add EMAIL_USERNAME and EMAIL_PASSWORD). For testing, your OTP is: ${otp}`;
    }

    res.status(201).json({
      status: 'success',
      message
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'This email is already registered. Please login instead.'
      });
    }
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide email and password!'
    });
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(401).json({
      status: 'fail',
      message: 'Incorrect email or password'
    });
  }

  // 3) Check if user is verified (admins do not require OTP verification)
  if (user.isVerified === false && user.role !== 'admin' && user.email !== 'admin@example.com' && user.email !== 'admin@shophub.pro') {
    // Generate a new OTP if they try to login while unverified
    const otp = user.createOTPToken();
    await user.save({ validateBeforeSave: false });
    
    console.log(`\n\n[DEV] NEW OTP FOR ${user.email}: ${otp}\n\n`);
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Your Account Verification Code',
        message: `Your verification code is: ${otp}\nIt is valid for 10 minutes.`
      });
    } catch (e) {}

    return res.status(401).json({
      status: 'unverified',
      message: 'Please verify your email to login.'
    });
  }

  // 3) Admin Vendor Isolation / Sub-accounts
  let loginUser = user;

  if (user.role === 'admin' && req.body.vendorName) {
    const vendorName = req.body.vendorName.trim();
    let isolatedUser = await User.findOne({ role: 'admin', vendorName: vendorName });

    if (!isolatedUser) {
        // Create a new isolated sub-admin account
        isolatedUser = await User.create({
            name: `Admin - ${vendorName}`,
            email: `${vendorName.replace(/\s+/g, '').toLowerCase()}_${Date.now()}@admin.shophub.pro`,
            password: password, // Dummy password, they authenticate via main account first
            passwordConfirm: password,
            role: 'admin',
            vendorName: vendorName,
            isVerified: true
        });
    }
    // Switch the login target to the isolated sub-account
    loginUser = isolatedUser;
  }

  // 4) If everything ok, send token to client
  createSendToken(loginUser, 200, res);
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ status: 'fail', message: 'Please provide email and OTP' });
    }

    // Hash the entered OTP to compare with DB
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({ 
      email, 
      otp: hashedOTP, 
      otpExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ status: 'fail', message: 'OTP is invalid or has expired' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // 4) If everything ok, send token to client
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.firebaseSync = async (req, res, next) => {
  const { email, name, uid, password } = req.body;
  
  if (!email || !uid) {
    return res.status(400).json({
      status: 'fail',
      message: 'Email and UID are required.'
    });
  }

  try {
    let user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      // Create new user mapped from Firebase
      user = await User.create({
        name: name || 'User',
        email,
        password: password || uid,
        passwordConfirm: password || uid
      });
    } else if (password) {
      // If a new password is provided (e.g. they reset their password via Firebase), sync it
      user.password = password;
      user.passwordConfirm = password;
      await user.save({ validateBeforeSave: false });
    }
    
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;

    // 1. Verify Google Token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const { name, email, picture } = ticket.getPayload();

    // 2. Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update user photo if they don't have one or if it's a google photo (optional strategy)
      // For now, let's just log them in. 
      // If you wanted to sync photos: 
      if (!user.photo || user.photo.startsWith('http')) {
        user.photo = picture;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // 3. Create new user if not exists
      // Generate a random password since they used Google
      const randomPassword = crypto.randomBytes(16).toString('hex');

      user = await User.create({
        name,
        email,
        password: randomPassword,
        passwordConfirm: randomPassword,
        photo: picture
      });
    }

    // 4. Send JWT
    createSendToken(user, 200, res);

  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: 'Google Login Failed: ' + err.message
    });
  }
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    console.log('[Auth] No token found in headers or cookies', req.headers);
    return res.status(401).json({
      status: 'fail',
      message: 'You are not logged in! Please log in to get access.'
    });
  }

  // 2) Verification token
  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      console.log('[Auth] User no longer exists for ID:', decoded.id);
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token does no longer exist.'
      });
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      console.log('[Auth] User changed password recently');
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password! Please log in again.'
      });
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (err) {
    console.log('[Auth] Token verification failed:', err.message);
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token'
    });
  }
};

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// Optional token extraction without enforcing protection
exports.extractUser = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    if (!token) return next();

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (currentUser) req.user = currentUser;
    next();
  } catch (err) {
    next();
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'user']. role='user'
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

// ... (existing imports)

exports.forgotPassword = async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: 'fail',
      message: 'There is no user with that email address.'
    });
  }

  // 2) Generate 6-digit OTP
  const otp = user.createOTPToken();
  await user.save({ validateBeforeSave: false });

  // Print OTP to terminal for debugging
  console.log(`\n\n[DEV] PASSWORD RESET OTP FOR ${user.email}: ${otp}\n\n`);

  // 3) Send it to user's email
  const message = `Forgot your password? Your 6-digit password reset code is: ${otp}.\nIt is valid for 10 minutes.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset code (valid for 10 min)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to email!'
    });
  } catch (err) {
    console.warn('Email send failed. Check config.env. Proceeding because OTP is in terminal.', err.message);

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(400).json({
      status: 'error',
      message: `Email server not configured. Please add EMAIL_USERNAME and EMAIL_PASSWORD to Vercel env variables. For testing, your OTP is: ${otp}`
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  const { email, otp, password, passwordConfirm } = req.body;

  if (!email || !otp || !password || !passwordConfirm) {
    return res.status(400).json({ status: 'fail', message: 'Please provide email, OTP, and new passwords' });
  }

  // 1) Get user based on the hashed OTP
  const hashedOTP = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  const user = await User.findOne({
    email,
    otp: hashedOTP,
    otpExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return res.status(400).json({
      status: 'fail',
      message: 'OTP is invalid or has expired'
    });
  }
  
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.otp = undefined;
  user.otpExpires = undefined;
  user.isVerified = true; // Ensure they are verified if they reset their password
  await user.save();

  // 3) Update changedPasswordAt property for the user (handled by pre-save hook)
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
};

exports.updatePassword = async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return res.status(401).json({
      status: 'fail',
      message: 'Your current password is wrong.'
    });
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
};

exports.updateVendorName = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only admins can set a vendor name'
      });
    }

    const { vendorName } = req.body;
    if (!vendorName) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a vendor name'
      });
    }

    let isolatedUser = await User.findOne({ role: 'admin', vendorName: vendorName });

    if (!isolatedUser) {
        // Create a new isolated sub-admin account
        isolatedUser = await User.create({
            name: `Admin - ${vendorName}`,
            email: `${vendorName.replace(/\s+/g, '').toLowerCase()}_${Date.now()}@admin.shophub.pro`,
            password: 'password123', // Dummy password, they authenticate via main account first
            passwordConfirm: 'password123',
            role: 'admin',
            vendorName: vendorName,
            isVerified: true
        });
    }

    // Generate a new token for this isolated user
    const jwt = require('jsonwebtoken');
    const signToken = id => {
        return jwt.sign({ id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });
    };

    const token = signToken(isolatedUser._id);

    res.status(200).json({
      status: 'success',
      token,
      data: { user: isolatedUser }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};