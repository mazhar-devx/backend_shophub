const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Data sanitization against NoSQL query injection
exports.sanitizeNoSQL = mongoSanitize();

// Data sanitization against XSS
exports.sanitizeXSS = xss();

// Prevent parameter pollution
exports.preventParamPollution = hpp({
  whitelist: [
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price'
  ]
});

// Set security HTTP headers
exports.setSecurityHeaders = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'", "https://backend-shophub.vercel.app", "https://*.shophub.pro", "https://shophub.pro"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://pagead2.googlesyndication.com",
        "https://adservice.google.com",
        "https://cdn.ampproject.org",
        "https://*.ampproject.org",
        "https://translate.google.com",
        "https://translate.googleapis.com",
        "https://*.googleapis.com",
        "https://accounts.google.com",
        "https://*.google.com",
        "https://*.doubleclick.net",
        "https://*.gstatic.com"
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc: [
        "'self'",
        "https://backend-shophub.vercel.app",
        "https://*.shophub.pro",
        "https://shophub.pro",
        "https://itunes.apple.com",
        "https://api.jamendo.com",
        "https://api.allorigins.win",
        "https://*.google-analytics.com",
        "https://*.analytics.google.com",
        "https://*.googlesyndication.com",
        "https://*.googleads.g.doubleclick.net",
        "https://*.ampproject.org",
        "https://accounts.google.com",
        "https://*.adtrafficquality.google",
        "https://*.googleapis.com",
        "https://*.google.com",
        "https://*.gstatic.com",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "ws://localhost:*",
        "ws://127.0.0.1:*"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://backend-shophub.vercel.app",
        "https://*.shophub.pro",
        "https://shophub.pro",
        "https://images.unsplash.com",
        "https://*.unsplash.com",
        "https://res.cloudinary.com",
        "https://*.cloudinary.com",
        "https://ui-avatars.com",
        "https://i.imgur.com",
        "https://translate.google.com",
        "https://translate.googleapis.com",
        "https://*.google.com",
        "https://*.googleusercontent.com",
        "https://*.googlesyndication.com",
        "https://pagead2.googlesyndication.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://translate.googleapis.com",
        "https://accounts.google.com",
        "https://www.gstatic.com",
        "https://*.gstatic.com"
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com"
      ],
      frameSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://googleads.g.doubleclick.net",
        "https://*.googlesyndication.com",
        "https://*.doubleclick.net"
      ],
      mediaSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://www.soundhelix.com",
        "https://assets.mixkit.co",
        "https://res.cloudinary.com",
        "https://*.cloudinary.com",
        "https://backend-shophub.vercel.app",
        "https://*.shophub.pro",
        "https://shophub.pro"
      ]
    }
  }
});

// Rate limiting
// Rate limiting
exports.rateLimiting = rateLimit({
  max: 10000, // Increased for development
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});