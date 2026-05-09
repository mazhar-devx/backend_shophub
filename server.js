const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const compression = require("compression");
const path = require("path");
const cookieParser = require("cookie-parser");

// Security middleware
const {
  setSecurityHeaders,
  sanitizeNoSQL,
  sanitizeXSS,
  preventParamPollution,
  rateLimiting,
} = require("./middleware/security");

// Load env
dotenv.config({ path: path.resolve(__dirname, "config.env") });

// DB
const connectDB = require("./config/db");
const aiRouter = require('./routes/aiRoutes');
const { ensureAdmin } = require("./utils/ensureAdmin");

// App
const app = express();

/* =====================================================
   🔥 CRITICAL FOR RENDER + RATE LIMIT
===================================================== */
app.set("trust proxy", 1);

/* =====================================================
   ✅ CORS FIXED (ALLOW PATCH, PUT, DELETE)
===================================================== */
const allowedOrigins = [
  "http://localhost:5173",       // local dev
  "http://127.0.0.1:5173",       // local dev alternative
  "https://frontend-shophub.onrender.com", // previous Render preview
  "https://www.shophub.pro",     // live frontend
  "https://shophub.pro",         // root domain (forwarded)
  "https://frontend-shophub.vercel.app", // vercel frontend (short)
  "https://frontend-shophub-cdm960uml-mazhar-devxs-projects.vercel.app", // vercel generated
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow local development and production domains
      const whitelist = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://www.shophub.pro",
        "https://shophub.pro"
      ];
      
      if (!origin || whitelist.includes(origin) || origin.endsWith('.shophub.pro') || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Handle preflight requests
app.options("*", cors());

/* =====================================================
   Middleware order MATTERS
===================================================== */
app.use(cookieParser());
app.use(setSecurityHeaders);

// [FIX] Prevent aggressive caching of index.html and API responses
app.use((req, res, next) => {
  if (req.url === '/' || req.url === '/index.html' || req.url.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use("/api", rateLimiting);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Sanitization
app.use(sanitizeNoSQL);
app.use(sanitizeXSS);
app.use(preventParamPollution);

// Compression
app.use(compression());

// Serve images & uploads
const cacheOptions = {
  maxAge: '7d',
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
};

app.use("/img/users", express.static(path.join(__dirname, "public/uploads/users"), cacheOptions));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads"), cacheOptions));

/* =====================================================
   Routes
===================================================== */
app.use("/api/v1/users", require("./routes/userRoutes"));
app.use("/api/v1/products", require("./routes/productRoutes"));
app.use("/api/v1/orders", require("./routes/orderRoutes"));
app.use("/api/v1/payments", require("./routes/paymentRoutes"));
app.use("/api/v1/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/v1/reviews", require("./routes/reviewRoutes"));
app.use("/api/v1/marketing", require("./routes/marketingRoutes"));
app.use("/api/v1/settings", require("./routes/siteSettingsRoutes"));
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/videos", require("./routes/videoRoutes"));
app.use("/api/v1/notifications", require("./routes/notificationRoutes"));
app.use("/api/v1/sitemap.xml", require("./routes/sitemapRoutes"));

/* =====================================================
   Root test
===================================================== */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "ShopHub API is running 🚀",
    time: new Date().toISOString(),
  });
});

/* =====================================================
   Global error handler
===================================================== */
app.use((err, req, res, next) => {
  // Mongoose CastError (e.g. invalid ObjectId like "1") → 400
  if (err.name === "CastError") {
    err.statusCode = 400;
    err.message = "Invalid ID format";
  }

  // Mongoose Duplicate Key Error → 400
  if (err.code === 11000) {
    err.statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    err.message = `Duplicate value for ${field}. Please use another one!`;
  }

  console.error("ERROR 💥", err);

  res.status(err.statusCode || 500).json({
    status: (err.statusCode && err.statusCode.toString().startsWith('4')) ? "fail" : "error",
    message: err.message || "Internal Server Error",
  });
});

/* =====================================================
   Start server (after DB connect + ensure admin exists)
===================================================== */
const PORT = process.env.PORT || 5005;
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} 🚀`);
  
  // Ensure we have at least one admin
  try {
    await connectDB();
    const User = require("./models/userModel");
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      console.log("No admin found. Creating default admin...");
      await User.create({
        name: "Admin User",
        email: "admin@shophub.pro",
        password: "password123",
        passwordConfirm: "password123",
        role: "admin",
      });
      console.log("Default admin created: admin@shophub.pro / password123");
    }

    // [FIX] Drop old review index to ensure partialFilterExpression takes effect
    try {
        const Review = require("./models/reviewModel");
        await Review.collection.dropIndex("product_1_user_1");
        console.log("Dropped old review index to update constraints 🔄");
    } catch (e) {
        // Index might not exist or already dropped
    }

  } catch (err) {
    console.error("Initialization Error:", err.message);
  }
});
