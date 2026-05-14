const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined ❌");
    }
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed ❌");
    console.error(error.message);
    // Don't use process.exit(1) in serverless environments as it crashes the function
    throw error;
  }
};

module.exports = connectDB;
