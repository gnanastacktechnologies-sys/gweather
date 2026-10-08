import React from 'react';

export default function TrendCard({ pressureTrend, temperatureTrend, humidityTrend }) {
  const formatTrend = (trendStr) => {
    if (!trendStr) return { text: 'STEADY', icon: '➔' };
    const t = trendStr.toUpperCase();
    if (t.includes('RIS') || t.includes('UP')) return { text: 'RISING', icon: '▲' };
    if (t.includes('FALL') || t.includes('DOWN')) return { text: 'FALLING', icon: '▼' };
    return { text: 'STEADY', icon: '➔' };
  };

  const press = formatTrend(pressureTrend);
  const temp = formatTrend(temperatureTrend);
  const hum = formatTrend(humidityTrend);

  return (
    <div className="weather-card trend-card">
      <div className="card-header">
        <span className="card-title">Atmospheric Trends</span>
      </div>
      <div className="card-body trend-list">
        <div className="trend-item">
          <span className="trend-label">Pressure Trend</span>
          <span className={`trend-value ${press.text.toLowerCase()}`}>
            <span className="trend-icon">{press.icon}</span>
            {press.text}
          </span>
        </div>

        <div className="trend-item">
          <span className="trend-label">Temperature Trend</span>
          <span className={`trend-value ${temp.text.toLowerCase()}`}>
            <span className="trend-icon">{temp.icon}</span>
            {temp.text}
          </span>
        </div>

        <div className="trend-item">
          <span className="trend-label">Humidity Trend</span>
          <span className={`trend-value ${hum.text.toLowerCase()}`}>
            <span className="trend-icon">{hum.icon}</span>
            {hum.text}
          </span>
        </div>
      </div>
    </div>
  );
}
