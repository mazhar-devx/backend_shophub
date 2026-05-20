const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../config.env') });

const Product = require('../models/productModel');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Catalogue Update...');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const updateCatalogue = async () => {
  await connectDB();
  
  try {
    const products = await Product.find({});
    let updatedCount = 0;

    const premierBrands = ['apple', 'samsung', 'dior', 'sony', 'nike', 'adidas'];
    const disclaimer = "\n\n**Disclaimer:** This product is an authentic parallel import/open-box item sourced directly from global distributors.";

    for (let product of products) {
      let isModified = false;
      let newDescription = product.description;
      let newName = product.name;

      // 1. Replace HA Store with ShopHub.pro
      if (newDescription && newDescription.includes('HA Store')) {
        newDescription = newDescription.replace(/HA Store/g, 'ShopHub.pro');
        isModified = true;
      }
      if (newName && newName.includes('HA Store')) {
        newName = newName.replace(/HA Store/g, 'ShopHub.pro');
        isModified = true;
      }

      // 2. Add disclaimer for premier brands if not present
      if (product.brand && premierBrands.includes(product.brand.toLowerCase())) {
        if (newDescription && !newDescription.includes('parallel import')) {
          newDescription += disclaimer;
          isModified = true;
        }
      }

      if (isModified) {
        product.description = newDescription;
        product.name = newName;
        // save() will trigger hooks (like google merchant sync, slug generation)
        await product.save({ validateBeforeSave: false });
        updatedCount++;
        console.log(`Updated product: ${product.name}`);
      }
    }

    console.log(`Catalogue normalization complete. Updated ${updatedCount} products.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

updateCatalogue();
