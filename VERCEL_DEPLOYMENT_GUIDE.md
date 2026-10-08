# 🚀 G-WEATHER Village Edition — Complete Vercel Deployment Guide

This guide walks you step-by-step through deploying both the **Express Backend** and **React Frontend** to Vercel from your GitHub repository:
`https://github.com/gnanastacktechnologies-sys/gweather.git`

---

## 🛠️ Step 1: Deploy the Express Backend (`g-weather-backend`)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** ➔ **"Project"**.
2. Select your repository: **`gnanastacktechnologies-sys/gweather`**.
3. In the project configuration screen:
   - **Project Name**: `g-weather-backend` (or your preferred name)
   - **Framework Preset**: Select **`Other`**
   - **Root Directory**: Click **Edit** and set it to: `g-weather-backend`
4. Expand **Environment Variables**:
   - **Key**: `MONGODB_URI`
   - **Value**: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/gweather?retryWrites=true&w=majority` *(Your actual MongoDB Atlas connection string)*
5. Click **Deploy**.

> 🔗 **Backend URL**: Once deployed, Vercel will give you a domain like:
> `https://g-weather-backend.vercel.app`
> Test it in your browser: `https://g-weather-backend.vercel.app/api/health` ➔ Should return `{"success":true}`

---

## 🌐 Step 2: Deploy the React Frontend (`g-weather-frontend`)

1. Return to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** ➔ **"Project"**.
2. Select the same repository again: **`gnanastacktechnologies-sys/gweather`**.
3. In the project configuration screen:
   - **Project Name**: `g-weather-frontend`
   - **Framework Preset**: Select **`Vite`**
   - **Root Directory**: Click **Edit** and set it to: `g-weather-frontend`
4. Expand **Environment Variables**:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://g-weather-backend.vercel.app/api` *(Replace with your actual backend Vercel URL + `/api`)*
5. Click **Deploy**.

> 🔗 **Frontend URL**: Vercel will give you a frontend domain like:
> `https://g-weather-frontend.vercel.app`
> Open it to view your live G-WEATHER Dashboard!

---

## 📡 Step 3: Update ESP32 Firmware Telemetry URL (`Gweather.ino`)

In `Gweather.ino`, update line 96:

```cpp
// Production Vercel Endpoint:
const char* SERVER_URL = "http://g-weather-backend.vercel.app/api/weather";
```

*(Note: Vercel automatically redirects `http://` to `https://`. If sending HTTPS directly from ESP32, ensure standard Wi-Fi HTTP client settings or `WiFiClientSecure`).*

---

## ✅ Deployment Summary Checklist

| Component | Target Service | Root Directory | Key Env Var |
| :--- | :--- | :--- | :--- |
| **Backend API** | Vercel Serverless | `g-weather-backend` | `MONGODB_URI` |
| **React Dashboard** | Vercel Static/SPA | `g-weather-frontend` | `VITE_API_BASE_URL` |
| **ESP32 Firmware** | Hardware (Arduino IDE) | `/` | `SERVER_URL` |
