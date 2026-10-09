import React from 'react';
import { ActivityIcon, TrendingUpIcon, TrendingDownIcon } from './Icons';

export default function TrendCard({ pressureTrend, temperatureTrend, humidityTrend }) {
  const renderTrendIcon = (trend) => {
    const t = String(trend).toUpperCase();
    if (t === 'RISING') return <TrendingUpIcon className="trend-svg icon-emerald" />;
    if (t === 'FALLING') return <TrendingDownIcon className="trend-svg icon-rose" />;
    return <ActivityIcon className="trend-svg icon-sub" />;
  };

  const getTrendClass = (trend) => {
    const t = String(trend).toUpperCase();
    if (t === 'RISING') return 'trend-rising';
    if (t === 'FALLING') return 'trend-falling';
    return 'trend-steady';
  };

  return (
    <div className="card trend-card">
      <div className="card-header">
        <div className="header-left">
          <div className="icon-badge"><ActivityIcon className="card-svg icon-purple" /></div>
          <h2 className="card-title">1-Hour Sensor Trend Indicators</h2>
        </div>
        <span className="card-subtitle-badge">Sliding Buffer</span>
      </div>

      <div className="card-body">
        <div className="trends-grid">
          <div className="trend-box">
            <div className="trend-box-title">Pressure</div>
            <div className={`trend-pill ${getTrendClass(pressureTrend)}`}>
              {renderTrendIcon(pressureTrend)}
              <span>{pressureTrend || 'STEADY'}</span>
            </div>
          </div>

          <div className="trend-box">
            <div className="trend-box-title">Temperature</div>
            <div className={`trend-pill ${getTrendClass(temperatureTrend)}`}>
              {renderTrendIcon(temperatureTrend)}
              <span>{temperatureTrend || 'STEADY'}</span>
            </div>
          </div>

          <div className="trend-box">
            <div className="trend-box-title">Humidity</div>
            <div className={`trend-pill ${getTrendClass(humidityTrend)}`}>
              {renderTrendIcon(humidityTrend)}
              <span>{humidityTrend || 'STEADY'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
