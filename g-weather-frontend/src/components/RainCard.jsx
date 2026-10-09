import React from 'react';

export default function RainCard({ rainProbability, rainStatus }) {
  const prob = rainProbability !== undefined && rainProbability !== null
    ? Math.min(100, Math.max(0, Math.round(Number(rainProbability))))
    : 0;

  const getRainStatusColor = (status) => {
    switch (status) {
      case 'RAINING': return 'status-glow-raining';
      case 'LIKELY': return 'status-glow-likely';
      case 'POSSIBLE': return 'status-glow-possible';
      case 'WATCH': return 'status-glow-watch';
      default: return 'status-glow-dry';
    }
  };

  const getRainIcon = (status) => {
    switch (status) {
      case 'RAINING': return '🌧️';
      case 'LIKELY': return '🌦️';
      case 'POSSIBLE': return '⛅';
      case 'WATCH': return '🌤️';
      default: return '☀️';
    }
  };

  return (
    <div className="weather-card glass-card rain-card">
      <div className="card-header">
        <div className="card-header-left">
          <span className="card-metric-icon">🌧️</span>
          <span className="card-title">Rain Probability & Status</span>
        </div>
        <span className="card-subtitle-badge">V2 Algorithm</span>
      </div>
      <div className="card-body">
        <div className="rain-hero-row">
          <div className="card-value-group">
            <span className="card-value">{prob}</span>
            <span className="card-unit">%</span>
          </div>
          <div className={`rain-status-pill ${getRainStatusColor(rainStatus)}`}>
            <span className="rain-status-icon">{getRainIcon(rainStatus)}</span>
            <span className="rain-status-text">{rainStatus || 'DRY'}</span>
          </div>
        </div>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill liquid-pulse"
            style={{ width: `${prob}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
