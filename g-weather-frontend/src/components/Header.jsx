import React from 'react';
import StatusBadge from './StatusBadge';

export default function Header({ isOnline, deviceId }) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <h1 className="brand-title">G-WEATHER</h1>
        <span className="brand-subtitle">Village Edition</span>
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
