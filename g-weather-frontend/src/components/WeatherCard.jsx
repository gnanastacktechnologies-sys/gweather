import React from 'react';

export default function WeatherCard({ title, value, unit, trend, subtitle }) {
  return (
    <div className="weather-card">
      <div className="card-header">
        <span className="card-title">{title}</span>
        {trend && <span className="card-trend-badge">{trend}</span>}
      </div>
      <div className="card-body">
        <div className="card-value-group">
          <span className="card-value">{value !== undefined && value !== null ? value : '--'}</span>
          {unit && <span className="card-unit">{unit}</span>}
        </div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
