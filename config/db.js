const mongoose = require("mongoose");

// Implement connection caching for serverless environments (like Vercel)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    console.log("Using cached MongoDB connection ✅");
    return cached.conn;
  }

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined ❌");
    }

    if (!cached.promise) {
      // Connection options optimized for serverless (Vercel)
      const options = {
        serverSelectionTimeoutMS: 15000, // Increased timeout to 15s for cold starts
        socketTimeoutMS: 45000,
        family: 4, // Force IPv4 to avoid IPv6 resolution issues
        // TLS is handled automatically by mongodb+srv://
        retryWrites: true,
        w: "majority",
      };

      console.log("Initializing new MongoDB connection...");
      cached.promise = mongoose.connect(process.env.MONGO_URI, options).then((mongooseInstance) => {
        return mongooseInstance;
      });
    }

    cached.conn = await cached.promise;
    console.log(`MongoDB Connected: ${cached.conn.connection.host} ✅`);
    return cached.conn;
  } catch (error) {
    console.error("MongoDB connection failed ❌");
    console.error(error.message);
    cached.promise = null;
    throw error;
  }
};

module.exports = connectDB;
