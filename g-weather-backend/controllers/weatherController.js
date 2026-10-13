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

// Helper to parse station timestamps, ensuring local IST (+05:30) is preserved if no offset provided
const parseTimestampIST = (raw, isBatch = false) => {
  if (!raw) return isBatch ? null : new Date();
  if (raw instanceof Date) return raw;
  let str = String(raw).trim();
  // If ISO format without timezone offset, e.g. '2026-10-11T22:21:07'
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(str)) {
    str += '+05:30';
  } else if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(str)) {
    // SD format like '11 OCT 2026 09:56 PM'
    str += ' GMT+0530';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return isBatch ? null : new Date();

  // Validate range: reject future timestamps (> 5 mins ahead) or glitched dates (< year 2024 or > year 2030)
  const maxAllowedFuture = new Date(Date.now() + 5 * 60 * 1000);
  const minAllowedPast = new Date('2024-01-01T00:00:00Z');
  if (d > maxAllowedFuture || d < minAllowedPast) {
    console.warn(`[Timestamp Sanitizer] Rejected corrupted timestamp: '${str}'`);
    return isBatch ? null : new Date();
  }
  return d;
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
      uvIndex,
      batteryVoltage,
      isUsbPower,
      estimatedPowerW,
      estimatedEnergyWh,
      uptimeHours,
      heatIndex,
      dewPoint,
      seaLevelPressure,
      forecast,
      powerMode
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

    // Parse timestamp safely using IST helper
    let parsedTimestamp = parseTimestampIST(timestamp);
    const now = new Date();
    
    // For live telemetry packets: use current real-time `now` so each packet has a distinct, sequential timestamp
    const isLive = !req.body.source || req.body.source === 'live';
    if (isLive) {
      parsedTimestamp = now;
    }
    
    // Station Connection & Session Tracking
    const OFFLINE_THRESHOLD_MS = 12 * 60 * 1000; // 12 minutes
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

    let finalTemp = Number(temperature);
    let finalHum = Number(humidity);

    // If incoming packet has 0/0 due to sensor boot glitch, rescue from previous valid readings
    if (finalTemp === 0 && finalHum === 0) {
      if (inMemoryLatest && inMemoryLatest.temperature > 0) {
        finalTemp = inMemoryLatest.temperature;
        finalHum = inMemoryLatest.humidity;
      } else if (mongoose.connection.readyState === 1) {
        const lastValid = await Weather.findOne({ temperature: { $gt: 0 } }).sort({ receivedAt: -1, _id: -1 });
        if (lastValid) {
          finalTemp = lastValid.temperature;
          finalHum = lastValid.humidity;
        }
      }
    }

    const payload = {
      deviceId: deviceId || "GWEATHER-001",
      temperature: finalTemp,
      humidity: finalHum,
      pressure: Number(pressure),
      light: light !== undefined ? Number(light) : 0,
      uvIndex: uvIndex !== undefined ? Number(uvIndex) : 0,
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
      heatIndex: heatIndex !== undefined ? Number(heatIndex) : (finalTemp > 0 ? finalTemp : 0),
      dewPoint: dewPoint !== undefined ? Number(dewPoint) : 0,
      seaLevelPressure: seaLevelPressure !== undefined ? Number(seaLevelPressure) : Number(pressure),
      forecast: forecast || "Fair Weather",
      powerMode: powerMode || (isUsbPower ? "USB FULL" : "BATTERY NORMAL"),
      source: req.body.source || "live",
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
        // Retrieve newest reading by receivedAt (most recent real-time upload)
        let dbRecord = await Weather.findOne().sort({ receivedAt: -1, _id: -1 });
        
        // If the latest record came from offline SD batch (which lacks power/uptime fields),
        // seamlessly preserve the hardware power & runtime metrics from the latest live telemetry record
        if (dbRecord && (!dbRecord.uptimeHours || !dbRecord.estimatedPowerW)) {
          const liveWithPower = await Weather.findOne({ 
            uptimeHours: { $gt: 0 }
          }).sort({ receivedAt: -1, _id: -1 });
          
          if (liveWithPower) {
            dbRecord = dbRecord.toObject ? dbRecord.toObject() : { ...dbRecord };
            dbRecord.estimatedPowerW = liveWithPower.estimatedPowerW;
            dbRecord.estimatedEnergyWh = liveWithPower.estimatedEnergyWh;
            dbRecord.uptimeHours = liveWithPower.uptimeHours;
            if (!dbRecord.batteryVoltage && liveWithPower.batteryVoltage) {
              dbRecord.batteryVoltage = liveWithPower.batteryVoltage;
              dbRecord.isUsbPower = liveWithPower.isUsbPower;
            }
          }
        }

        // If the latest record had zeroed temperature and humidity (DHT22 sensor read timeout / boot glitch),
        // seamlessly preserve the last valid temperature and humidity readings
        if (dbRecord && dbRecord.temperature === 0 && dbRecord.humidity === 0) {
          const liveWithSensor = await Weather.findOne({ 
            temperature: { $gt: 0 }
          }).sort({ receivedAt: -1, _id: -1 });

          if (liveWithSensor) {
            dbRecord = dbRecord.toObject ? dbRecord.toObject() : { ...dbRecord };
            dbRecord.temperature = liveWithSensor.temperature;
            dbRecord.humidity = liveWithSensor.humidity;
          }
        }

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
        const query = { 
          temperature: { $gt: 0 }
        };
        if (days > 0) {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          query.$or = [
            { receivedAt: { $gte: startDate } },
            { timestamp: { $gte: startDate } }
          ];
        }
        records = await Weather.find(query).sort({ receivedAt: -1, _id: -1 }).limit(limit);
      } catch (dbErr) {
        console.error('[DB History Query Warning]', dbErr.message);
      }
    }

    if ((!records || records.length === 0) && inMemoryHistory.length > 0) {
      records = [...inMemoryHistory];
      if (days > 0) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        records = records.filter(item => new Date(item.timestamp || item.receivedAt) >= startDate);
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
    const OFFLINE_THRESHOLD_MS = 12 * 60 * 1000; // 12 minutes (allows 2 telemetry cycles of 5 min)

    let lastSeen = stationState.lastSeenAt;
    
    // Check latest record timestamp if stationState.lastSeenAt is null
    if (!lastSeen && inMemoryLatest) {
      lastSeen = new Date(inMemoryLatest.receivedAt || inMemoryLatest.timestamp);
    }

    let latestMetrics = inMemoryLatest;
    if ((!lastSeen || !latestMetrics) && mongoose.connection.readyState === 1) {
      try {
        const latestDb = await Weather.findOne().sort({ receivedAt: -1, _id: -1 });
        if (latestDb) {
          if (!lastSeen) lastSeen = latestDb.receivedAt || latestDb.timestamp;
          if (!latestMetrics) latestMetrics = latestDb;
        }
      } catch (e) {}
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
    let weatherLogs = stationState.activityLogs.filter(log => log.type === 'telemetry');

    if (weatherLogs.length === 0) {
      if (inMemoryHistory.length > 0) {
        weatherLogs = inMemoryHistory.slice(0, 15).map((pkt, idx) => ({
          id: 'pkt-' + idx,
          type: 'telemetry',
          title: 'Telemetry Received',
          description: `Temp: ${pkt.temperature}°C, Hum: ${pkt.humidity}%, Rain: ${pkt.rainStatus || 'DRY'} (${pkt.rainProbability || 0}%)`,
          timestamp: new Date(pkt.receivedAt || pkt.timestamp || now).toISOString(),
          details: {
            temperature: pkt.temperature,
            humidity: pkt.humidity,
            pressure: pkt.pressure,
            rainStatus: pkt.rainStatus
          }
        }));
      } else if (mongoose.connection.readyState === 1) {
        try {
          const recentDb = await Weather.find().sort({ receivedAt: -1, _id: -1 }).limit(15);
          weatherLogs = recentDb.map((pkt, idx) => ({
            id: 'db-pkt-' + (pkt._id || idx),
            type: 'telemetry',
            title: 'Telemetry Received',
            description: `Temp: ${pkt.temperature}°C, Hum: ${pkt.humidity}%, Rain: ${pkt.rainStatus || 'DRY'} (${pkt.rainProbability || 0}%)`,
            timestamp: new Date(pkt.receivedAt || pkt.timestamp).toISOString(),
            details: {
              temperature: pkt.temperature,
              humidity: pkt.humidity,
              pressure: pkt.pressure,
              rainStatus: pkt.rainStatus
            }
          }));
        } catch (e) {}
      }
    }

    return res.status(200).json({
      success: true,
      station: {
        deviceId: latestMetrics?.deviceId || "GWEATHER-001",
        status: isStationOnline ? "ONLINE" : "OFFLINE",
        lastSeenAt: lastSeen ? new Date(lastSeen).toISOString() : null,
        currentSessionStart: stationState.currentSessionStart ? new Date(stationState.currentSessionStart).toISOString() : null,
        uptimeHours: currentSessionHours,
        batteryVoltage: latestMetrics?.batteryVoltage || 0,
        isUsbPower: latestMetrics?.isUsbPower ?? true,
        estimatedPowerW: latestMetrics?.estimatedPowerW || 0,
        estimatedEnergyWh: latestMetrics?.estimatedEnergyWh || 0,
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
        weatherReportLogs: weatherLogs
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
          $or: [
            { timestamp: { $gte: startDate, $lte: endDate } },
            { receivedAt: { $gte: startDate, $lte: endDate } }
          ]
        }).sort({ timestamp: 1, receivedAt: 1 });
      } catch (dbErr) {
        console.error('[DB Calendar Warning]', dbErr.message);
      }
    }

    if ((!allRecords || allRecords.length === 0) && inMemoryHistory.length > 0) {
      allRecords = inMemoryHistory.filter(r => {
        const d = new Date(r.timestamp || r.receivedAt);
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
        const d = new Date(r.timestamp || r.receivedAt);
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

/**
 * POST /api/weather/batch
 * Ingest multiple offline telemetry records from SD card or CSV
 */
export const postWeatherBatch = async (req, res, next) => {
  try {
    const rawRecords = Array.isArray(req.body) ? req.body : req.body?.records;

    if (!rawRecords || !Array.isArray(rawRecords) || rawRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Validation Error: 'records' must be a non-empty array."
      });
    }

    const now = new Date();
    const validRecords = [];

    for (const item of rawRecords) {
      const {
        deviceId,
        temperature,
        humidity,
        pressure,
        light,
        uvIndex,
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
      } = item;

      if (
        temperature === undefined || isNaN(Number(temperature)) ||
        humidity === undefined || isNaN(Number(humidity)) ||
        pressure === undefined || isNaN(Number(pressure))
      ) {
        continue;
      }

      const parsedTimestamp = parseTimestampIST(timestamp, true);
      if (!parsedTimestamp) {
        continue;
      }

      validRecords.push({
        deviceId: deviceId || "GWEATHER-001",
        temperature: Number(temperature),
        humidity: Number(humidity),
        pressure: Number(pressure),
        light: light !== undefined ? Number(light) : 0,
        uvIndex: uvIndex !== undefined ? Number(uvIndex) : 0,
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
        source: item.source || "sd_average",
        timestamp: parsedTimestamp,
        receivedAt: now
      });
    }

    if (validRecords.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Batch processed; all records skipped due to invalid/corrupted timestamps.",
        insertedCount: 0,
        totalReceived: rawRecords.length
      });
    }

    let insertedCount = 0;

    if (mongoose.connection.readyState === 1) {
      const timestamps = validRecords.map(r => r.timestamp);
      const minTs = new Date(Math.min(...timestamps.map(t => t.getTime())) - 60000);
      const maxTs = new Date(Math.max(...timestamps.map(t => t.getTime())) + 60000);

      const existing = await Weather.find({
        deviceId: { $in: validRecords.map(r => r.deviceId) },
        timestamp: { $gte: minTs, $lte: maxTs }
      }).select('timestamp deviceId').lean();

      const toInsert = validRecords.filter(r => {
        const rTime = r.timestamp.getTime();
        const isDuplicate = existing.some(e => {
          return e.deviceId === r.deviceId && Math.abs(new Date(e.timestamp).getTime() - rTime) < 45000;
        });
        return !isDuplicate;
      });

      if (toInsert.length > 0) {
        const result = await Weather.insertMany(toInsert, { ordered: false });
        insertedCount = result.length;
      }
    } else {
      for (const rec of validRecords) {
        inMemoryHistory.unshift(rec);
      }
      if (inMemoryHistory.length > 1000) {
        inMemoryHistory = inMemoryHistory.slice(0, 1000);
      }
      insertedCount = validRecords.length;
    }

    addActivityLog(
      'telemetry',
      'Offline SD Card Sync',
      `Synchronized ${insertedCount} historical records from SD card / offline backlog`,
      { totalReceived: rawRecords.length, insertedCount }
    );

    return res.status(201).json({
      success: true,
      message: `Successfully synced ${insertedCount} offline weather records`,
      insertedCount,
      totalReceived: rawRecords.length
    });
  } catch (error) {
    next(error);
  }
};

