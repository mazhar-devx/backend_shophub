const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const DB = process.env.MONGO_URI || process.env.DATABASE;

mongoose
    .connect(DB)
    .then(async () => {
        console.log('DB Connected.');

        // Define a minimal schema to read products
        const productSchema = new mongoose.Schema({
            name: String,
            image: String,
            images: [String],
            createdAt: { type: Date, default: Date.now }
        });

        const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

        const products = await Product.find().sort({ createdAt: -1 }).limit(5);

        console.log('--- Last 5 Products ---');
        products.forEach(p => {
            console.log(`ID: ${p._id}`);
            console.log(`Name: ${p.name}`);
            console.log(`IMG: ${p.image}`);
            console.log(`IMGS: ${JSON.stringify(p.images)}`);
            console.log('---');
        });

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
