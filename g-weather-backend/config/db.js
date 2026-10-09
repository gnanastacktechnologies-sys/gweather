import mongoose from 'mongoose';
import dns from 'dns';

/**
 * Connects to MongoDB Atlas / Local MongoDB using Mongoose
 * Uses MONGODB_URI environment variable cleanly
 * Handles connection reuse, local DNS fallback, and fast-timeout for Vercel
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

    try {
      const conn = await mongoose.connect(connStr, {
        serverSelectionTimeoutMS: 5000
      });
      console.log(`[Database] MongoDB Atlas connected successfully to host: ${conn.connection.host}`);
    } catch (firstErr) {
      // If local ISP DNS blocks SRV record resolution, set Google/Cloudflare public DNS and retry
      if (firstErr.message.includes('querySrv')) {
        console.log('[Database Notice] Retrying MongoDB Atlas SRV query using public DNS...');
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        const conn = await mongoose.connect(connStr, {
          serverSelectionTimeoutMS: 5000
        });
        console.log(`[Database] MongoDB Atlas connected successfully via fallback DNS to host: ${conn.connection.host}`);
      } else {
        throw firstErr;
      }
    }
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message} — falling back to in-memory mode`);
  }
};

export default connectDB;
