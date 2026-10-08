# G-WEATHER Village Edition — Stage 2: Mobile Hotspot Wi-Fi Connectivity

Welcome to **Stage 2** of the **G-WEATHER Village Edition** weather station project!

In Stage 2, your ESP32 weather station is enhanced with **non-blocking Mobile Hotspot Wi-Fi connectivity** while maintaining 100% offline autonomy and reliability.

---

## 🔒 Security & Privacy Notice
* **NO hardcoded passwords or API keys**: Wi-Fi credentials use safe placeholders in `Gweather.ino`.
* **Zero Credentials Stored**: Do not send your hotspot password to AI tools or check real credentials into source control.

---

## 📌 Hardware Pinout Configuration (ESP32 30-Pin DevKit)

| Peripheral | Function / Line | ESP32 GPIO Pin / Bus |
| :--- | :--- | :--- |
| **DHT22** | DATA | GPIO 4 |
| **I2C Bus** | SDA | GPIO 21 |
| **I2C Bus** | SCL | GPIO 22 |
| **BMP280** | I2C Address | `0x76` |
| **DS1307 RTC** | I2C Address | `0x68` |
| **BH1750** | I2C Address | `0x5C` |
| **Rain Sensor** | AO (Analog) | GPIO 34 |
| **Battery Divider** | Midpoint (Testing disconnected) | GPIO 35 |
| **ST7735 TFT** | CS | GPIO 5 |
| **ST7735 TFT** | DC | GPIO 17 |
| **ST7735 TFT** | RST | GPIO 16 |
| **ST7735 TFT** | SCK (Shared SPI) | GPIO 18 |
| **ST7735 TFT** | MOSI (Shared SPI) | GPIO 23 |
| **microSD Card** | CS | GPIO 27 |
| **microSD Card** | SCK (Shared SPI) | GPIO 18 |
| **microSD Card** | MOSI (Shared SPI) | GPIO 23 |
| **microSD Card** | MISO (Shared SPI) | GPIO 19 |

---

## 🚀 How to Configure & Upload Code

1. Open `Gweather.ino` in **Arduino IDE** or **VS Code + PlatformIO**.
2. Near the top of `Gweather.ino`, locate the safe configuration section:
   ```cpp
   const char* WIFI_SSID     = "YOUR_HOTSPOT_SSID";     // Put your phone hotspot SSID here
   const char* WIFI_PASSWORD = "YOUR_HOTSPOT_PASSWORD"; // Put your phone hotspot password here
   ```
3. Enter your Mobile Phone Hotspot SSID and Password inside the quotes.
4. Select board: **ESP32 Dev Module** (or 30-pin ESP32 DevKit).
5. Compile and upload the sketch to your ESP32.

---

## 🧪 Stage 2 Testing Procedure

1. **Open Serial Monitor** in Arduino IDE at **115200 baud**.
2. **Turn ON your Mobile Phone Hotspot**.
3. Observe the Serial Monitor:
   ```text
   WiFi connected
   IP address: 192.168.43.x
   ```
4. **Turn OFF your Mobile Phone Hotspot**.
5. Observe the Serial Monitor output:
   ```text
   WiFi disconnected
   Retrying...
   ```
6. **Verify Weather Station Autonomy**:
   - Sensor sampling (DHT22, BMP280, BH1750, Rain) continues uninterrupted.
   - TFT 8-page display continues rotating smoothly without flicker.
   - MicroSD logging continues every 1 minute.
   - RTC clock keeps accurate time.
7. **Turn Hotspot ON again**:
   - The ESP32 will automatically detect the hotspot and reconnect in the background.

---

## 📊 Summary of V2 Intelligence & Features
- **Pressure / Temp / Humidity Trends**: Calculated via sliding history buffer.
- **Filtered Rain Sensor**: Noise reduction using Exponential Moving Average (EMA).
- **Rain Probability & Status**: Multivariable estimation combining wetness, pressure trends, and relative humidity.
- **24-Hour Min/Max Tracking**: Auto-resets daily at midnight via DS1307 RTC.
- **Zero-Flicker TFT**: 8-page rotation with selective dynamic text overwriting.
