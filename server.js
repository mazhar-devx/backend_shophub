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
connectDB();

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
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // explicitly allow all
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests
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
app.use("/img/users", express.static(path.join(__dirname, "public/uploads/users")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

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
  console.error("ERROR 💥", err.message);

  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

/* =====================================================
   Start server
===================================================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
