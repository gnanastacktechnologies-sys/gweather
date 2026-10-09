import React from 'react';
import { RainIcon, CloudRainIcon, SunIcon } from './Icons';

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

  const renderStatusIcon = (status) => {
    switch (status) {
      case 'RAINING': return <CloudRainIcon className="pill-svg icon-rose" />;
      case 'LIKELY': return <CloudRainIcon className="pill-svg icon-cyan" />;
      case 'POSSIBLE': return <RainIcon className="pill-svg icon-purple" />;
      case 'WATCH': return <SunIcon className="pill-svg icon-amber" />;
      default: return <SunIcon className="pill-svg icon-emerald" />;
    }
  };

  return (
    <div className="weather-card glass-card rain-card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="icon-badge"><RainIcon className="card-svg icon-cyan" /></div>
          <span className="card-title">Rain Probability & Weather Classification</span>
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
            {renderStatusIcon(rainStatus)}
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
