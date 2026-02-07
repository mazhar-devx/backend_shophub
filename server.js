const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const compression = require('compression');
const path = require('path');
const cookieParser = require('cookie-parser');
const { setSecurityHeaders, sanitizeNoSQL, sanitizeXSS, preventParamPollution, rateLimiting } = require('./middleware/security');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, 'config.env') });

const connectDB = require('./config/db');

// Handle Database Password logic if needed
if (process.env.DATABASE && process.env.DATABASE_PASSWORD) {
  process.env.DATABASE = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
}

// Connect to database
connectDB();

// Create express app
const app = express();

// Enable CORS early
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(cookieParser());

// Security Middleware (Headers & Rate Limit) - Can be before body parser
app.use(setSecurityHeaders); // Helmet
app.use('/api', rateLimiting); // Rate limiting

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Body parser - MUST be before sanitization
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Data Sanitization - MUST be after body parser
app.use(sanitizeNoSQL); // Mongo Sanitize
app.use(sanitizeXSS); // XSS Clean
app.use(preventParamPollution); // HPP

app.use(compression());

// Routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const marketingRoutes = require('./routes/marketingRoutes');
const siteSettingsRoutes = require('./routes/siteSettingsRoutes');

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/marketing', marketingRoutes);
app.use('/api/v1/settings', siteSettingsRoutes);

// Test route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Ultra Advanced E-commerce API',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('ERROR 💥:', err);
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    message: err.message || 'Something went wrong!',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port} in ${process.env.NODE_ENV} mode`);
});