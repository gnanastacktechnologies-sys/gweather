import Weather from '../models/Weather.js';
import mongoose from 'mongoose';

// In-memory fallback telemetry cache
let inMemoryLatest = null;
let inMemoryHistory = [];

// In-memory Station Activity Log & Session State
let stationState = {
  firstSeenAt: new Date(),
  lastSeenAt: null,
  currentSessionStart: null,
  activityLogs: [],
  sessionHistory: []
};

// Log activity event
const addActivityLog = (type, title, description, details = {}) => {
  const logEntry = {
    id: 'act-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    type, // 'connection' | 'telemetry' | 'system'
    title,
    description,
    timestamp: new Date().toISOString(),
    details
  };
  stationState.activityLogs.unshift(logEntry);
  if (stationState.activityLogs.length > 100) {
    stationState.activityLogs = stationState.activityLogs.slice(0, 100);
  }
};

/**
 * GET /api/health
 */
export const getHealth = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "G-WEATHER API is running"
  });
};

/**
 * POST /api/weather
 * Ingest JSON telemetry from ESP32 or test client
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
      timestamp,
      batteryVoltage,
      isUsbPower,
      estimatedPowerW,
      estimatedEnergyWh,
      uptimeHours
    } = req.body;

    // Field validation: temperature, humidity, and pressure required
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

    const now = new Date();
    
    // Station Connection & Session Tracking
    const OFFLINE_THRESHOLD_MS = 6 * 60 * 1000; // 6 minutes
    const wasOffline = !stationState.lastSeenAt || (now - new Date(stationState.lastSeenAt)) > OFFLINE_THRESHOLD_MS;
    
    if (wasOffline) {
      stationState.currentSessionStart = now;
      addActivityLog(
        'connection',
        'Weather Station Came Online',
        `Device ${deviceId || 'GWEATHER-001'} connected to server API`,
        { deviceId: deviceId || 'GWEATHER-001' }
      );
    } else {
      addActivityLog(
        'telemetry',
        'Telemetry Received',
        `Temp: ${temperature}°C, Hum: ${humidity}%, Rain: ${rainStatus || 'DRY'} (${rainProbability || 0}%)`,
        { temperature, humidity, pressure, rainStatus }
      );
    }

    stationState.lastSeenAt = now;

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
      batteryVoltage: batteryVoltage !== undefined ? Number(batteryVoltage) : 0,
      isUsbPower: isUsbPower !== undefined ? Boolean(isUsbPower) : true,
      estimatedPowerW: estimatedPowerW !== undefined ? Number(estimatedPowerW) : 0,
      estimatedEnergyWh: estimatedEnergyWh !== undefined ? Number(estimatedEnergyWh) : 0,
      uptimeHours: uptimeHours !== undefined ? Number(uptimeHours) : 0,
      timestamp: parsedTimestamp,
      receivedAt: now
    };

    // Store in memory
    inMemoryLatest = payload;
    inMemoryHistory.unshift(payload);
    if (inMemoryHistory.length > 500) {
      inMemoryHistory = inMemoryHistory.slice(0, 500);
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
 * Get latest weather packet
 */
export const getLatestWeather = async (req, res) => {
  try {
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

    if (inMemoryLatest) {
      return res.status(200).json({
        success: true,
        message: "Latest weather data retrieved from cache",
        data: inMemoryLatest
      });
    }

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
 */
export const getWeatherHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const days = parseInt(req.query.days, 10) || 0;

    let records = [];

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

    if ((!records || records.length === 0) && inMemoryHistory.length > 0) {
      records = [...inMemoryHistory];
      if (days > 0) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        records = records.filter(item => new Date(item.receivedAt) >= startDate);
      }
      records = records.slice(0, limit);
    }

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
    return res.status(200).json({
      success: true,
      count: inMemoryHistory.length,
      summary: { totalReadings: inMemoryHistory.length },
      data: inMemoryHistory.slice(0, 50)
    });
  }
};

/**
 * GET /api/weather/station-activity
 * Returns Split Recent Activities:
 * 1. Station connection & hardware status (Online/Offline, Uptime hours, Session history)
 * 2. Weather telemetry update activity log stream
 */
