import React from 'react';

export default function HistoryCard({ historyData, summary, selectedFilter, onFilterChange }) {
  const formatTime = (ts) => {
    if (!ts) return '--';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return String(ts);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '--';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="weather-card glass-card history-card">
      <div className="history-header">
        <div className="card-header-left">
          <span className="card-metric-icon">📑</span>
          <div>
            <h3 className="card-title">Periodic Telemetry Logs & History</h3>
            <span className="card-subtitle">Real-Time Sensor Record Stream</span>
          </div>
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all', 0)}
          >
            All Logs
          </button>
          <button
            className={`filter-btn ${selectedFilter === '1day' ? 'active' : ''}`}
            onClick={() => onFilterChange('1day', 1)}
          >
            Past 24h
          </button>
          <button
            className={`filter-btn ${selectedFilter === '7days' ? 'active' : ''}`}
            onClick={() => onFilterChange('7days', 7)}
          >
            Past 7 Days
          </button>
        </div>
      </div>

      {/* Daily Summary Banner */}
      {summary && summary.totalReadings > 0 && (
        <div className="summary-banner">
          <div className="summary-stat">
            <span className="summary-label">Total Readings</span>
            <span className="summary-val">{summary.totalReadings}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-label">Min / Max Temp</span>
            <span className="summary-val highlight-temp">{summary.minTemp}°C / {summary.maxTemp}°C</span>
          </div>
          <div className="summary-stat">
            <span className="summary-label">Avg Temp</span>
            <span className="summary-val">{summary.avgTemp}°C</span>
          </div>
          <div className="summary-stat">
            <span className="summary-label">Humidity Range</span>
            <span className="summary-val">{summary.minHumidity}% - {summary.maxHumidity}%</span>
          </div>
        </div>
      )}

      {/* History Log Table */}
      <div className="table-responsive">
        <table className="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Date</th>
              <th>Temp</th>
              <th>Humidity</th>
              <th>Pressure</th>
              <th>Light</th>
              <th>Rain Prob</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(!historyData || historyData.length === 0) ? (
              <tr>
                <td colSpan="8" className="no-history">No periodic history logs recorded yet.</td>
              </tr>
            ) : (
              historyData.map((row, idx) => (
                <tr key={idx} className="table-row-hover">
                  <td className="time-col">{formatTime(row.receivedAt || row.timestamp)}</td>
                  <td className="date-col">{formatDate(row.receivedAt || row.timestamp)}</td>
                  <td className="bold temp-val">{row.temperature}°C</td>
                  <td>{row.humidity}%</td>
                  <td>{row.pressure} hPa</td>
                  <td>{row.light} lx</td>
                  <td>{row.rainProbability}%</td>
                  <td>
                    <span className={`status-pill ${(row.rainStatus || 'DRY').toLowerCase()}`}>
                      {row.rainStatus || 'DRY'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
