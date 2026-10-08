import mongoose from 'mongoose';

/**
 * Connects to MongoDB Atlas / Local MongoDB using Mongoose
 * Uses MONGODB_URI environment variable cleanly without exposing credentials
 */
const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI;

    if (!connStr) {
      console.error('[Database Error] MONGODB_URI is not defined in environment variables (.env)');
      process.exit(1);
    }

    const conn = await mongoose.connect(connStr);

    console.log(`[Database] MongoDB connected successfully to host: ${conn.connection.host}`);
    console.log(`[Database] Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