export const getStationActivity = async (req, res) => {
  try {
    const now = new Date();
    const OFFLINE_THRESHOLD_MS = 6 * 60 * 1000; // 6 mins

    let lastSeen = stationState.lastSeenAt;
    
    // Check latest record timestamp if stationState.lastSeenAt is null
    if (!lastSeen && inMemoryLatest) {
      lastSeen = new Date(inMemoryLatest.receivedAt || inMemoryLatest.timestamp);
    }

    let isStationOnline = false;
    let currentSessionHours = 0;

    if (lastSeen) {
      const diffMs = now - new Date(lastSeen);
      isStationOnline = diffMs <= OFFLINE_THRESHOLD_MS;
      
      const sessionStart = stationState.currentSessionStart || stationState.firstSeenAt || lastSeen;
      currentSessionHours = Number(((now - new Date(sessionStart)) / (1000 * 60 * 60)).toFixed(2));
    }

    // Split activity into 2 categories:
    // Category 1: Connection & Hardware Uptime events
    // Category 2: Weather Report / Telemetry sync events
    const connectionLogs = stationState.activityLogs.filter(log => log.type === 'connection' || log.type === 'system');
    const weatherLogs = stationState.activityLogs.filter(log => log.type === 'telemetry');

    return res.status(200).json({
      success: true,
      station: {
        deviceId: inMemoryLatest?.deviceId || "GWEATHER-001",
        status: isStationOnline ? "ONLINE" : "OFFLINE",
        lastSeenAt: lastSeen ? new Date(lastSeen).toISOString() : null,
        currentSessionStart: stationState.currentSessionStart ? new Date(stationState.currentSessionStart).toISOString() : null,
        uptimeHours: currentSessionHours,
        batteryVoltage: inMemoryLatest?.batteryVoltage || 0,
        isUsbPower: inMemoryLatest?.isUsbPower ?? true,
        estimatedPowerW: inMemoryLatest?.estimatedPowerW || 0,
        estimatedEnergyWh: inMemoryLatest?.estimatedEnergyWh || 0,
        firmwareVersion: "V3.2 + Stage 6 Telemetry"
      },
      activities: {
        connectionHistory: connectionLogs.length > 0 ? connectionLogs : [
          {
            id: 'act-init-1',
            type: 'connection',
            title: isStationOnline ? 'Weather Station Online' : 'Weather Station Offline',
            description: isStationOnline 
              ? 'Station is active and sending telemetry heartbeats every 5 minutes' 
              : 'Station has not sent telemetry in the last 6 minutes',
            timestamp: lastSeen ? new Date(lastSeen).toISOString() : new Date().toISOString()
          }
        ],
        weatherReportLogs: weatherLogs.length > 0 ? weatherLogs : (
          inMemoryHistory.slice(0, 15).map((pkt, idx) => ({
            id: 'pkt-' + idx,
            type: 'telemetry',
            title: `Weather Telemetry #${idx + 1}`,
            description: `Temp: ${pkt.temperature}°C | Hum: ${pkt.humidity}% | Rain: ${pkt.rainStatus} (${pkt.rainProbability}%)`,
            timestamp: pkt.receivedAt || pkt.timestamp
          }))
        )
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/weather/calendar
 * Returns daily aggregate stats for G-Weather monthly calendar (temp min/max/avg, rain days)
 * Query Params: ?year=2026&month=10 (month 1-12)
 */
export const getMonthlyCalendar = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    let allRecords = [];

    if (mongoose.connection.readyState === 1) {
      try {
        allRecords = await Weather.find({
          receivedAt: { $gte: startDate, $lte: endDate }
        }).sort({ receivedAt: 1 });
      } catch (dbErr) {
        console.error('[DB Calendar Warning]', dbErr.message);
      }
    }

    if ((!allRecords || allRecords.length === 0) && inMemoryHistory.length > 0) {
      allRecords = inMemoryHistory.filter(r => {
        const d = new Date(r.receivedAt || r.timestamp);
        return d >= startDate && d <= endDate;
      });
    }

    // Group records by day of month
    const calendarDays = [];
    let monthlyRainyDays = 0;
    let allTemps = [];
    let allHums = [];

    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dayDateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      
      const dayRecords = allRecords.filter(r => {
        const d = new Date(r.receivedAt || r.timestamp);
        return d.getDate() === dayNum;
      });

      if (dayRecords.length > 0) {
        const temps = dayRecords.map(r => r.temperature);
        const hums = dayRecords.map(r => r.humidity);
        const rainProbs = dayRecords.map(r => r.rainProbability);
        
        const minT = Math.min(...temps);
        const maxT = Math.max(...temps);
        const avgT = Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1));
        const avgH = Number((hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1));
        const maxRainProb = Math.max(...rainProbs);

        // Determine dominant rain status
        const rainStatuses = dayRecords.map(r => r.rainStatus);
        let dominantStatus = "DRY";
        if (rainStatuses.includes("RAINING")) dominantStatus = "RAINING";
        else if (rainStatuses.includes("LIKELY")) dominantStatus = "LIKELY";
        else if (rainStatuses.includes("POSSIBLE")) dominantStatus = "POSSIBLE";
        else if (rainStatuses.includes("WATCH")) dominantStatus = "WATCH";

        if (dominantStatus === "RAINING" || dominantStatus === "LIKELY") {
          monthlyRainyDays++;
        }

        allTemps.push(...temps);
        allHums.push(...hums);

        calendarDays.push({
          day: dayNum,
          dateStr: dayDateStr,
          hasData: true,
          readingsCount: dayRecords.length,
          minTemp: minT,
          maxTemp: maxT,
          avgTemp: avgT,
          avgHumidity: avgH,
          maxRainProb,
          rainStatus: dominantStatus
        });
      } else {
        calendarDays.push({
          day: dayNum,
          dateStr: dayDateStr,
          hasData: false,
          readingsCount: 0,
          minTemp: null,
          maxTemp: null,
          avgTemp: null,
          avgHumidity: null,
          maxRainProb: 0,
          rainStatus: "NO_DATA"
        });
      }
    }

    const monthlySummary = {
      year,
      month,
      totalDays: totalDaysInMonth,
      recordedDays: calendarDays.filter(d => d.hasData).length,
      monthlyRainyDays,
      highestTemp: allTemps.length > 0 ? Math.max(...allTemps) : null,
      lowestTemp: allTemps.length > 0 ? Math.min(...allTemps) : null,
      avgMonthlyTemp: allTemps.length > 0 ? Number((allTemps.reduce((a, b) => a + b, 0) / allTemps.length).toFixed(1)) : null,
      avgMonthlyHumidity: allHums.length > 0 ? Number((allHums.reduce((a, b) => a + b, 0) / allHums.length).toFixed(1)) : null
    };

    return res.status(200).json({
      success: true,
      summary: monthlySummary,
      days: calendarDays
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
