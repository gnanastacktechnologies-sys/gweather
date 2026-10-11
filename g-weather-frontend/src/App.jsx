import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import WeatherCard from './components/WeatherCard';
import RainCard from './components/RainCard';
import TrendCard from './components/TrendCard';
import PowerCard from './components/PowerCard';
import MonthlyCalendar from './components/MonthlyCalendar';
import RecentActivities from './components/RecentActivities';
import HistoryCard from './components/HistoryCard';
import SdSyncModal from './components/SdSyncModal';
import { getHealth, getLatestWeather, getWeatherHistory } from './services/weatherApi';

export default function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [filterDays, setFilterDays] = useState(0);

  const [isOnline, setIsOnline] = useState(false);
  const [isSdSyncOpen, setIsSdSyncOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdatedFormatted, setLastUpdatedFormatted] = useState('');

  const formatTimestamp = (rawTs) => {
    if (!rawTs) return '';
    try {
      const date = new Date(rawTs);
      if (isNaN(date.getTime())) return String(rawTs);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return String(rawTs);
    }
  };

  const fetchTelemetry = async (days = filterDays) => {
    const healthy = await getHealth();
    setIsOnline(healthy);

    if (!healthy) {
      setError('Unable to connect to G-WEATHER API');
      setLoading(false);
      return;
    }

    try {
      const result = await getLatestWeather();
      if (result.success) {
        setWeatherData(result.data);
        setError(null);
        if (result.data && (result.data.receivedAt || result.data.timestamp)) {
          setLastUpdatedFormatted(formatTimestamp(result.data.receivedAt || result.data.timestamp));
        }
      } else {
        setWeatherData(null);
      }
    } catch (err) {
      console.error('Telemetry Fetch Error:', err);
      setError('Unable to connect to G-WEATHER API');
    }

    try {
      const histResult = await getWeatherHistory(50, days);
      if (histResult.success) {
        setHistoryData(histResult.data || []);
        setHistorySummary(histResult.summary || null);
      }
    } catch (histErr) {
      console.error('History Fetch Error:', histErr);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, days) => {
    setSelectedFilter(filterName);
    setFilterDays(days);
    fetchTelemetry(days);
  };

  useEffect(() => {
    fetchTelemetry(filterDays);

    const intervalId = setInterval(() => {
      fetchTelemetry(filterDays);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [filterDays]);

  const getRainStatusClass = (status) => {
    switch (status) {
      case 'RAINING': return 'status-glow-raining';
      case 'LIKELY': return 'status-glow-likely';
      case 'POSSIBLE': return 'status-glow-possible';
      case 'WATCH': return 'status-glow-watch';
      default: return 'status-glow-dry';
    }
  };

  // Smart Multi-Sensor Day Phase & Sky Condition Detection
  const getWeatherAtmosphere = (data) => {
    if (!data) return { phase: 'Night', phaseIcon: '🌙', sky: 'Clear Night', skyIcon: '🌙', description: 'Nighttime darkness (0 lx)', lightTag: 'DARK / NIGHT' };

    const lux = data.light !== undefined ? Number(data.light) : 0;
    const humidity = data.humidity !== undefined ? Number(data.humidity) : 0;
    const rainStatus = (data.rainStatus || 'DRY').toUpperCase();

    // Determine current hour in local time
    let hour = new Date().getHours();
    if (data.timestamp || data.receivedAt) {
      const d = new Date(data.timestamp || data.receivedAt);
      if (!isNaN(d.getTime())) {
        hour = d.getHours();
      }
    }

    const isNight = lux < 10 || hour >= 20 || hour < 6;
    let phase = 'Night';
    let phaseIcon = '🌙';

    if (hour >= 6 && hour < 12) {
      phase = 'Morning';
      phaseIcon = '🌅';
    } else if (hour >= 12 && hour < 17) {
      phase = 'Afternoon';
      phaseIcon = '☀️';
    } else if (hour >= 17 && hour < 20) {
      phase = 'Evening';
      phaseIcon = '🌇';
    }

    // Light classification tag
    let lightTag = 'DAYLIGHT';
    if (lux < 10) lightTag = 'DARK / NIGHT';
    else if (lux < 300) lightTag = 'DIM SHADE';
    else if (lux < 3000) lightTag = 'OVERCAST CLOUDS';
    else if (lux < 12000) lightTag = 'DAYLIGHT';
    else lightTag = 'DIRECT SUNLIGHT';

    if (isNight) {
      if (rainStatus === 'RAINING') {
        return { phase, phaseIcon, sky: 'Night Rain', skyIcon: '🌧️', description: 'Active rainfall during night', lightTag };
      }
      if (rainStatus === 'LIKELY') {
        return { phase, phaseIcon, sky: 'Rain Likely', skyIcon: '🌧️', description: 'High probability of night rain', lightTag };
      }
      if (humidity >= 80 || rainStatus === 'POSSIBLE') {
        return { phase, phaseIcon, sky: 'Misty / Dew Night', skyIcon: '🌫️', description: `Night moisture (${humidity}% humidity • dew condensation)`, lightTag };
      }
      return { phase, phaseIcon, sky: 'Clear Night', skyIcon: '🌙', description: 'Clear night sky • safe conditions', lightTag };
    }

    // Daytime Sky Detection
    if (rainStatus === 'RAINING') {
      return { phase, phaseIcon, sky: 'Raining', skyIcon: '🌧️', description: 'Precipitation actively falling', lightTag };
    }
    if (rainStatus === 'LIKELY') {
      return { phase, phaseIcon, sky: 'Storm Approaching', skyIcon: '🌦️', description: 'Storm clouds & falling pressure', lightTag };
    }

    // Cloud detection using Lux and Humidity during daytime
    if (lux < 3500 && humidity > 75) {
      return { phase, phaseIcon, sky: 'Overcast & Cloudy', skyIcon: '☁️', description: 'Heavy clouds blocking solar radiation (< 3,500 lx)', lightTag: 'OVERCAST CLOUDS' };
    }
    if (lux < 8500 || rainStatus === 'POSSIBLE' || humidity > 70) {
      return { phase, phaseIcon, sky: 'Partly Cloudy', skyIcon: '⛅', description: 'Scattered clouds filtering sunlight', lightTag: 'PARTLY CLOUDY' };
    }
    if (lux < 16000) {
      return { phase, phaseIcon, sky: 'Filtered Sunlight', skyIcon: '🌤️', description: 'Mild diffuse solar daylight', lightTag: 'DAYLIGHT' };
    }
    return { phase, phaseIcon, sky: 'Clear & Sunny', skyIcon: '☀️', description: 'Direct clear sunlight (> 16,000 lx)', lightTag: 'DIRECT SUNLIGHT' };
  };

  const atmosphere = getWeatherAtmosphere(weatherData);

  return (
    <div className="app-container">
      <Header
        isOnline={isOnline}
        deviceId={weatherData?.deviceId}
        onOpenSdSync={() => setIsSdSyncOpen(true)}
        dayPhase={atmosphere.phase}
        dayPhaseIcon={atmosphere.phaseIcon}
      />

      <main className="dashboard-content">
        {loading ? (
          <div className="state-container loading-state">
            <div className="spinner"></div>
            <p className="state-message">Loading G-WEATHER data...</p>
          </div>
        ) : error ? (
          <div className="state-container error-state">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">{error}</h2>
            <p className="state-message">Please check backend API connection.</p>
            <button className="retry-btn" onClick={() => fetchTelemetry(filterDays)}>Retry Connection</button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {/* Master Hero Weather Banner */}
            <div className="hero-weather-card">
              <div className="hero-main-row">
                <div>
                  <div className="hero-title">Live Temperature</div>
                  <div className="hero-temp-block">
                    <span className="hero-temp-val">{weatherData?.temperature !== undefined ? weatherData.temperature : '--'}</span>
                    <span className="hero-temp-unit">°C</span>
                  </div>
                  <div className="hero-atmosphere-tags">
                    <span className="hero-tag-chip chip-phase">
                      <span>{atmosphere.phaseIcon}</span>
                      <span>{atmosphere.phase}</span>
                    </span>
                    <span className="hero-tag-chip chip-sky">
                      <span>{atmosphere.skyIcon}</span>
                      <span>{atmosphere.sky}</span>
                    </span>
                  </div>
                </div>

                <div className="hero-badges-col">
                  <div className={`hero-status-pill ${getRainStatusClass(weatherData?.rainStatus)}`}>
                    <span>{atmosphere.skyIcon}</span>
                    <span>{weatherData?.rainStatus || 'DRY'}</span>
                  </div>
                  <div className="hero-sky-subtext">{atmosphere.description}</div>
                </div>
              </div>

              <div className="hero-sub-stats">
                <div className="sub-stat-box">
                  <span className="sub-lbl">Humidity</span>
                  <span className="sub-val">{weatherData?.humidity !== undefined ? `${weatherData.humidity}%` : '--'}</span>
                </div>
                <div className="sub-stat-box">
                  <span className="sub-lbl">Pressure</span>
                  <span className="sub-val">{weatherData?.pressure !== undefined ? `${weatherData.pressure} hPa` : '--'}</span>
                </div>
                <div className="sub-stat-box">
                  <span className="sub-lbl">Ambient Light</span>
                  <span className="sub-val">{weatherData?.light !== undefined ? `${weatherData.light} lx` : '--'}</span>
                </div>
                <div className="sub-stat-box">
                  <span className="sub-lbl">UV Index</span>
                  <span className="sub-val text-amber">{weatherData?.uvIndex !== undefined ? `${weatherData.uvIndex} UVI` : '0 UVI'}</span>
                </div>
                <div className="sub-stat-box">
                  <span className="sub-lbl">Rain Chance</span>
                  <span className="sub-val">{weatherData?.rainProbability !== undefined ? `${weatherData.rainProbability}%` : '--'}</span>
                </div>
              </div>
            </div>

            {/* Core Weather Metrics Cards */}
            <div className="metrics-grid">
              <WeatherCard
                title="Humidity"
                value={weatherData?.humidity}
                unit="%"
                subtitle="DHT22 Relative Humidity"
              />

              <WeatherCard
                title="Pressure"
                value={weatherData?.pressure}
                unit="hPa"
                subtitle="BMP280 Barometric Sensor"
              />

              <WeatherCard
                title="Ambient Light"
                value={weatherData?.light}
                unit="lx"
                trend={atmosphere.lightTag}
                subtitle="BH1750 Light Intensity"
              />

              <WeatherCard
                title="UV Index"
                value={weatherData?.uvIndex !== undefined ? weatherData.uvIndex : 0}
                unit="UVI"
                trend={
                  (weatherData?.uvIndex || 0) < 3 ? 'LOW' :
                  (weatherData?.uvIndex || 0) < 6 ? 'MODERATE' :
                  (weatherData?.uvIndex || 0) < 8 ? 'HIGH' :
                  (weatherData?.uvIndex || 0) < 11 ? 'VERY HIGH' : 'EXTREME'
                }
                subtitle="GUVA-S12SD Solar Radiation"
              />
            </div>

            {/* Rain Status & V2 Intelligence */}
            <RainCard
              rainProbability={weatherData?.rainProbability || 0}
              rainStatus={weatherData?.rainStatus || 'DRY'}
            />

            {/* Power Monitor & System Health */}
            <PowerCard
              batteryVoltage={weatherData?.batteryVoltage}
              isUsbPower={weatherData?.isUsbPower}
              estimatedPowerW={weatherData?.estimatedPowerW}
              estimatedEnergyWh={weatherData?.estimatedEnergyWh}
              uptimeHours={weatherData?.uptimeHours}
            />

            {/* Sensor Trends */}
            <TrendCard
              pressureTrend={weatherData?.pressureTrend || 'STEADY'}
              temperatureTrend={weatherData?.temperatureTrend || 'STEADY'}
              humidityTrend={weatherData?.humidityTrend || 'STEADY'}
            />

            {/* Monthly Calendar View */}
            <MonthlyCalendar />

            {/* Split Recent Activity Stream */}
            <RecentActivities />

            {/* Historical Telemetry Table */}
            <HistoryCard
              historyData={historyData}
              summary={historySummary}
              selectedFilter={selectedFilter}
              onFilterChange={handleFilterChange}
            />

            {/* Footer with Copyright */}
            <footer className="dashboard-footer">
              <div className="footer-meta">
                <span className="footer-label">Last updated:</span>
                <span className="footer-timestamp">{lastUpdatedFormatted || 'Just now'}</span>
              </div>
              <div className="footer-copyright">
                G-Weather copyright 2026 Gnanastack Technologies. All Rights reserved.
              </div>
            </footer>
          </div>
        )}
      </main>
      <SdSyncModal
        isOpen={isSdSyncOpen}
        onClose={() => setIsSdSyncOpen(false)}
        onSyncSuccess={() => fetchTelemetry(filterDays)}
      />
    </div>
  );
}
