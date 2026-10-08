import express from 'express';
import {
  getHealth,
  postWeatherData,
  getLatestWeather
} from '../controllers/weatherController.js';

const router = express.Router();

// GET /api/health — Server Health Check
router.get('/health', getHealth);

// POST /api/weather — Ingest telemetry from ESP32 or client
router.post('/weather', postWeatherData);

// GET /api/weather — Retrieve latest telemetry from memory
router.get('/weather', getLatestWeather);

export default router;
