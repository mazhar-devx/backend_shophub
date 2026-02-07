const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

exports.getDashboardStats = catchAsync(async (req, res, next) => {
    console.log('--- DASHBOARD STATS REQUEST ---');
    try {
        // 1. Total Products
        const totalProducts = await Product.countDocuments();
        console.log(`Products: ${totalProducts}`);

        // 2. Total Orders
        const totalOrders = await Order.countDocuments();
        console.log(`Orders: ${totalOrders}`);

        // 3. Total Customers
        const totalCustomers = await User.countDocuments({ role: 'user' });
        console.log(`Customers: ${totalCustomers}`);

        // 4. Total Revenue
        const revenueAgg = await Order.aggregate([
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
        console.log(`Revenue: ${totalRevenue}`);

        // 5. Recent Orders
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email');
        console.log(`Recent Orders: ${recentOrders.length}`);

        // 6. Recent Products
        const recentProducts = await Product.find()
            .sort({ createdAt: -1 })
            .limit(5);
        console.log(`Recent Products: ${recentProducts.length}`);

        // 7. Analytics Data
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dailyRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalPrice" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        console.log('Daily Revenue Calculated');

        res.status(200).json({
            status: 'success',
            data: {
                totalProducts,
                totalOrders,
                totalCustomers,
                totalRevenue,
                recentOrders,
                recentProducts,
                dailyRevenue
            }
        });
    } catch (error) {
        console.error('DASHBOARD ERROR:', error);
        return next(new AppError('Failed to fetch dashboard data: ' + error.message, 500));
    }
});
