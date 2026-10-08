# G-WEATHER Village Edition — Stage 4 Backend API (MongoDB Atlas)

Welcome to **Stage 4** of the **G-WEATHER Village Edition** project!

Stage 4 connects the Node.js + Express REST API to **MongoDB / MongoDB Atlas** using **Mongoose**, replacing temporary server memory with persistent database storage.

---

## 🗺️ System Architecture

```text
G-WEATHER ESP32
       │
       │ (Wi-Fi)
       ▼
Mobile Hotspot
       │
       ▼
Node.js + Express API (Stage 3)
       │
       ▼
MongoDB Atlas / Database (Stage 4 PERSISTENT STORAGE)
       │
       ▼
React Dashboard (Stage 5)
```

---

## 🔒 Security Best Practices

- **Zero Credentials Hardcoded**: Database connection URIs are loaded strictly via `process.env.MONGODB_URI` from `.env`.
- **Git Ignored**: `.env` is listed in `.gitignore` and never committed.
- **Safe Template**: `.env.example` contains only safe placeholder strings.
- **Log Masking**: Passwords and full connection strings are never printed in console logs.

---

## 🛠️ MongoDB Atlas Setup Guide

1. **Create an Atlas Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
   - Create a free shared cluster (M0).

2. **Create a Database User**:
   - Navigate to **Security ➔ Database Access**.
   - Click **Add New Database User**.
   - Choose **Password** authentication, enter a username and strong password, and assign the `Read and write to any database` role.

3. **Configure Network Access**:
   - Navigate to **Security ➔ Network Access**.
   - Click **Add IP Address** and select **Allow Access from Anywhere** (`0.0.0.0/0`) or enter your current IP.

4. **Get Connection String**:
   - Go to **Database ➔ Clusters ➔ Connect**.
   - Select **Drivers** (Node.js).
   - Copy the connection string format:
     ```text
     mongodb+srv://<username>:<password>@<cluster>.mongodb.net/gweather?retryWrites=true&w=majority
     ```

5. **Update `.env`**:
   - Paste your connection string into `g-weather-backend/.env`:
     ```env
     PORT=17205
     NODE_ENV=development
     MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxx.mongodb.net/gweather?retryWrites=true&w=majority
     ```

---

## 🚀 Installation & Running

1. Install dependencies:
   ```bash
   cd g-weather-backend
   npm install
   ```

2. Start the backend server:
   - **Production**:
     ```bash
     npm start
     ```
   - **Development**:
     ```bash
     npm run dev
     ```

---

## 🧪 Testing & Verification

### Test 1 — Health Check
```bash
curl http://localhost:17205/api/health
```
**Expected Response**:
```json
{
  "success": true,
  "message": "G-WEATHER API is running"
}
```

---

### Test 2 — Insert Weather Telemetry (POST)
```bash
curl -X POST http://localhost:17205/api/weather \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"GWEATHER-001\",\"temperature\":29.8,\"humidity\":68.5,\"pressure\":974.4,\"light\":1250,\"rainProbability\":65,\"rainStatus\":\"POSSIBLE\",\"pressureTrend\":\"RISING\",\"temperatureTrend\":\"STEADY\",\"humidityTrend\":\"STEADY\",\"timestamp\":\"2026-10-08T10:00:00\"}"
```
**Expected Response (HTTP 201 Created)**:
```json
{
  "success": true,
  "message": "Weather data received",
  "data": {
    "_id": "67055...",
    "deviceId": "GWEATHER-001",
    "temperature": 29.8,
    "humidity": 68.5,
    "pressure": 974.4,
    "light": 1250,
    "rainProbability": 65,
    "rainStatus": "POSSIBLE",
    "pressureTrend": "RISING",
    "temperatureTrend": "STEADY",
    "humidityTrend": "STEADY",
    "timestamp": "2026-10-08T10:00:00.000Z",
    "receivedAt": "2026-10-08T22:10:00.000Z"
  }
}
```

---

### Test 3 — Retrieve Latest Weather Reading (GET)
```bash
curl http://localhost:17205/api/weather
```
**Expected Response (HTTP 200 OK)**:
```json
{
  "success": true,
  "message": "Latest weather data retrieved",
  "data": {
    "_id": "67055...",
    "deviceId": "GWEATHER-001",
    "temperature": 29.8,
    "humidity": 68.5,
    "pressure": 974.4,
    "light": 1250,
    "rainProbability": 65,
    "rainStatus": "POSSIBLE",
    "pressureTrend": "RISING",
    "temperatureTrend": "STEADY",
    "humidityTrend": "STEADY",
    "timestamp": "2026-10-08T10:00:00.000Z",
    "receivedAt": "2026-10-08T22:10:00.000Z"
  }
}
```

---

### Test 4 — Persistence Test
1. Insert weather data via `POST /api/weather`.
2. Stop the Node.js server (`Ctrl + C`).
3. Start the server again (`npm start`).
4. Call `GET http://localhost:17205/api/weather`.
5. The weather reading is retrieved intact from MongoDB, proving persistence!

---

## 🔎 Verifying Data in MongoDB Atlas
In the MongoDB Atlas web dashboard:
1. Click **Browse Collections**.
2. Select database **`gweather`**.
3. Select collection **`weather`**.
4. You will see all persisted weather records with `_id`, `temperature`, `humidity`, `pressure`, etc.

---

## 📌 Upcoming Roadmap
- **Stage 5**: Build live React web dashboard with responsive charts.
- **Stage 6**: Enable ESP32 HTTP POST transmission over Wi-Fi.
