import mongoose from 'mongoose';

/**
 * Connects to MongoDB Atlas / Local MongoDB using Mongoose
 * Uses MONGODB_URI environment variable cleanly without exposing credentials
 * Handles connection reuse and fast-timeout in serverless environments (e.g. Vercel)
 */
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    const connStr = process.env.MONGODB_URI;

    if (!connStr) {
      console.log('[Database Notice] MONGODB_URI not defined — running in resilient fallback mode');
      return;
    }

    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 3000 // Fast 3-second timeout for serverless
    });
    console.log(`[Database] MongoDB connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message} — falling back to in-memory mode`);
  }
};

export default connectDB;
