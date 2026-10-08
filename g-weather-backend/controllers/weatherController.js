import Weather from '../models/Weather.js';
import mongoose from 'mongoose';

// In-memory fallback telemetry cache (ensures zero 500 errors if DB is offline/unconfigured)
let inMemoryLatest = null;

// In-memory history buffer (keeps up to 200 recent packets safely)
let inMemoryHistory = [];

/**
 * GET /api/health
 * Health check endpoint to verify backend status
 */
export const getHealth = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "G-WEATHER API is running"
  });
};

/**
 * POST /api/weather
 * Receive JSON weather telemetry from ESP32 or client test tools
 */
export const postWeatherData = async (req, res, next) => {
  try {
    const {
      deviceId,
      temperature,
      humidity,
      pressure,
      light,
      rainProbability,
      rainStatus,
      pressureTrend,
      temperatureTrend,
      humidityTrend,
      timestamp
    } = req.body;

    // Field validation: temperature, humidity, and pressure must be provided and numeric
    if (temperature === undefined || isNaN(Number(temperature))) {
      return res.status(400).json({
        success: false,
        error: "Validation Error: 'temperature' is required and must be a number."
      });
    }

    if (humidity === undefined || isNaN(Number(humidity))) {
      return res.status(400).json({
        success: false,
        error: "Validation Error: 'humidity' is required and must be a number."
      });
    }

    if (pressure === undefined || isNaN(Number(pressure))) {
      return res.status(400).json({
        success: false,
        error: "Validation Error: 'pressure' is required and must be a number."
      });
    }

    // Parse timestamp safely
    let parsedTimestamp = new Date();
    if (timestamp) {
      const ts = new Date(timestamp);
      if (!isNaN(ts.getTime())) {
        parsedTimestamp = ts;
      }
    }

    const payload = {
      deviceId: deviceId || "GWEATHER-001",
      temperature: Number(temperature),
      humidity: Number(humidity),
      pressure: Number(pressure),
      light: light !== undefined ? Number(light) : 0,
      rainProbability: rainProbability !== undefined ? Number(rainProbability) : 0,
      rainStatus: rainStatus || "DRY",
      pressureTrend: pressureTrend || "STEADY",
      temperatureTrend: temperatureTrend || "STEADY",
      humidityTrend: humidityTrend || "STEADY",
      timestamp: parsedTimestamp,
      receivedAt: new Date()
    };

    // Store in in-memory cache & history buffer immediately
    inMemoryLatest = payload;
    inMemoryHistory.unshift(payload);
    if (inMemoryHistory.length > 200) {
      inMemoryHistory = inMemoryHistory.slice(0, 200);
    }

    // Persist to MongoDB if connected
    let savedRecord = payload;
    if (mongoose.connection.readyState === 1) {
      try {
        savedRecord = await Weather.create(payload);
      } catch (dbErr) {
        console.error('[DB Save Warning]', dbErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Weather data received",
      data: savedRecord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/weather
 * Safely retrieve latest weather data — short-circuits gracefully to prevent 500 errors
 */
export const getLatestWeather = async (req, res) => {
  try {
    // 1. If MongoDB is connected, try reading from DB
    if (mongoose.connection.readyState === 1) {
      try {
        const dbRecord = await Weather.findOne().sort({ receivedAt: -1 });
        if (dbRecord) {
          return res.status(200).json({
            success: true,
            message: "Latest weather data retrieved from DB",
            data: dbRecord
          });
        }
      } catch (dbErr) {
        console.error('[DB Query Warning]', dbErr.message);
      }
    }

    // 2. Fallback to in-memory cache if available
    if (inMemoryLatest) {
      return res.status(200).json({
        success: true,
        message: "Latest weather data retrieved from cache",
        data: inMemoryLatest
      });
    }

    // 3. Clean short-circuit (200 OK with null data, zero 500 errors)
    return res.status(200).json({
      success: true,
      message: "No weather data recorded yet",
      data: null
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      message: "Weather service online, waiting for telemetry",
      data: inMemoryLatest || null
    });
  }
};

/**
 * GET /api/weather/history
 * Safely retrieve historical data & day-wise statistics with full fallback protection
 * Query Params: ?limit=50&days=7
 */
export const getWeatherHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const days = parseInt(req.query.days, 10) || 0;

    let records = [];

    // 1. Try fetching from MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const query = {};
        if (days > 0) {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          query.receivedAt = { $gte: startDate };
        }
        records = await Weather.find(query).sort({ receivedAt: -1 }).limit(limit);
      } catch (dbErr) {
        console.error('[DB History Query Warning]', dbErr.message);
      }
    }

    // 2. Fallback to in-memory history if DB returned no records or DB is offline
    if ((!records || records.length === 0) && inMemoryHistory.length > 0) {
      records = [...inMemoryHistory];
      if (days > 0) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        records = records.filter(item => new Date(item.receivedAt) >= startDate);
      }
      records = records.slice(0, limit);
    }

    // 3. Calculate Day-Wise / Periodic Statistics
    let summary = {
      totalReadings: records.length,
      minTemp: null,
      maxTemp: null,
      avgTemp: null,
      minHumidity: null,
      maxHumidity: null,
      avgHumidity: null
    };

    if (records.length > 0) {
      const temps = records.map(r => r.temperature).filter(t => t !== undefined && !isNaN(t));
      const hums = records.map(r => r.humidity).filter(h => h !== undefined && !isNaN(h));

      if (temps.length > 0) {
        summary.minTemp = Math.min(...temps);
        summary.maxTemp = Math.max(...temps);
        summary.avgTemp = Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1));
      }

      if (hums.length > 0) {
        summary.minHumidity = Math.min(...hums);
        summary.maxHumidity = Math.max(...hums);
        summary.avgHumidity = Number((hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1));
      }
    }

    return res.status(200).json({
      success: true,
      count: records.length,
      summary,
      data: records
    });
  } catch (error) {
    // Fail-safe short-circuit for history
    return res.status(200).json({
      success: true,
      count: inMemoryHistory.length,
      summary: { totalReadings: inMemoryHistory.length },
      data: inMemoryHistory.slice(0, 50)
    });
  }
};
