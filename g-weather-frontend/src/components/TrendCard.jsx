import React from 'react';

export default function TrendCard({ pressureTrend, temperatureTrend, humidityTrend }) {
  const formatTrend = (trendStr) => {
    if (!trendStr) return { text: 'STABLE', icon: '⟁', cls: 'steady' };
    const t = trendStr.toUpperCase();
    if (t.includes('RIS') || t.includes('UP')) return { text: 'RISING', icon: '▲', cls: 'rising' };
    if (t.includes('FALL') || t.includes('DOWN')) return { text: 'FALLING', icon: '▼', cls: 'falling' };
    return { text: 'STABLE', icon: '⟁', cls: 'steady' };
  };

  const press = formatTrend(pressureTrend);
  const temp = formatTrend(temperatureTrend);
  const hum = formatTrend(humidityTrend);

  return (
    <div className="weather-card glass-card trend-card">
      <div className="card-header">
        <div className="card-header-left">
          <span className="card-metric-icon">📉</span>
          <span className="card-title">1-Hour Atmospheric Trends</span>
        </div>
        <span className="card-subtitle-badge">Sliding Buffer</span>
      </div>
      <div className="card-body trend-list">
        <div className="trend-item">
          <div className="trend-info">
            <span className="trend-icon-sm">📊</span>
            <span className="trend-label">Barometric Pressure</span>
          </div>
          <span className={`trend-chip ${press.cls}`}>
            <span className="trend-symbol">{press.icon}</span>
            {press.text}
          </span>
        </div>

        <div className="trend-item">
          <div className="trend-info">
            <span className="trend-icon-sm">🌡️</span>
            <span className="trend-label">Temperature Vector</span>
          </div>
          <span className={`trend-chip ${temp.cls}`}>
            <span className="trend-symbol">{temp.icon}</span>
            {temp.text}
          </span>
        </div>

        <div className="trend-item">
          <div className="trend-info">
            <span className="trend-icon-sm">💧</span>
            <span className="trend-label">Relative Humidity</span>
          </div>
          <span className={`trend-chip ${hum.cls}`}>
            <span className="trend-symbol">{hum.icon}</span>
            {hum.text}
          </span>
        </div>
      </div>
    </div>
  );
}
