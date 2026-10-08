import React from 'react';
import StatusBadge from './StatusBadge';

export default function Header({ isOnline, deviceId }) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <img src="/logo.jpg" alt="G-WEATHER Logo" className="brand-logo" />
        <div className="brand-text">
          <h1 className="brand-title">G-WEATHER</h1>
          <span className="brand-subtitle">Village Edition</span>
        </div>
      </div>
      <div className="header-meta">
        {deviceId && (
          <div className="device-info">
            <span className="device-label">Device</span>
            <span className="device-value">{deviceId}</span>
          </div>
        )}
        <StatusBadge isOnline={isOnline} />
      </div>
    </header>
  );
}
