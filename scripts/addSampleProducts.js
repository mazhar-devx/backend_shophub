const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/productModel');

// Load environment variables
dotenv.config({ path: './config.env' });

// Connect to database
let DB = process.env.DATABASE;
if (process.env.DATABASE_PASSWORD && process.env.DATABASE_PASSWORD !== '') {
  DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
}

mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected successfully!'));

// Sample products data
const sampleProducts = [
  {
    name: "Wireless Bluetooth Headphones",
    description: "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
    price: 99.99,
    category: "electronics",
    brand: "SoundMax",
    images: ["https://via.placeholder.com/300x300"],
    stock: 25,
    ratingsAverage: 4.5,
    ratingsQuantity: 12
  },
  {
    name: "Running Shoes",
    description: "Lightweight running shoes with extra cushioning for maximum comfort.",
    price: 79.99,
    category: "sports",
    brand: "RunFast",
    images: ["https://via.placeholder.com/300x300"],
    stock: 42,
    ratingsAverage: 4.2,
    ratingsQuantity: 8
  },
  {
    name: "Coffee Maker",
    description: "Programmable coffee maker with thermal carafe and auto shut-off.",
    price: 59.99,
    category: "home",
    brand: "BrewMaster",
    images: ["https://via.placeholder.com/300x300"],
    stock: 18,
    ratingsAverage: 4.0,
    ratingsQuantity: 5
  },
  {
    name: "Smart Watch",
    description: "Feature-rich smartwatch with heart rate monitor and GPS tracking.",
    price: 199.99,
    category: "electronics",
    brand: "TechWear",
    images: ["https://via.placeholder.com/300x300"],
    stock: 12,
    ratingsAverage: 4.7,
    ratingsQuantity: 15
  },
  {
    name: "Backpack",
    description: "Durable backpack with laptop compartment and water bottle holder.",
    price: 39.99,
    category: "other",
    brand: "CarryAll",
    images: ["https://via.placeholder.com/300x300"],
    stock: 35,
    ratingsAverage: 4.3,
    ratingsQuantity: 7
  },
  {
    name: "Bluetooth Speaker",
    description: "Portable waterproof speaker with 360-degree sound and 12-hour battery.",
    price: 89.99,
    category: "electronics",
    brand: "SoundMax",
    images: ["https://via.placeholder.com/300x300"],
    stock: 28,
    ratingsAverage: 4.6,
    ratingsQuantity: 9
  },
  {
    name: "Yoga Mat",
    description: "Non-slip eco-friendly yoga mat with carrying strap.",
    price: 29.99,
    category: "sports",
    brand: "ZenFit",
    images: ["https://via.placeholder.com/300x300"],
    stock: 50,
    ratingsAverage: 4.1,
    ratingsQuantity: 6
  },
  {
    name: "Desk Lamp",
    description: "Adjustable LED desk lamp with touch controls and USB charging port.",
    price: 24.99,
    category: "home",
    brand: "BrightLight",
    images: ["https://via.placeholder.com/300x300"],
    stock: 45,
    ratingsAverage: 4.4,
    ratingsQuantity: 4
  }
];

// Add sample products to database
const addSampleProducts = async () => {
  try {
    // Clear existing products
    await Product.deleteMany();
    console.log('Existing products cleared');
    
    // Add sample products
    await Product.insertMany(sampleProducts);
    console.log('Sample products added successfully!');
    
    process.exit();
  } catch (err) {
    console.error('Error adding sample products:', err);
    process.exit(1);
  }
};

// Delete all products
const deleteAllProducts = async () => {
  try {
    await Product.deleteMany();
    console.log('All products deleted successfully!');
    process.exit();
  } catch (err) {
    console.error('Error deleting products:', err);
    process.exit(1);
  }
};

if (process.argv[2] === '--delete') {
  deleteAllProducts();
} else {
  addSampleProducts();
}