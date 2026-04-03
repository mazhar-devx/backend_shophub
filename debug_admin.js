const mongoose = require('mongoose');
const Review = require('./models/reviewModel');
const Order = require('./models/orderModel');
const User = require('./models/userModel');
const Product = require('./models/productModel');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE_URL.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

mongoose
    .connect(DB)
    .then(async () => {
        console.log('DB Connected!');

        // Check Reviews
        const reviewCount = await Review.countDocuments();
        console.log(`TOTAL REVIEWS IN DB: ${reviewCount}`);
        const reviews = await Review.find().limit(3);
        console.log('Sample Reviews:', JSON.stringify(reviews, null, 2));

        // Check Dashboard Stats availability
        const orderCount = await Order.countDocuments();
        console.log(`TOTAL ORDERS: ${orderCount}`);

        const revenueStats = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        console.log('Revenue Stats:', revenueStats);

        process.exit();
    })
    .catch(err => {
        console.error('DB Error:', err);
        process.exit(1);
    });
