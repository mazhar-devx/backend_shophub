const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/userModel');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, 'config.env') });

// Connect to DB (use MONGO_URI from config.env)
const DB = process.env.MONGO_URI || process.env.DATABASE;
if (!DB) {
    console.error('Missing MONGO_URI or DATABASE in config.env');
    process.exit(1);
}

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(async () => {
        console.log('DB Connected. Creating Admin User...');

        const adminEmail = 'admin@example.com';
        const adminPass = 'password123';

        // Check if exists
        let admin = await User.findOne({ email: adminEmail });

        if (admin) {
            console.log('Admin user already exists. Updating role...');
            admin.role = 'admin';
            admin.password = adminPass;
            admin.passwordConfirm = adminPass;
            await admin.save();
            console.log('Admin user updated successfully.');
        } else {
            await User.create({
                name: 'Super Admin',
                email: adminEmail,
                password: adminPass,
                passwordConfirm: adminPass,
                role: 'admin'
            });
            console.log('Admin user created successfully.');
        }

        console.log(`Attempting to create/update admin with Email: ${adminEmail} and Password: ${adminPass}`);
        console.log(`Credentials: ${adminEmail} / ${adminPass}`);
        process.exit();
    })
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
