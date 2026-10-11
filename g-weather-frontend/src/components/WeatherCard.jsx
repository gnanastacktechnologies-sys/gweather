import React from 'react';
import { TempIcon, HumidityIcon, PressureIcon, SunIcon } from './Icons';

export default function WeatherCard({ title, value, unit, trend, subtitle }) {
  const renderIcon = () => {
    const t = title.toLowerCase();
    if (t.includes('humidity')) return <HumidityIcon className="card-svg icon-cyan" />;
    if (t.includes('pressure')) return <PressureIcon className="card-svg icon-amber" />;
    if (t.includes('light')) return <SunIcon className="card-svg icon-gold" />;
    if (t.includes('uv')) return <SunIcon className="card-svg icon-purple" />;
    return <TempIcon className="card-svg icon-emerald" />;
  };

  const getUvBadgeClass = (val) => {
    const n = Number(val) || 0;
    if (n < 3.0) return 'tag-dry';
    if (n < 6.0) return 'tag-watch';
    if (n < 8.0) return 'tag-likely';
    return 'tag-raining';
  };

  return (
    <div className={`weather-card glass-card card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="card-header">
        <div className="card-header-left">
          <div className="icon-badge">{renderIcon()}</div>
          <span className="card-title">{title}</span>
        </div>
        {trend && (
          <span className={`card-trend-badge ${title.toLowerCase().includes('uv') ? `table-status-tag ${getUvBadgeClass(value)}` : ''}`}>
            {trend}
          </span>
        )}
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
