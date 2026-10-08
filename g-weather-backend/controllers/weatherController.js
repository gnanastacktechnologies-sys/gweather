import Weather from '../models/Weather.js';

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
 * Saves every reading as a new document in MongoDB Atlas / MongoDB
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

    // Save persistent document to MongoDB
    const newRecord = await Weather.create({
      deviceId: deviceId || "GWEATHER-001",
      temperature: Number(temperature),
      humidity: Number(humidity),
      pressure: Number(pressure),
      light: light !== undefined ? Number(light) : 0,
      rainProbability: rainProbability !== undefined ? Number(rainProbability) : 0,
      rainStatus: rainStatus || "CLEAR",
      pressureTrend: pressureTrend || "STEADY",
      temperatureTrend: temperatureTrend || "STEADY",
      humidityTrend: humidityTrend || "STEADY",
      timestamp: parsedTimestamp,
      receivedAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: "Weather data received",
      data: newRecord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/weather
 * Fetch the latest weather record from MongoDB sorted by receivedAt
 */
export const getLatestWeather = async (req, res, next) => {
  try {
    const latestData = await Weather.findOne().sort({ receivedAt: -1 });

    if (!latestData) {
      return res.status(404).json({
        success: false,
        message: "No weather data found in database"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Latest weather data retrieved",
      data: latestData
    });
  } catch (error) {
    next(error);
  }
};
