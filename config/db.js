const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined ❌");
    }

    // Connection options for maximum compatibility and reliability
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Explicitly enable TLS/SSL
      tls: true,
      ssl: true,
      // Some environments need this for stable handshakes
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
