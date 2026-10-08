# G-WEATHER Village Edition — Architecture & Roadmap

This document outlines the multi-stage progression of **G-WEATHER Village Edition** from an offline ESP32 weather station to a full MERN stack web application.

---

## 🗺️ Master Project Roadmap

```
  Stage 1: Offline Hardware & TFT Display (COMPLETED)
       │
       ▼
  Stage 2: Mobile Hotspot Wi-Fi Connectivity (CURRENT DELIVERABLE)
       │  - Non-blocking ESP32 station mode
       │  - Zero hardcoded credentials
       │  - Fully autonomous offline fallback
       ▼
  Stage 3: Node.js + Express API Backend (NEXT STAGE)
       │  - RESTful endpoints (`/api/weather`)
       │  - Secure HTTP POST data ingestion
       │  - Dynamic environment variable configuration (`.env`)
       ▼
  Stage 4: MongoDB Database Storage
       │  - Weather Schema (Temp, Hum, Press, Rain, Lux, Trends, 24h Stats, Timestamp)
       │  - Time-series data logging & indexing
       │  - Aggregations for historical min/max & daily averages
       ▼
  Stage 5: React Live Dashboard & Historical Charts
       │  - Responsive & Mobile-First UI
       │  - Live weather metrics, gauges, trend indicators
       │  - Interactive historical weather charts (Recharts / Chart.js)
       │  - Connection status indicator & offline warnings
       ▼
  Stage 6: ESP32 ➔ Mobile Hotspot ➔ MERN Live Data Integration
          - Full end-to-end telemetry streaming from ESP32 to React live dashboard
```

---

## 🛡️ Security Architecture & Best Practices

1. **Zero Credential Hardcoding**:
   - ESP32 source code uses placeholder macros `WIFI_SSID` and `WIFI_PASSWORD`.
   - Node.js backend loads secrets via `process.env` (`dotenv`).
   - React frontend accesses backend only through relative `/api` calls or proxy setup; MongoDB credentials and backend secrets are NEVER compiled into client-side bundles.

2. **Offline-First Hardware Resiliency**:
   - The ESP32 30-pin DevKit weather station operates 100% autonomously.
   - Wi-Fi connection attempts run non-blockingly; if the mobile phone hotspot is turned off or out of range, local sensor reads (DHT22, BMP280, BH1750, Rain Sensor), ST7735 TFT 8-page zero-flicker UI updates, DS1307 RTC tracking, V2 trend calculations, and microSD CSV logging continue uninterrupted.

---

## 📡 Stage 3–6 Payload Schema Specification

When Stage 3 API integration begins, the ESP32 will transmit JSON payloads formatted as follows:

```json
{
  "timestamp": "2026-10-08T21:20:00Z",
  "temperature": 28.4,
  "humidity": 65.2,
  "pressure": 1012.3,
  "pressureTrend": "Steady",
  "temperatureTrend": "Rising",
  "humidityTrend": "Steady",
  "lightLux": 450.0,
  "rainAdc": 4095,
  "rainFiltered": 4095.0,
  "rainProbability": 12.5,
  "rainStatus": "Clear / No Rain",
  "tempMin24h": 22.1,
  "tempMax24h": 31.8,
  "humMin24h": 45.0,
  "humMax24h": 82.0,
  "batteryVoltage": 4.12
}
```

---

## 🛠️ Hardware Pinout Reference (Fixed — Do Not Modify)

- **DHT22**: DATA -> GPIO4
- **I2C Bus (SDA 21, SCL 22)**: BMP280 (`0x76`), DS1307 RTC (`0x68`), BH1750 (`0x5C`)
- **Rain Sensor**: AO -> GPIO34
- **ST7735 TFT**: CS -> GPIO5, DC -> GPIO17, RST -> GPIO16, SCK -> GPIO18, MOSI -> GPIO23
- **microSD Card**: CS -> GPIO27, SCK -> GPIO18, MOSI -> GPIO23, MISO -> GPIO19
- **Battery Divider**: GPIO35
