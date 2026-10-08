import React from 'react';

export default function RainCard({ rainProbability, rainStatus }) {
  const prob = rainProbability !== undefined && rainProbability !== null
    ? Math.min(100, Math.max(0, Math.round(Number(rainProbability))))
    : 0;

  return (
    <div className="weather-card rain-card">
      <div className="card-header">
        <span className="card-title">Rain Probability</span>
        <span className="card-subtitle-badge">Sensor-based estimate</span>
      </div>
      <div className="card-body">
        <div className="card-value-group">
          <span className="card-value">{prob}</span>
          <span className="card-unit">%</span>
        </div>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${prob}%` }}
          ></div>
        </div>

        <div className="rain-status-box">
          <span className="status-label">Rain Status</span>
          <span className="status-value">{rainStatus || 'CLEAR'}</span>
        </div>
      </div>
    </div>
  );
}
