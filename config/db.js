const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined ❌");
    }

    // Connection options optimized for serverless (Vercel)
    const options = {
      serverSelectionTimeoutMS: 15000, // Increased timeout to 15s for cold starts
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 to avoid IPv6 resolution issues
      // TLS is handled automatically by mongodb+srv://
      retryWrites: true,
      w: "majority",
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed ❌");
    console.error(error.message);
    throw error;
  }
};

module.exports = connectDB;
