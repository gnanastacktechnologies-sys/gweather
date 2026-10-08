# G-WEATHER Village Edition — Stage 5 React Web Dashboard

Welcome to **Stage 5** of the **G-WEATHER Village Edition** project!

Stage 5 introduces the **React.js + Vite Web Dashboard**. This responsive frontend application consumes live weather telemetry from the Node.js/Express API (running on port `17205`) and displays local weather metrics, trends, and rain estimates.

---

## 🗺️ System Architecture

```text
G-WEATHER ESP32 Firmware (Stage 1 & 2 — Working)
      │
      │ (Wi-Fi Hotspot)
      ▼
Mobile Hotspot
      │
      ▼
Node.js + Express API (Stage 3 — Port 17205)
      │
      ▼
MongoDB Atlas Persistence (Stage 4)
      │
      ▼
React Web Dashboard (Stage 5 — Live Web UI)
```

---

## 🎨 Dashboard Features

- ⚡ **Mobile-First Responsive Layout**: Clean grid styling optimized for smartphones, tablets, and desktop displays.
- 📡 **Automatic Telemetry Refresh**: Polls `GET /api/weather` every **10 seconds** without browser reloads.
- 🟢 **Live Backend Health Status**: Displays `● ONLINE` / `● OFFLINE` status based on `GET /api/health`.
- 🌧️ **Rain Estimate & Status**: Displays sensor-based rain probability progress bar and rain status.
- 📈 **Atmospheric Trends**: Visual indicators for Pressure, Temperature, and Humidity trends (`RISING`, `FALLING`, `STEADY`).
- 🕒 **Human-Readable Timestamp**: Formats backend `receivedAt` timestamp for clarity.
- 🛑 **Fault Tolerant**: Handles backend connection failures cleanly without crashing.

---

## 🛠️ Requirements & Setup

1. **Prerequisites**:
   - Node.js v18.0.0 or higher
   - npm v9.0.0 or higher
   - The Stage 4 Express backend running on `http://localhost:17205`

2. **Navigate into the frontend directory**:
   ```bash
   cd g-weather-frontend
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Environment Variables**:
   - A `.env` file is created automatically:
     ```env
     VITE_API_BASE_URL=http://localhost:17205/api
     ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The dashboard will open at `http://localhost:3000`.

---

## 🧪 Testing Procedure

1. **Verify Backend**: Ensure the backend is running (`node server.js` in `g-weather-backend`).
2. **Launch Dashboard**: Run `npm run dev` in `g-weather-frontend`.
3. **Check Online Status**: Verify that the top right badge displays `● ONLINE`.
4. **Test Live Data Updates**:
   - Send new weather telemetry to the backend using `POST http://localhost:17205/api/weather`:
     ```bash
     curl -X POST http://localhost:17205/api/weather \
       -H "Content-Type: application/json" \
       -d "{\"deviceId\":\"GWEATHER-001\",\"temperature\":31.2,\"humidity\":72.0,\"pressure\":982.5,\"light\":1650,\"rainProbability\":50,\"rainStatus\":\"DRIZZLE\",\"pressureTrend\":\"RISING\",\"temperatureTrend\":\"RISING\",\"humidityTrend\":\"STEADY\"}"
     ```
   - Within 10 seconds, observe the React dashboard automatically update to show Temperature `31.2 °C`, Humidity `72.0 %`, Pressure `982.5 hPa`, Light `1650 lx`, Rain Probability `50 %`, and Rain Status `DRIZZLE`.

5. **Test Backend Disconnect**:
   - Stop the backend server.
   - Within 10 seconds, the dashboard will gracefully update status to `● OFFLINE` and display a clean connection retry state without crashing.

---

## 📌 Next Stage
- **Stage 6**: ESP32 Live HTTP Telemetry Stream (Connecting ESP32 Wi-Fi directly to `POST http://localhost:17205/api/weather`).
