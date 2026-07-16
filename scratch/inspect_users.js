const mongoose = require('mongoose');
const User = require('../models/userModel');

const run = async () => {
    try {
        console.log("Connecting to local MongoDB...");
        await mongoose.connect('mongodb://127.0.0.1:27017/shophubDB');
        console.log("Connected.");

        const users = await User.find({
            $or: [
                { role: 'admin' },
                { vendorName: 'mazhar.devx' }
            ]
        });

        console.log("=== Admins / Users with vendorName: mazhar.devx ===");
        users.forEach(u => {
            console.log({
                id: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                vendorName: u.vendorName
            });
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

run();
