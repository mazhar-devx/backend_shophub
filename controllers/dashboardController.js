const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

exports.getDashboardStats = catchAsync(async (req, res, next) => {
    // 1. Total Products
    const totalProducts = await Product.countDocuments();

    // 2. Total Orders
    const totalOrders = await Order.countDocuments();

    // 3. Total Customers (role = 'user')
    const totalCustomers = await User.countDocuments({ role: 'user' });

    // 4. Total Revenue (sum of totalPrice for all orders, or only paid ones? For now, all)
    const revenueAgg = await Order.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: "$totalPrice" }
            }
        }
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    // 5. Recent Orders (limit 5)
    // Populate user name if needed, but Order model usually stores shippingAddress.fullName too
    // If user is referenced separately, populate it.
    const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email')
        .populate({
            path: 'items.product',
            select: 'name image'
        });

    // 6. Recent Products (limit 5)
    const recentProducts = await Product.find()
        .sort({ createdAt: -1 })
        .limit(5);

    // 7. Analytics Data (Daily Revenue for last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRevenue = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: sevenDaysAgo }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                revenue: { $sum: "$totalPrice" },
                orders: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

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
});
