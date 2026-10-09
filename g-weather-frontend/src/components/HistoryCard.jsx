import React from 'react';
import { DatabaseIcon } from './Icons';

export default function HistoryCard({ historyData, summary, selectedFilter, onFilterChange }) {
  const formatTime = (ts) => {
    if (!ts) return '--';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(ts);
    }
  };

  return (
    <div className="card history-card">
      <div className="card-header">
        <div className="header-left">
          <div className="icon-badge"><DatabaseIcon className="card-svg icon-cyan" /></div>
          <h2 className="card-title">Telemetry Telecommunications Log</h2>
        </div>

        <div className="history-controls">
          <button
            className={`filter-btn ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all', 0)}
          >
            All Logs
          </button>
          <button
            className={`filter-btn ${selectedFilter === 'today' ? 'active' : ''}`}
            onClick={() => onFilterChange('today', 1)}
          >
            Today
          </button>
          <button
            className={`filter-btn ${selectedFilter === '3days' ? 'active' : ''}`}
            onClick={() => onFilterChange('3days', 3)}
          >
            Last 3 Days
          </button>
          <button
            className={`filter-btn ${selectedFilter === '7days' ? 'active' : ''}`}
            onClick={() => onFilterChange('7days', 7)}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="table-responsive">
          <table className="history-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Device</th>
                <th>Temp (°C)</th>
                <th>Humidity (%)</th>
                <th>Pressure (hPa)</th>
                <th>Light (lx)</th>
                <th>Rain Chance</th>
                <th>Status</th>
                <th>Supply</th>
              </tr>
            </thead>
            <tbody>
              {historyData.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No historical telemetry records found.
                  </td>
                </tr>
              ) : (
                historyData.map((row, idx) => (
                  <tr key={row._id || idx}>
                    <td>{formatTime(row.receivedAt || row.timestamp)}</td>
                    <td>{row.deviceId || 'GWEATHER-001'}</td>
                    <td><strong>{row.temperature}°C</strong></td>
                    <td>{row.humidity}%</td>
                    <td>{row.pressure} hPa</td>
                    <td>{row.light} lx</td>
                    <td>{row.rainProbability}%</td>
                    <td>
                      <span className={`table-status-tag tag-${(row.rainStatus || 'dry').toLowerCase()}`}>
                        {row.rainStatus || 'DRY'}
                      </span>
                    </td>
                    <td>{row.batteryVoltage ? `${row.batteryVoltage.toFixed(2)}V` : 'USB'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
