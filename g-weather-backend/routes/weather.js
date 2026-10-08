import express from 'express';
import {
  getHealth,
  postWeatherData,
  getLatestWeather,
  getWeatherHistory
} from '../controllers/weatherController.js';

const router = express.Router();

// GET /api/health — Server Health Check
router.get('/health', getHealth);

// POST /api/weather — Ingest telemetry from ESP32 or client
router.post('/weather', postWeatherData);

// GET /api/weather/history — Retrieve historical telemetry & daily summary
router.get('/weather/history', getWeatherHistory);

// GET /api/weather — Retrieve latest telemetry
router.get('/weather', getLatestWeather);

export default router;
