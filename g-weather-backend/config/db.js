import mongoose from 'mongoose';

/**
 * Connects to MongoDB Atlas / Local MongoDB using Mongoose
 * Uses MONGODB_URI environment variable cleanly without exposing credentials
 * Handles connection reuse cleanly in serverless environments (e.g. Vercel)
 */
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    const connStr = process.env.MONGODB_URI;

    if (!connStr) {
      console.error('[Database Error] MONGODB_URI is not defined in environment variables');
      return;
    }

    const conn = await mongoose.connect(connStr);
    console.log(`[Database] MongoDB connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
  }
};

export default connectDB;
