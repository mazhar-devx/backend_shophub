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
  "https://shophub.pro",         // live frontend (non-www)
  "https://backendshophub-production.up.railway.app", // backend itself
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
}));

// Pre-flight
app.options("*", cors());

/* =====================================================
   Middleware order MATTERS
===================================================== */
app.use(cookieParser());
app.use(setSecurityHeaders);
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
app.use("/api/v1/sitemap.xml", require("./routes/sitemapRoutes"));

/* =====================================================
   Root test
===================================================== */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "ShopHub API is running smoothly! 🔥",
    version: "1.0.0",
    owner: "mazhar.devx"
  });
});

/* =====================================================
   404 Handler
===================================================== */
app.all("*", (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  console.error("ERROR 💥", err); // Log full error object for better debugging

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

/* =====================================================
   Start server
===================================================== */
const PORT = process.env.PORT || 5005;

async function startServer() {
  try {
    // 1. Connect to Database
    await connectDB();
    console.log("Database connection successful! 📁");

    // 2. Ensure default admin exists
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

    // 3. Drop troublesome review index
    try {
        const Review = require("./models/reviewModel");
        await Review.collection.dropIndex("product_1_user_1");
        console.log("Dropped old review index to update constraints 🔄");
    } catch (e) {
        // Index might not exist or already dropped
    }

    // 4. Start Listening
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} 🚀`);
    });

  } catch (err) {
    console.error("Initialization Error:", err);
    process.exit(1);
  }
}

startServer();
