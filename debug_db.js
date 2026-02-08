const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.resolve(__dirname, 'config.env') });

console.log("---------------------------------------------------");
console.log("DIAGNOSTIC: Testing MongoDB Connection");
console.log("URI:", process.env.MONGO_URI ? "Found (Starts with " + process.env.MONGO_URI.substring(0, 15) + "...)" : "MISSING");
console.log("---------------------------------------------------");

if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI is missing from config.env");
    process.exit(1);
}

const connectDB = async () => {
    try {
        console.log("Attempting to connect to MongoDB...");
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        console.log("---------------------------------------------------");
        console.log("DIAGNOSTIC: SUCCESS. Database credentials work.");
        process.exit(0);
    } catch (error) {
        console.error("❌ MongoDB connection failed");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if (error.name === 'MongooseServerSelectionError') {
            console.error("\nHINT: This usually means your IP address is not whitelisted in MongoDB Atlas or you have no internet connection.");
        }
        process.exit(1);
    }
};

connectDB();
