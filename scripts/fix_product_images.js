const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const DB = process.env.MONGO_URI || process.env.DATABASE;

mongoose
    .connect(DB)
    .then(async () => {
        console.log('DB Connected. Starting migration...');

        // We need to define the schema with the NEW field to update it
        // Or just use strict: false for this operation if we were using raw commands,
        // but since we updated the code file, we can just require the model if we restart the process?
        // Actually, we can just define a temporary schema here.

        const productSchema = new mongoose.Schema({
            image: String,
            images: [String]
        }, { strict: false }); // Allow working with fields not in this minimal schema

        const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

        const products = await Product.find({
            $or: [
                { image: { $exists: false } },
                { image: null },
                { image: "" }
            ]
        });

        console.log(`Found ${products.length} products with missing main image.`);

        let updated = 0;
        for (const p of products) {
            if (p.images && p.images.length > 0) {
                p.image = p.images[0];
                await p.save();
                updated++;
                console.log(`Updated product ${p._id}: set image to ${p.images[0]}`);
            } else {
                console.log(`Skipping product ${p._id}: No images array available.`);
            }
        }

        console.log(`Migration complete. Updated ${updated} products.`);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
