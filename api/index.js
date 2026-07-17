const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const compression = require("compression");
const path = require("path");
const cookieParser = require("cookie-parser");
const serverless = require("serverless-http");

// Security middleware
const {
  setSecurityHeaders,
  sanitizeNoSQL,
  sanitizeXSS,
  preventParamPollution,
  rateLimiting,
} = require("../middleware/security");

// Load env
dotenv.config({ path: path.resolve(__dirname, "../config.env") });

// Validate critical environment variables for Vercel
const CRITICAL_VARS = ["MONGO_URI", "JWT_SECRET"];
CRITICAL_VARS.forEach((v) => {
  if (!process.env[v]) {
    console.error(`CRITICAL ERROR: Environment variable ${v} is missing! ❌`);
  }
});

// DB
const connectDB = require("../config/db");
const aiRouter = require('../routes/aiRoutes');
const { ensureAdmin } = require("../utils/ensureAdmin");

// Connect to DB once (outside handler for reuse)
let dbPromise = null;

const initDB = async () => {
  if (dbPromise) return dbPromise;
  
  dbPromise = (async () => {
    try {
      await connectDB();
      await ensureAdmin();
      console.log("Database initialized successfully ✅");
      try {
        const SiteSettings = require('../models/siteSettingsModel');
        const settings = await SiteSettings.findOne();
        if (settings && settings.autoProductGeneration && settings.autoProductGeneration.enabled) {
          const { startAutoProductGeneration } = require("../utils/autoProductGenerator");
          startAutoProductGeneration(settings.autoProductGeneration.intervalHours || 1);
          console.log('[Init] Auto product generation scheduler started from settings.');
        } else {
          console.log('[Init] Auto product generation disabled by settings.');
        }
      } catch (err) {
        console.error("Failed to start auto product generation scheduler:", err.message);
      }
    } catch (err) {
      console.error("Database initialization failed ❌:", err.message);
      dbPromise = null; // Reset promise so we can try again on next request
      throw err;
    }
  })();

  return dbPromise;
};

// Middleware to ensure DB is connected before processing requests
const dbMiddleware = async (req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    // If it's a timeout, return a more helpful error
    if (err.message.includes('timeout')) {
      return res.status(503).json({
        status: 'error',
        message: 'Database connection timed out. Please check IP whitelisting and cluster status.',
        error: err.message
      });
    }
    next(err);
  }
};

// App
const app = express();
app.use(dbMiddleware);

/* =====================================================
   🔥 CRITICAL FOR RENDER + RATE LIMIT + VERCEL
===================================================== */
app.set("trust proxy", 1);

/* =====================================================
   ✅ CORS FIXED
===================================================== */
const whitelist = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://www.shophub.pro",
  "https://shophub.pro"
];

app.use(
  cors({
    origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    try {
      const originUrl = new URL(origin);
      const hostname = originUrl.hostname;
      
      const isAllowed = whitelist.includes(origin) || 
                       hostname === 'shophub.pro' || 
                       hostname.endsWith('.shophub.pro') || 
                       hostname.endsWith('.vercel.app');

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    } catch (e) {
      callback(null, false);
    }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

app.options("*", cors());

/* =====================================================
   Middleware
===================================================== */
app.use(cookieParser());
app.use(setSecurityHeaders);

app.use((req, res, next) => {
  if (req.url === '/' || req.url === '/index.html' || req.url.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use("/api", rateLimiting);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(sanitizeNoSQL);
app.use(sanitizeXSS);
app.use(preventParamPollution);
app.use(compression());

// Static files (Vercel handles static differently, but keep for compatibility)
app.use("/img/users", express.static(path.join(__dirname, "../public/uploads/users")));
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

/* =====================================================
   Routes
===================================================== */
app.use("/api/v1/users", require("../routes/userRoutes"));
app.use("/api/v1/products", require("../routes/productRoutes"));
app.use("/api/v1/orders", require("../routes/orderRoutes"));
app.use("/api/v1/payments", require("../routes/paymentRoutes"));
app.use("/api/v1/dashboard", require("../routes/dashboardRoutes"));
app.use("/api/v1/reviews", require("../routes/reviewRoutes"));
app.use("/api/v1/marketing", require("../routes/marketingRoutes"));
app.use("/api/v1/settings", require("../routes/siteSettingsRoutes"));
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/videos", require("../routes/videoRoutes"));
app.use("/api/v1/notifications", require("../routes/notificationRoutes"));
app.use("/api/v1/messages", require("../routes/messageRoutes"));
app.use("/api/v1/blogs", require("../routes/blogRoutes"));
app.use("/api/v1/sitemap.xml", require("../routes/sitemapRoutes"));
app.use("/api/v1/seo", require("../routes/seoRoutes"));
app.use("/robots.txt", require("../routes/robotsRoutes"));

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "ShopHub Serverless API is running 🚀",
    time: new Date().toISOString(),
  });
});

/* =====================================================
   Global error handler
===================================================== */
app.use((err, req, res, next) => {
  // Ensure CORS headers are present even on errors
  const origin = req.headers.origin;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const hostname = originUrl.hostname;
      if (whitelist.includes(origin) || hostname === 'shophub.pro' || hostname.endsWith('.shophub.pro') || hostname.endsWith('.vercel.app')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    } catch (e) {}
  }

  if (err.name === "CastError") {
    err.statusCode = 400;
    err.message = "Invalid ID format";
  }
  if (err.code === 11000) {
    err.statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    err.message = `Duplicate value for ${field}. Please use another one!`;
  }

  console.error("ERROR 💥", err);

  res.status(err.statusCode || 500).json({
    status: (err.statusCode && err.statusCode.toString().startsWith('4')) ? "fail" : "error",
    message: err.message || "Internal Server Error",
    // In development, send full error
    ...(process.env.NODE_ENV === 'development' && { error: err, stack: err.stack })
  });
});

// Export the app for Vercel
// Vercel's @vercel/node builder handles the Express app object directly
module.exports = app;
// Keep the handler for compatibility if needed elsewhere
module.exports.handler = serverless(app);
