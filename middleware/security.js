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
// Set security HTTP headers
exports.setSecurityHeaders = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Rate limiting
// Rate limiting
exports.rateLimiting = rateLimit({
  max: 10000, // Increased for development
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});