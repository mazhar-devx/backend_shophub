const dotenv = require('dotenv');
const Product = require('./models/productModel');

dotenv.config({ path: './config.env' }); // Ensure this path is correct relative to execution
// Fallback if config.env is in same dir
if (!process.env.DATABASE) {
    dotenv.config();
}

const DB = process.env.MONGO_URI;

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log('DB connection successful for migration'));

const migrateSlugs = async () => {
    try {
        const products = await Product.find({ slug: { $exists: false } });
        console.log(`Found ${products.length} products without slugs.`);

        for (const product of products) {
            if (!product.slug) {
                product.slug = product.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // Ensure uniqueness roughly for migration
                const existing = await Product.findOne({ slug: product.slug });
                if (existing && existing._id.toString() !== product._id.toString()) {
                    product.slug = `${product.slug}-${Math.floor(Math.random() * 1000)}`;
                }

                await product.save({ validateBeforeSave: false });
                console.log(`Updated slug for: ${product.name} -> ${product.slug}`);
            }
        }

        console.log('Migration completed.');
        process.exit();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrateSlugs();
