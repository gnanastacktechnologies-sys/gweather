import React from 'react';

export default function WeatherCard({ title, value, unit, trend, subtitle, icon }) {
  const getIcon = () => {
    if (icon) return icon;
    if (title.toLowerCase().includes('humidity')) return '💧';
    if (title.toLowerCase().includes('pressure')) return '📊';
    if (title.toLowerCase().includes('light')) return '☀️';
    return '🛰️';
  };

  return (
    <div className={`weather-card glass-card card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="card-header">
        <div className="card-header-left">
          <span className="card-metric-icon">{getIcon()}</span>
          <span className="card-title">{title}</span>
        </div>
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
