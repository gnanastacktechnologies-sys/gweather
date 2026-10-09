import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';

export default function Header({ isOnline, deviceId }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="app-header glass-header">
      <div className="header-brand">
        <div className="logo-glow-wrapper">
          <img src="/logo.jpg" alt="G-WEATHER Logo" className="brand-logo" />
        </div>
        <div className="brand-text">
          <div className="brand-title-row">
            <h1 className="brand-title">G-WEATHER</h1>
            <span className="version-chip">V3.2 + STAGE 6</span>
          </div>
          <span className="brand-subtitle">Smart Village Weather Telemetry Station</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="clock-chip" title="Local System Time">
          <span className="clock-icon">🕒</span>
          <span className="clock-time">{timeStr}</span>
        </div>

        {deviceId && (
          <div className="device-chip">
            <span className="chip-icon">⚡</span>
            <span className="chip-text">{deviceId}</span>
          </div>
        )}

        <StatusBadge isOnline={isOnline} />
      </div>
    </header>
  );
}
