const mongoose = require('mongoose');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Video = require('../models/videoModel');

const run = async () => {
    try {
        console.log("Connecting to local MongoDB...");
        await mongoose.connect('mongodb://127.0.0.1:27017/shophubDB');
        console.log("Connected.");

        const subAdminId = '6a06b5b18dd3fffcc841dbe6';
        const mainAdminId = '69fb7548d4cf4eda1bb71d24';

        const productsCount = await Product.countDocuments({ vendor: subAdminId });
        const videosCount = await Video.countDocuments({ user: subAdminId });

        console.log(`Sub-admin (${subAdminId}) created:`);
        console.log(`- Products: ${productsCount}`);
        console.log(`- Videos: ${videosCount}`);

        const mainProductsCount = await Product.countDocuments({ vendor: mainAdminId });
        const mainVideosCount = await Video.countDocuments({ user: mainAdminId });

        console.log(`Main admin (${mainAdminId}) created:`);
        console.log(`- Products: ${mainProductsCount}`);
        console.log(`- Videos: ${mainVideosCount}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

run();
