import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import WeatherCard from './components/WeatherCard';
import RainCard from './components/RainCard';
import TrendCard from './components/TrendCard';
import PowerCard from './components/PowerCard';
import MonthlyCalendar from './components/MonthlyCalendar';
import RecentActivities from './components/RecentActivities';
import HistoryCard from './components/HistoryCard';
import { getHealth, getLatestWeather, getWeatherHistory } from './services/weatherApi';

export default function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [filterDays, setFilterDays] = useState(0);

  const [isOnline, setIsOnline] = useState(false);
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

  const getRainIcon = (status) => {
    switch (status) {
      case 'RAINING': return '🌧️';
      case 'LIKELY': return '🌦️';
      case 'POSSIBLE': return '⛅';
      case 'WATCH': return '🌤️';
      default: return '☀️';
    }
  };

  return (
    <div className="app-container">
      <Header isOnline={isOnline} deviceId={weatherData?.deviceId} />

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
                </div>

                <div className={`hero-status-pill ${getRainStatusClass(weatherData?.rainStatus)}`}>
                  <span>{getRainIcon(weatherData?.rainStatus)}</span>
                  <span>{weatherData?.rainStatus || 'DRY'}</span>
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
                subtitle="BH1750 Light Intensity"
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
    </div>
  );
}
