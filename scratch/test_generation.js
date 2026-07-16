const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const { generateSingleProduct } = require('../utils/autoProductGenerator');

const runTest = async () => {
    if (!process.env.MONGO_URI) {
        console.error("ERROR: MONGO_URI is missing from config.env");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect('mongodb://127.0.0.1:27017/shophubDB');
        console.log("✅ MongoDB Connected.");

        console.log("Triggering single product generation...");
        const result = await generateSingleProduct();
        
        if (result) {
            console.log("\n================================================");
            console.log("🎉 SUCCESS: PRODUCT AUTOMATICALLY GENERATED!");
            console.log("================================================");
            console.log("Product Name:", result.product.name);
            console.log("Brand:", result.product.brand);
            console.log("Category:", result.product.category);
            console.log("Price (PKR):", result.product.price);
            console.log("Is Expensive:", result.product.isExpensive);
            console.log("Main Image URL:", result.product.image);
            console.log("Images (Count):", result.product.images?.length);
            console.log("Video URL:", result.product.video);
            console.log("Dimensions:", result.product.specifications?.dimensions);
            console.log("SEO Tags:", result.product.tags);
            console.log("------------------------------------------------");
            console.log("Associated Video Feed Entry:");
            console.log("Video Name:", result.video.name);
            console.log("Video URL:", result.video.videoUrl);
            console.log("Product Link:", result.video.productLink);
            console.log("================================================\n");
        } else {
            console.log("❌ FAILURE: Product generation returned null.");
        }

        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
        process.exit(0);
    } catch (err) {
        console.error("❌ TEST FAILED:", err);
        process.exit(1);
    }
};

runTest();
