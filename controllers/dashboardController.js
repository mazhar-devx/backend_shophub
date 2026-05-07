const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getDashboardStats = catchAsync(async (req, res, next) => {
    try {
        let productFilter = {};
        let orderFilter = {};
        let myProductIds = [];

        // VENDOR ISOLATION
        if (req.user && req.user.role === 'admin') {
            const myProducts = await Product.find({ vendor: req.user._id }).select('_id');
            myProductIds = myProducts.map(p => p._id);
            productFilter = { vendor: req.user._id };
            orderFilter = { 'items.product': { $in: myProductIds } };
        }

        // 1. Total Products
        const totalProducts = await Product.countDocuments(productFilter);

        // 2. Total Orders
        const totalOrders = await Order.countDocuments(orderFilter);

        // 3. Total Customers (Only global admins or filtered? Let's say admins see total for now or filter by who bought their stuff)
        const totalCustomers = await User.countDocuments({ role: 'user' });

        // 4. Total Revenue (Isolated per vendor)
        let totalRevenue = 0;
        if (req.user && req.user.role === 'admin') {
            const revAgg = await Order.aggregate([
                { $unwind: "$items" },
                { $match: { "items.product": { $in: myProductIds } } },
                { $group: { _id: null, total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } }
            ]);
            totalRevenue = revAgg.length > 0 ? revAgg[0].total : 0;
        } else {
            const revenueAgg = await Order.aggregate([
                { $group: { _id: null, total: { $sum: "$totalPrice" } } }
            ]);
            totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
        }

        // 5. Recent Orders
        let recentOrders = await Order.find(orderFilter)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name email')
            .populate('items.product', 'vendor price quantity');

        if (req.user && req.user.role === 'admin') {
            recentOrders = recentOrders.map(order => {
                const o = order.toObject();
                o.items = o.items.filter(item => item.product && item.product.vendor && item.product.vendor.toString() === req.user._id.toString());
                o.totalPrice = o.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
                return o;
            });
        }

        // 6. Recent Products
        const recentProducts = await Product.find(productFilter)
            .sort({ createdAt: -1 })
            .limit(5);

        // 7. Analytics Data (Isolated)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        let dailyRevenue = [];
        if (req.user && req.user.role === 'admin') {
            dailyRevenue = await Order.aggregate([
                { $match: { ...orderFilter, createdAt: { $gte: sevenDaysAgo } } },
                { $unwind: "$items" },
                { $match: { "items.product": { $in: myProductIds } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
        } else {
            dailyRevenue = await Order.aggregate([
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
        }

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
