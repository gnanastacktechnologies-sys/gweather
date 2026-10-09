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

  // Function to format timestamp safely
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

  // Main polling function
  const fetchTelemetry = async (days = filterDays) => {
    // 1. Check Backend Health
    const healthy = await getHealth();
    setIsOnline(healthy);

    if (!healthy) {
      setError('Unable to connect to G-WEATHER API');
      setLoading(false);
      return;
    }

    // 2. Fetch Latest Telemetry
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

    // 3. Fetch History Telemetry & Daily Stats
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
            <p className="state-message">Please check if the Express backend is running on port 17205.</p>
            <button className="retry-btn" onClick={() => fetchTelemetry(filterDays)}>Retry Connection</button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {/* Primary Hero Card: Temperature */}
            <div className="hero-card">
              <div className="hero-header">
                <span className="hero-title">Temperature</span>
                <span className="hero-badge">DHT22</span>
              </div>
              <div className="hero-body">
                <span className="hero-value">{weatherData?.temperature !== undefined ? weatherData.temperature : '--'}</span>
                <span className="hero-unit">°C</span>
              </div>
            </div>

            {/* Weather Metrics Grid */}
            <div className="metrics-grid">
              <WeatherCard
                title="Humidity"
                value={weatherData?.humidity}
                unit="%"
                subtitle="Relative Humidity"
              />

              <WeatherCard
                title="Pressure"
                value={weatherData?.pressure}
                unit="hPa"
                subtitle="Barometric Pressure"
              />

              <WeatherCard
                title="Light"
                value={weatherData?.light}
                unit="lx"
                subtitle="BH1750 Ambient Light"
              />
            </div>

            {/* Rain Probability & Status Card */}
            <RainCard
              rainProbability={weatherData?.rainProbability || 0}
              rainStatus={weatherData?.rainStatus || 'DRY'}
            />

            {/* Power & Hardware Efficiency Card */}
            <PowerCard
              batteryVoltage={weatherData?.batteryVoltage}
              isUsbPower={weatherData?.isUsbPower}
              estimatedPowerW={weatherData?.estimatedPowerW}
              estimatedEnergyWh={weatherData?.estimatedEnergyWh}
              uptimeHours={weatherData?.uptimeHours}
            />

            {/* Trends Card */}
            <TrendCard
              pressureTrend={weatherData?.pressureTrend || 'STEADY'}
              temperatureTrend={weatherData?.temperatureTrend || 'STEADY'}
              humidityTrend={weatherData?.humidityTrend || 'STEADY'}
            />

            {/* G-WEATHER Monthly Calendar View */}
            <MonthlyCalendar />

            {/* Split Recent Activities (1. Hardware Connection & Uptime, 2. Weather Report Telemetry) */}
            <RecentActivities />

            {/* Periodic Telemetry & Daily History Table */}
            <HistoryCard
              historyData={historyData}
              summary={historySummary}
              selectedFilter={selectedFilter}
              onFilterChange={handleFilterChange}
            />

            {/* Footer / Last Updated */}
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
