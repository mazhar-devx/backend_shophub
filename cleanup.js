const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/productModel');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, 'config.env') });

const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(async () => {
        console.log('DB Connection Successful. DELETING ALL PRODUCTS...');
        try {
            await Product.deleteMany({});
            console.log('Successfully deleted all products.');
        } catch (err) {
            console.error('Error deleting products:', err);
        }
        process.exit();
    })
    .catch(err => {
        console.error('DB Connection Failed:', err);
        process.exit(1);
    });
