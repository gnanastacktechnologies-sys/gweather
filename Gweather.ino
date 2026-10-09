/*
 * ============================================================================
 * G-WEATHER Village Edition — Master Firmware V3.2 + Stage 6 Telemetry
 * ============================================================================
 * Target Hardware: ESP32 DevKit V1 30-Pin
 *
 * Hardware Pinout (LOCKED SPECIFICATION — DO NOT CHANGE):
 * - DHT22:         DATA -> GPIO4
 * - I2C Bus:       SDA -> GPIO21, SCL -> GPIO22
 *   - BMP280:      I2C Address 0x76
 *   - DS1307 RTC:  I2C Address 0x68
 *   - BH1750:      I2C Address 0x5C (ADDR -> 3V3)
 * - Rain Sensor:   AO -> GPIO34 (Analog In)
 * - Battery Divider: Midpoint -> GPIO35 (Upper: 10.04kΩ, Lower: 9.90kΩ)
 * - ST7735 TFT:    CS -> GPIO5, DC -> GPIO17, RST -> GPIO16, SCK -> GPIO18, MOSI -> GPIO23
 * - MicroSD Card:  CS -> GPIO27, SCK -> GPIO18, MOSI -> GPIO23, MISO -> GPIO19 (Shared SPI)
 *
 * V3.2 Page Order (5-Second Page Rotation, Deep Navy Background, Zero Flicker):
 * - Page 1: Temperature (°C, 24h MIN, 24h MAX, Trend)
 * - Page 2: Humidity (%, 24h MIN, 24h MAX, Trend)
 * - Page 3: Barometric Pressure (hPa, Trend)
 * - Page 4: Ambient Light (Lux, Solar Condition)
 * - Page 5: Rain Possibility (%, Progress Bar, Classification)
 * - Page 6: Rain Status (RAINING / LIKELY / POSSIBLE / WATCH / DRY)
 * - Page 7: Power (USB POWER / Battery Voltage)
 * - Page 8: Date & Time (Centered: 12H Time AM/PM, DD MON YYYY, Weekday)
 *
 * Stage 6 Telemetry:
 * - Non-blocking HTTP POST upload every 60 seconds to Express API
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <DHT.h>
#include <Adafruit_BMP280.h>
#include <BH1750.h>
#include <RTClib.h>
#include <SD.h>
#include <FS.h>

// ============================================================================
// WIFI CONFIGURATION (STAGE 2)
// ============================================================================
const char* WIFI_SSID     = "Jio 5G";     // Mobile hotspot SSID placeholder
const char* WIFI_PASSWORD = "123456789"; // Mobile hotspot password placeholder

// ============================================================================
// STAGE 6: TELEMETRY SERVER CONFIGURATION
// ============================================================================
const char* SERVER_URL = "http://gweather-six.vercel.app/api/weather";
const char* DEVICE_ID  = "GWEATHER-001";

// ============================================================================
// HARDWARE PIN DEFINITIONS (EXACT SPECIFICATION)
// ============================================================================
#define DHT_PIN       4
#define DHT_TYPE      DHT22

#define I2C_SDA       21
#define I2C_SCL       22

#define RAIN_PIN      34
#define BATTERY_PIN   35

#define TFT_CS        5
#define TFT_DC        17
#define TFT_RST       16
#define TFT_SCK       18
#define TFT_MOSI      23

#define SD_CS         27
#define SD_SCK        18
#define SD_MOSI       23
#define SD_MISO       19

// Color Definition for Deep Navy V3.2 Background (#0b132b)
#define COLOR_NAVY    0x08A5

// Day and Month uppercase tables for Page 8
const char monthNamesUpper[12][4] = {
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
};

const char daysOfWeekUpper[7][10] = {
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"
};

// ============================================================================
// PERIPHERAL OBJECTS
// ============================================================================
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_BMP280 bmp;
RTC_DS1307 rtc;
BH1750 lightMeter(0x5C); // BH1750 on address 0x5C
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);

// ============================================================================
// GLOBAL WEATHER DATA & INTELLIGENCE STATE
// ============================================================================
struct WeatherData {
  float temperature = 0.0;
  float humidity = 0.0;
  float pressure = 0.0;
  float altitude = 0.0;
  float lux = 0.0;
  int rainRaw = 4095;
  float rainFiltered = 4095.0;
  float rainProbability = 0.0;
  String rainStatus = "DRY";

  // Trends (RISING / STABLE / FALLING)
  String tempTrend = "STABLE";
  String humTrend = "STABLE";
  String pressTrend = "STABLE";

  // 24-Hour Min / Max
  float tempMin24h = 999.0;
  float tempMax24h = -999.0;
  float humMin24h = 999.0;
  float humMax24h = -999.0;

  // Battery / Power
  float batteryVoltage = 0.0;
  bool isUsbPower = true;
};

WeatherData weather;

// Hardware Status Flags
bool bmpAvailable = false;
bool rtcAvailable = false;
bool bh1750Available = false;
bool sdAvailable = false;

// Wi-Fi Connection Tracking
bool wifiWasConnected = false;
unsigned long lastWifiRetryTime = 0;
const unsigned long WIFI_RETRY_INTERVAL = 10000; // 10 seconds non-blocking retry

// Non-Blocking Timers
unsigned long lastSensorReadTime = 0;
const unsigned long SENSOR_READ_INTERVAL = 2000;  // Every 2 seconds

unsigned long lastTftPageTime = 0;
const unsigned long TFT_PAGE_INTERVAL = 5000;     // V3.2 Page rotation every 5 seconds

unsigned long lastTftRefreshTime = 0;
const unsigned long TFT_REFRESH_INTERVAL = 1000;  // Dynamic text refresh every 1 sec

unsigned long lastSdLogTime = 0;
const unsigned long SD_LOG_INTERVAL = 60000;       // SD log every 60 seconds (1 min)

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 60000;    // Telemetry POST every 60 seconds (1 min)

unsigned long lastHistorySampleTime = 0;
const unsigned long HISTORY_SAMPLE_INTERVAL = 600000; // 10 mins for trend calculation

// TFT V3.2 8-Page Management
uint8_t currentTftPage = 0;
const uint8_t TOTAL_TFT_PAGES = 8;
bool pageNeedsFullRedraw = true;

// Sliding Trend Buffers (last 6 samples over 1 hour)
const int TREND_SAMPLES = 6;
float tempHistory[TREND_SAMPLES];
float humHistory[TREND_SAMPLES];
float pressHistory[TREND_SAMPLES];
int historyIndex = 0;
int historySampleCount = 0;

// Last known RTC DateTime
DateTime nowRTC;

// ============================================================================
// FORWARD DECLARATIONS
// ============================================================================
void initPeripherals();
void handleWiFiNonBlocking();
void readSensors();
void applyV2Intelligence();
void updateTrends();
void update24HourStats();
void logToSDCard();
void updateTFTDisplay();
void drawTFTPage(uint8_t page, bool fullRedraw);
String getFormattedTime12HNoSec();
String getFormattedDateDDMONYYYY();
String getDayOfWeekNameUpper();
String getFormattedISO8601Timestamp();
void handleTelemetryUpload();

// ============================================================================
// SETUP FUNCTION
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=============================================");
  Serial.println(" G-WEATHER Village Edition — V3.2 Startup");
  Serial.println(" Mobile Hotspot & Stage 6 Telemetry Active");
  Serial.println("=============================================");

  // Deselect SPI CS pins before SPI initialization to ensure SPI bus safety
  pinMode(TFT_CS, OUTPUT);
  digitalWrite(TFT_CS, HIGH);
  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  // Explicitly initialize shared hardware SPI bus for TFT and SD Card
  SPI.begin(TFT_SCK, SD_MISO, TFT_MOSI, -1);

  // Initialize Wire (I2C)
  Wire.begin(I2C_SDA, I2C_SCL);

  // Initialize Hardware Peripherals
  initPeripherals();

  // Initialize Wi-Fi in Station Mode (Non-Blocking Startup)
  WiFi.persistent(false); // Protect flash from continuous writes
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("Wi-Fi connecting...");

  // Initial Data Sample
  readSensors();
  applyV2Intelligence();

  // Initial Full TFT Render (V3.2 Deep Navy Background)
  tft.fillScreen(COLOR_NAVY);
  drawTFTPage(currentTftPage, true);

  // Initial SD log if SD card is ready
  logToSDCard();
}

// ============================================================================
// MAIN LOOP (NON-BLOCKING EXECUTOR)
// ============================================================================
void loop() {
  unsigned long currentMillis = millis();

  // 1. Non-Blocking Mobile Hotspot Connection Monitor
  handleWiFiNonBlocking();

  // 2. Periodic Sensor Sampling & V2 Intelligence Calculation (Every 2s)
  if (currentMillis - lastSensorReadTime >= SENSOR_READ_INTERVAL) {
    lastSensorReadTime = currentMillis;
    readSensors();
    applyV2Intelligence();
  }

  // 3. Periodic History Sampling for Trend Analysis (Every 10 mins)
  if (currentMillis - lastHistorySampleTime >= HISTORY_SAMPLE_INTERVAL || historySampleCount == 0) {
    lastHistorySampleTime = currentMillis;
    updateTrends();
  }

  // 4. SD Card Logging (Every 1 Minute)
  if (currentMillis - lastSdLogTime >= SD_LOG_INTERVAL) {
    lastSdLogTime = currentMillis;
    logToSDCard();
  }

  // 5. TFT Page Auto-Rotation (Every 5 seconds — Exact V3.2 Timing)
  if (currentMillis - lastTftPageTime >= TFT_PAGE_INTERVAL) {
    lastTftPageTime = currentMillis;
    currentTftPage = (currentTftPage + 1) % TOTAL_TFT_PAGES;
    pageNeedsFullRedraw = true;
  }

  // 6. TFT Screen Refresh (Every 1 sec, Zero-Flicker dynamic text update)
  if (currentMillis - lastTftRefreshTime >= TFT_REFRESH_INTERVAL || pageNeedsFullRedraw) {
    lastTftRefreshTime = currentMillis;
    updateTFTDisplay();
  }

  // 7. Live Telemetry Upload to Express API (Every 60 seconds)
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = currentMillis;
    handleTelemetryUpload();
  }

  // Small CPU yield for ESP32 background tasks
  yield();
}

// ============================================================================
// HARDWARE INITIALIZATION
// ============================================================================
void initPeripherals() {
  // 1. DHT22
  dht.begin();
  Serial.println("[Hardware] DHT22 initialized.");

  // 2. BMP280
  if (bmp.begin(0x76)) {
    bmpAvailable = true;
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                    Adafruit_BMP280::SAMPLING_X2,
                    Adafruit_BMP280::SAMPLING_X16,
                    Adafruit_BMP280::FILTER_X16,
                    Adafruit_BMP280::STANDBY_MS_500);
    Serial.println("[Hardware] BMP280 sensor detected at 0x76.");
  } else {
    Serial.println("[Hardware Warning] BMP280 not detected at 0x76.");
  }

  // 3. DS1307 RTC
  if (rtc.begin()) {
    rtcAvailable = true;
    if (!rtc.isrunning()) {
      Serial.println("[Hardware Warning] RTC is NOT running! Setting build time.");
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    } else {
      Serial.println("[Hardware] DS1307 RTC detected & running.");
    }
  } else {
    Serial.println("[Hardware Warning] DS1307 RTC not detected at 0x68.");
  }

  // 4. BH1750 Light Sensor
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x5C, &Wire)) {
    bh1750Available = true;
    Serial.println("[Hardware] BH1750 light sensor detected at 0x5C.");
  } else {
    Serial.println("[Hardware Warning] BH1750 light sensor not detected at 0x5C.");
  }

  // 5. ST7735 TFT Display
  tft.initR(INITR_BLACKTAB);
  tft.setRotation(0); // 128x160 Portrait
  tft.fillScreen(COLOR_NAVY);
  Serial.println("[Hardware] ST7735 TFT Display initialized.");

  // 6. MicroSD Card (Shared SPI)
  if (SD.begin(SD_CS, SPI, 4000000)) {
    sdAvailable = true;
    Serial.println("[Hardware] MicroSD Card initialized successfully.");

    // Check if log file exists, if not write header
    if (!SD.exists("/weather_log.csv")) {
      File logFile = SD.open("/weather_log.csv", FILE_WRITE);
      if (logFile) {
        logFile.println("Timestamp,Temp_C,Hum_Pct,Press_hPa,Lux,Rain_Raw,Rain_Filt,Rain_Prob_Pct,Rain_Status,Temp_Trend,Hum_Trend,Press_Trend,Temp_Min24h,Temp_Max24h,Hum_Min24h,Hum_Max24h,WiFi_Status");
        logFile.close();
        Serial.println("[SD Card] Created /weather_log.csv with headers.");
      }
    }
  } else {
    Serial.println("[Hardware Warning] MicroSD Card initialization failed.");
  }
}

// ============================================================================
// STAGE 2: NON-BLOCKING WIFI HANDLER
// ============================================================================
void handleWiFiNonBlocking() {
  wl_status_t currentStatus = WiFi.status();

  if (currentStatus == WL_CONNECTED) {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      Serial.println("WiFi connected");
    }
  } else {
    if (wifiWasConnected) {
      wifiWasConnected = false;
      Serial.println("WiFi disconnected");
      Serial.println("Retrying...");
    }

    // Periodically re-trigger non-blocking connection attempt if disconnected
    unsigned long currentMillis = millis();
    if (currentMillis - lastWifiRetryTime >= WIFI_RETRY_INTERVAL) {
      lastWifiRetryTime = currentMillis;
      if (currentStatus != WL_DISCONNECTED && currentStatus != WL_IDLE_STATUS) {
        WiFi.disconnect();
      }
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }
}

// ============================================================================
// SENSOR READING ENGINE
// ============================================================================
void readSensors() {
  // Read DHT22
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) weather.temperature = t;
  if (!isnan(h)) weather.humidity = h;

  // Read BMP280
  if (bmpAvailable) {
    float p = bmp.readPressure() / 100.0F; // Convert Pa to hPa
    float alt = bmp.readAltitude(1013.25);
    if (!isnan(p) && p > 300.0 && p < 1100.0) weather.pressure = p;
    if (!isnan(alt)) weather.altitude = alt;
  }

  // Read RTC Time
  if (rtcAvailable) {
    nowRTC = rtc.now();
  }

  // Read BH1750 Lux
  if (bh1750Available) {
    float l = lightMeter.readLightLevel();
    if (l >= 0.0) weather.lux = l;
  }

  // Read Rain Sensor (Analog GPIO34)
  int rawRain = analogRead(RAIN_PIN);
  weather.rainRaw = rawRain;

  // Rain Exponential Moving Average (EMA) Noise Filter (alpha = 0.15)
  const float alpha = 0.15;
  weather.rainFiltered = (alpha * rawRain) + ((1.0 - alpha) * weather.rainFiltered);

  // Read Battery Divider (GPIO35 with 10.04kΩ upper + 9.90kΩ lower divider)
  int battRaw = analogRead(BATTERY_PIN);
  const float dividerRatio = (10.04 + 9.90) / 9.90; // approx 2.01414
  weather.batteryVoltage = (battRaw / 4095.0) * 3.3 * dividerRatio;
  
  // Flag testing/USB power state if battery voltage is unpowered/floating below threshold
  weather.isUsbPower = (weather.batteryVoltage < 3.0);
}

// ============================================================================
// V2 INTELLIGENCE ENGINE
// ============================================================================
void applyV2Intelligence() {
  // 1. Rain Wetness Percentage Calculation (4095 = Dry, <=1000 = Saturated)
  float wetnessPct = map(constrain((int)weather.rainFiltered, 1000, 4095), 4095, 1000, 0, 100);

  // 2. Barometric & Atmospheric Rain Probability Calculation (V2 Intelligence)
  float prob = 0.0;

  // Rain sensor wetness contribution
  if (wetnessPct > 5.0) {
    prob += wetnessPct * 0.8;
  }

  // Humidity contribution (Base score if > 60%)
  if (weather.humidity > 60.0) {
    prob += (weather.humidity - 60.0) * 1.0;
  }

  // Pressure contribution (Standard sea level = 1013.25 hPa)
  if (weather.pressure > 0.0 && weather.pressure < 1013.25) {
    prob += (1013.25 - weather.pressure) * 1.5;
  }

  // Pressure trend contribution
  if (weather.pressTrend == "FALLING") {
    prob += 15.0;
  }

  // Humidity trend contribution
  if (weather.humTrend == "RISING") {
    prob += 10.0;
  }

  // Temperature trend contribution
  if (weather.tempTrend == "FALLING") {
    prob += 5.0;
  }

  weather.rainProbability = constrain(prob, 0.0, 100.0);

  // 3. Approved V2 Rain Status Classifications (RAINING, LIKELY, POSSIBLE, WATCH, DRY)
  if (wetnessPct > 20.0) {
    weather.rainStatus = "RAINING";
  } else if (weather.rainProbability >= 70.0) {
    weather.rainStatus = "LIKELY";
  } else if (weather.rainProbability >= 45.0) {
    weather.rainStatus = "POSSIBLE";
  } else if (weather.rainProbability >= 25.0) {
    weather.rainStatus = "WATCH";
  } else {
    weather.rainStatus = "DRY";
  }

  // 4. Update 24-Hour Min / Max Tracking
  update24HourStats();
}

// ============================================================================
// SLIDING TREND ANALYSIS
// ============================================================================
void updateTrends() {
  tempHistory[historyIndex] = weather.temperature;
  humHistory[historyIndex] = weather.humidity;
  pressHistory[historyIndex] = weather.pressure;

  historyIndex = (historyIndex + 1) % TREND_SAMPLES;
  if (historySampleCount < TREND_SAMPLES) historySampleCount++;

  // Need at least 2 historical samples before calculating trend direction
  if (historySampleCount < 2) {
    weather.tempTrend = "STABLE";
    weather.humTrend = "STABLE";
    weather.pressTrend = "STABLE";
    return;
  }

  int prevIdx = (historyIndex - historySampleCount + TREND_SAMPLES) % TREND_SAMPLES;

  // Temp Trend (> +0.3°C = RISING, < -0.3°C = FALLING, else STABLE)
  float dTemp = weather.temperature - tempHistory[prevIdx];
  if (dTemp > 0.3) weather.tempTrend = "RISING";
  else if (dTemp < -0.3) weather.tempTrend = "FALLING";
  else weather.tempTrend = "STABLE";

  // Humidity Trend (> +1.0% = RISING, < -1.0% = FALLING, else STABLE)
  float dHum = weather.humidity - humHistory[prevIdx];
  if (dHum > 1.0) weather.humTrend = "RISING";
  else if (dHum < -1.0) weather.humTrend = "FALLING";
  else weather.humTrend = "STABLE";

  // Pressure Trend (> +0.5 hPa = RISING, < -0.5 hPa = FALLING, else STABLE)
  float dPress = weather.pressure - pressHistory[prevIdx];
  if (dPress > 0.5) weather.pressTrend = "RISING";
  else if (dPress < -0.5) weather.pressTrend = "FALLING";
  else weather.pressTrend = "STABLE";
}

// ============================================================================
// 24-HOUR MIN / MAX TRACKING
// ============================================================================
void update24HourStats() {
  // Midnight reset check using RTC
  static int lastDay = -1;
  if (rtcAvailable) {
    int currentDay = nowRTC.day();
    if (lastDay != -1 && currentDay != lastDay) {
      // Reset bounds at midnight
      weather.tempMin24h = weather.temperature;
      weather.tempMax24h = weather.temperature;
      weather.humMin24h = weather.humidity;
      weather.humMax24h = weather.humidity;
    }
    lastDay = currentDay;
  }

  // Update bounds
  if (weather.temperature < weather.tempMin24h) weather.tempMin24h = weather.temperature;
  if (weather.temperature > weather.tempMax24h) weather.tempMax24h = weather.temperature;
  if (weather.humidity < weather.humMin24h) weather.humMin24h = weather.humidity;
  if (weather.humidity > weather.humMax24h) weather.humMax24h = weather.humidity;
}

// ============================================================================
// MICROSD CARD LOGGING (1 MINUTE INTERVAL)
// ============================================================================
void logToSDCard() {
  if (!sdAvailable) return;

  File logFile = SD.open("/weather_log.csv", FILE_APPEND);
  if (logFile) {
    logFile.print(getFormattedDateDDMONYYYY());
    logFile.print(" ");
    logFile.print(getFormattedTime12HNoSec());
    logFile.print(",");
    logFile.print(weather.temperature, 2);
    logFile.print(",");
    logFile.print(weather.humidity, 2);
    logFile.print(",");
    logFile.print(weather.pressure, 2);
    logFile.print(",");
    logFile.print(weather.lux, 1);
    logFile.print(",");
    logFile.print(weather.rainRaw);
    logFile.print(",");
    logFile.print(weather.rainFiltered, 1);
    logFile.print(",");
    logFile.print(weather.rainProbability, 1);
    logFile.print(",");
    logFile.print(weather.rainStatus);
    logFile.print(",");
    logFile.print(weather.tempTrend);
    logFile.print(",");
    logFile.print(weather.humTrend);
    logFile.print(",");
    logFile.print(weather.pressTrend);
    logFile.print(",");
    logFile.print(weather.tempMin24h, 1);
    logFile.print(",");
    logFile.print(weather.tempMax24h, 1);
    logFile.print(",");
    logFile.print(weather.humMin24h, 1);
    logFile.print(",");
    logFile.print(weather.humMax24h, 1);
    logFile.print(",");
    logFile.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");

    logFile.close();
    Serial.println("[SD Log] Data log entry written to /weather_log.csv");
  } else {
    Serial.println("[SD Log Error] Failed to open /weather_log.csv for writing.");
  }
}

// ============================================================================
// EXACT V3.2 TFT RENDERING ENGINE (8 PAGES, DEEP NAVY BG, ZERO FLICKER)
// ============================================================================
void updateTFTDisplay() {
  if (pageNeedsFullRedraw) {
    tft.fillScreen(COLOR_NAVY);
    drawTFTPage(currentTftPage, true);
    pageNeedsFullRedraw = false;
  } else {
    // Dirty-region dynamic refresh without full screen clear
    drawTFTPage(currentTftPage, false);
  }
}

void drawTFTPage(uint8_t page, bool fullRedraw) {
  tft.setTextSize(1);

  // Header Title "G-WEATHER" (Centered at top)
  if (fullRedraw) {
    tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
    tft.setCursor(37, 10);
    tft.print("G-WEATHER");
  }

  switch (page) {
    case 0: // PAGE 1: TEMPERATURE
      if (fullRedraw) {
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(31, 30); tft.print("TEMPERATURE");
        
        tft.setTextColor(ST7735_WHITE, COLOR_NAVY);
        tft.setCursor(16, 86); tft.print("24h MIN");
        tft.setCursor(16, 100); tft.print("24h MAX");
      }

      // Large Prominent Temperature
      {
        String tempVal = String(weather.temperature, 1) + " C";
        int tempX = (128 - (tempVal.length() * 12)) / 2;
        tft.setTextSize(2);
        tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
        tft.setCursor(tempX > 0 ? tempX : 0, 54);
        tft.print(tempVal);
      }

      // 24h Bounds
      tft.setTextSize(1);
      tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
      tft.setCursor(68, 86);  tft.print(weather.tempMin24h, 1); tft.print(" C   ");
      tft.setCursor(68, 100); tft.print(weather.tempMax24h, 1); tft.print(" C   ");

      // Trend (RISING / STABLE / FALLING)
      {
        int trendX = (128 - (weather.tempTrend.length() * 6)) / 2;
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(trendX > 0 ? trendX : 0, 118);
        tft.print(weather.tempTrend);
        tft.print("   ");
      }
      break;

    case 1: // PAGE 2: HUMIDITY
      if (fullRedraw) {
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(40, 30); tft.print("HUMIDITY");
        
        tft.setTextColor(ST7735_WHITE, COLOR_NAVY);
        tft.setCursor(16, 86); tft.print("24h MIN");
        tft.setCursor(16, 100); tft.print("24h MAX");
      }

      // Large Prominent Humidity
      {
        String humVal = String(weather.humidity, 1) + " %";
        int humX = (128 - (humVal.length() * 12)) / 2;
        tft.setTextSize(2);
        tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
        tft.setCursor(humX > 0 ? humX : 0, 54);
        tft.print(humVal);
      }

      // 24h Bounds
      tft.setTextSize(1);
      tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
      tft.setCursor(68, 86);  tft.print(weather.humMin24h, 1); tft.print(" %   ");
      tft.setCursor(68, 100); tft.print(weather.humMax24h, 1); tft.print(" %   ");

      // Trend (RISING / STABLE / FALLING)
      {
        int trendX = (128 - (weather.humTrend.length() * 6)) / 2;
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(trendX > 0 ? trendX : 0, 118);
        tft.print(weather.humTrend);
        tft.print("   ");
      }
      break;

    case 2: // PAGE 3: PRESSURE
      if (fullRedraw) {
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(40, 30); tft.print("PRESSURE");
      }

      // Prominent Pressure
      {
        String pressVal = String(weather.pressure, 1) + " hPa";
        int pressX = (128 - (pressVal.length() * 12)) / 2;
        tft.setTextSize(2);
        tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
        tft.setCursor(pressX > 0 ? pressX : 0, 60);
        tft.print(pressVal);
      }

      // Trend (RISING / STABLE / FALLING)
      {
        tft.setTextSize(1);
        int trendX = (128 - (weather.pressTrend.length() * 6)) / 2;
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(trendX > 0 ? trendX : 0, 95);
        tft.print(weather.pressTrend);
        tft.print("   ");
      }
      break;

    case 3: // PAGE 4: LIGHT
      if (fullRedraw) {
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(49, 30); tft.print("LIGHT");
      }

      // Prominent Lux
      {
        String luxVal = String(weather.lux, 0) + " lx";
        int luxX = (128 - (luxVal.length() * 12)) / 2;
        tft.setTextSize(2);
        tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
        tft.setCursor(luxX > 0 ? luxX : 0, 60);
        tft.print(luxVal);
      }

      // Light Condition Classification
      {
        tft.setTextSize(1);
        tft.setTextColor(ST7735_WHITE, COLOR_NAVY);
        String cond = "DAYLIGHT";
        if (weather.lux < 10.0)       cond = "DARK / NIGHT";
        else if (weather.lux < 300.0) cond = "DIM INDOOR";
        else if (weather.lux < 1000.0)cond = "BRIGHT INDOOR";
        else if (weather.lux < 10000) cond = "DAYLIGHT";
        else                          cond = "DIRECT SUNLIGHT";

        int condX = (128 - (cond.length() * 6)) / 2;
        tft.setCursor(condX > 0 ? condX : 0, 95);
        tft.print(cond);
        tft.print("   ");
      }
      break;

    case 4: // PAGE 5: RAIN POSSIBILITY
      if (fullRedraw) {
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(16, 28); tft.print("RAIN POSSIBILITY");
        
        // Progress Bar Outer Frame
        tft.drawRect(14, 75, 100, 14, ST7735_WHITE);
      }

      // Rain Probability %
      {
        String probVal = String(weather.rainProbability, 0) + " %";
        int probX = (128 - (probVal.length() * 12)) / 2;
        tft.setTextSize(2);
        tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
        tft.setCursor(probX > 0 ? probX : 0, 50);
        tft.print(probVal);
      }

      // Progress Bar Fill
      {
        int barW = map(constrain((int)weather.rainProbability, 0, 100), 0, 100, 0, 96);
        tft.fillRect(16, 77, 96, 10, COLOR_NAVY);
        if (barW > 0) {
          tft.fillRect(16, 77, barW, 10, ST7735_CYAN);
        }
      }

      // Rain Status Text
      {
        tft.setTextSize(1);
        int statusX = (128 - (weather.rainStatus.length() * 6)) / 2;
        tft.setTextColor(ST7735_WHITE, COLOR_NAVY);
        tft.setCursor(statusX > 0 ? statusX : 0, 100);
        tft.print(weather.rainStatus);
        tft.print("   ");
      }
      break;

    case 5: // PAGE 6: RAIN STATUS
      if (fullRedraw) {
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(31, 30); tft.print("RAIN STATUS");
      }

      // Large Prominent Status (RAINING / LIKELY / POSSIBLE / WATCH / DRY)
      {
        int statusX = (128 - (weather.rainStatus.length() * 12)) / 2;
        tft.setTextSize(2);
        tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
        tft.setCursor(statusX > 0 ? statusX : 0, 70);
        tft.print(weather.rainStatus);
        tft.print(" ");
      }
      break;

    case 6: // PAGE 7: POWER
      if (fullRedraw) {
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(49, 30); tft.print("POWER");
      }

      // Power Status (USB POWER during test mode)
      {
        tft.setTextSize(2);
        tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
        if (weather.isUsbPower) {
          tft.setCursor(10, 68);
          tft.print("USB POWER");
        } else {
          String vStr = String(weather.batteryVoltage, 2) + " V";
          int vX = (128 - (vStr.length() * 12)) / 2;
          tft.setCursor(vX > 0 ? vX : 0, 68);
          tft.print(vStr);
        }
      }
      break;

    case 7: // PAGE 8: EXACT APPROVED V3.2 DATE & TIME PAGE
      if (fullRedraw) {
        // Centered Header "G-WEATHER" (Text Size 1, Cyan)
        tft.setTextSize(1);
        tft.setTextColor(ST7735_CYAN, COLOR_NAVY);
        tft.setCursor(37, 10);
        tft.print("G-WEATHER");

        // Centered Subtitle "DATE & TIME" (Text Size 1, Cyan)
        tft.setCursor(31, 30);
        tft.print("DATE & TIME");
      }
      
      // 1. Time (12-Hour HH:MM AM/PM, No Seconds, Text Size 2, Centered, Yellow)
      {
        String timeStr = getFormattedTime12HNoSec();
        int timeX = (128 - (timeStr.length() * 12)) / 2;
        tft.setTextSize(2);
        tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
        tft.setCursor(timeX > 0 ? timeX : 0, 54);
        tft.print(timeStr);
      }

      // 2. Date (DD MON YYYY, Text Size 1, Centered, White)
      {
        String dateStr = getFormattedDateDDMONYYYY();
        int dateX = (128 - (dateStr.length() * 6)) / 2;
        tft.setTextSize(1);
        tft.setTextColor(ST7735_WHITE, COLOR_NAVY);
        tft.setCursor(dateX > 0 ? dateX : 0, 86);
        tft.print(dateStr);
      }

      // 3. Day of Week (Uppercase, Text Size 2, Centered, Yellow)
      {
        String dayStr = getDayOfWeekNameUpper();
        int dayX = (128 - (dayStr.length() * 12)) / 2;
        tft.setTextSize(2);
        tft.setTextColor(ST7735_YELLOW, COLOR_NAVY);
        tft.setCursor(dayX > 0 ? dayX : 0, 110);
        tft.print(dayStr);
      }
      break;
  }
}

// ============================================================================
// HELPER UTILITIES FOR DATE & TIME FORMATTING
// ============================================================================
String getFormattedTime12HNoSec() {
  if (!rtcAvailable) return "07:35 PM";
  int hour12 = nowRTC.hour() % 12;
  if (hour12 == 0) hour12 = 12;
  const char* ampm = nowRTC.hour() >= 12 ? "PM" : "AM";
  char buf[12];
  snprintf(buf, sizeof(buf), "%02d:%02d %s", hour12, nowRTC.minute(), ampm);
  return String(buf);
}

String getFormattedDateDDMONYYYY() {
  if (!rtcAvailable) return "08 OCT 2026";
  int m = nowRTC.month();
  if (m < 1 || m > 12) m = 1;
  char buf[15];
  snprintf(buf, sizeof(buf), "%02d %s %04d", nowRTC.day(), monthNamesUpper[m - 1], nowRTC.year());
  return String(buf);
}

String getDayOfWeekNameUpper() {
  if (!rtcAvailable) return "THURSDAY";
  int d = nowRTC.dayOfTheWeek();
  if (d < 0 || d > 6) d = 0;
  return String(daysOfWeekUpper[d]);
}

String getFormattedISO8601Timestamp() {
  if (!rtcAvailable) return "2026-01-01T00:00:00";
  char buf[25];
  snprintf(buf, sizeof(buf), "%04d-%02d-%02dT%02d:%02d:%02d",
           nowRTC.year(), nowRTC.month(), nowRTC.day(),
           nowRTC.hour(), nowRTC.minute(), nowRTC.second());
  return String(buf);
}

// ============================================================================
// STAGE 6: TELEMETRY HTTP POST UPLOAD HANDLER
// ============================================================================
void handleTelemetryUpload() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Telemetry] Skipped - Wi-Fi offline");
    return;
  }

  Serial.println("[Telemetry] Sending telemetry payload to Express API...");

  WiFiClient client;
  HTTPClient http;

  // Set reasonable timeout (5 seconds) and enable redirect following for Vercel HTTPS
  http.setTimeout(5000);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW);

  if (!http.begin(client, SERVER_URL)) {
    Serial.println("[Telemetry] HTTP connection failed - Invalid URL format");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  // Construct JSON payload using actual V3.2 sensor, RTC, and power values
  String jsonPayload = "{";
  jsonPayload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  jsonPayload += "\"temperature\":" + String(weather.temperature, 2) + ",";
  jsonPayload += "\"humidity\":" + String(weather.humidity, 2) + ",";
  jsonPayload += "\"pressure\":" + String(weather.pressure, 2) + ",";
  jsonPayload += "\"light\":" + String(weather.lux, 1) + ",";
  jsonPayload += "\"rainProbability\":" + String(weather.rainProbability, 1) + ",";
  jsonPayload += "\"rainStatus\":\"" + weather.rainStatus + "\",";
  jsonPayload += "\"pressureTrend\":\"" + weather.pressTrend + "\",";
  jsonPayload += "\"temperatureTrend\":\"" + weather.tempTrend + "\",";
  jsonPayload += "\"humidityTrend\":\"" + weather.humTrend + "\",";
  jsonPayload += "\"batteryVoltage\":" + String(weather.batteryVoltage, 2) + ",";
  jsonPayload += "\"isUsbPower\":" + String(weather.isUsbPower ? "true" : "false") + ",";
  jsonPayload += "\"estimatedPowerW\":" + String(weather.estimatedPowerW, 2) + ",";
  jsonPayload += "\"estimatedEnergyWh\":" + String(weather.estimatedEnergyWh, 2) + ",";
  jsonPayload += "\"uptimeHours\":" + String(millis() / 3600000.0, 2) + ",";
  jsonPayload += "\"timestamp\":\"" + getFormattedISO8601Timestamp() + "\"";
  jsonPayload += "}";

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    Serial.print("[Telemetry] HTTP ");
    Serial.println(httpResponseCode);
    if (httpResponseCode == 201 || httpResponseCode == 200) {
      Serial.println("[Telemetry] Upload successful");
    } else {
      Serial.print("[Telemetry] HTTP error: ");
      Serial.println(httpResponseCode);
    }
  } else {
    Serial.print("[Telemetry] HTTP connection failed: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}
