import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import weatherRoutes from './routes/weather.js';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 17205;

// Enable CORS for future frontend integration
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json());

// API Routes
app.use('/api', weatherRoutes);

// Root Endpoint Info
app.get('/', (req, res) => {
  res.json({
    success: true,
    application: "G-WEATHER Village Edition API",
    stage: "Stage 4 — MongoDB Atlas Persistence",
    version: "1.0.0",
    endpoints: {
      health: "GET /api/health",
      getLatestWeather: "GET /api/weather",
      postWeather: "POST /api/weather"
    }
  });
});

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);

  // Handle JSON parse error from malformed body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON format in request body"
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: `Validation Error: ${messages.join(', ')}`
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error"
  });
});

// Connect to MongoDB first, then start Express server listening on 0.0.0.0
const startServer = async () => {
  await connectDB();
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`=================================================`);
    console.log(` G-WEATHER backend running on port ${PORT}`);
    console.log(` Server listening on ${HOST}:${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(` Weather API:  http://localhost:${PORT}/api/weather`);
    console.log(`=================================================`);
  });
};

startServer();
