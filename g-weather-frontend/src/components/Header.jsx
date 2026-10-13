import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import { ClockIcon, BoltIcon, SdCardIcon, MenuIcon } from './Icons';

export default function Header({
  isOnline,
  deviceId,
  onOpenSdSync,
  dayPhase,
  dayPhaseIcon,
  onToggleSidebar,
  isSidebarOpen
}) {
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
    <header className="app-header glass-header fixed-topbar">
      <div className="header-left-group">
        <button
          className={`sidebar-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="Toggle Navigation Sidebar (6 Engines)"
          aria-label="Toggle Navigation Sidebar"
        >
          <MenuIcon className="menu-svg text-cyan" />
          <span className="menu-btn-text">MENU</span>
        </button>

        <div className="header-brand">
          <div className="logo-glow-wrapper">
            <img src="/logo.jpg" alt="G-WEATHER Logo" className="brand-logo" />
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <h1 className="brand-title">G-WEATHER</h1>
              <span className="version-chip">V3.2 ULTIMATE</span>
            </div>
            <span className="brand-subtitle">Smart Village Weather Telemetry Station</span>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button
          className="sd-sync-btn"
          onClick={onOpenSdSync}
          title="Upload or sync weather_log.csv from MicroSD Card"
        >
          <SdCardIcon className="chip-svg text-cyan" />
          <span>SD SYNC</span>
        </button>

        <div className="clock-chip" title="System Local Time">
          <ClockIcon className="chip-svg" />
          <span className="clock-time">{timeStr}</span>
        </div>

        {dayPhase && (
          <div className="phase-chip" title={`Current Day Phase: ${dayPhase}`}>
            <span className="phase-emoji">{dayPhaseIcon || '🌙'}</span>
            <span className="phase-name">{dayPhase}</span>
          </div>
        )}

        {deviceId && (
          <div className="device-chip">
            <BoltIcon className="chip-svg text-amber" />
            <span className="chip-text">{deviceId}</span>
          </div>
        )}

        <StatusBadge isOnline={isOnline} />
      </div>
    </header>
  );
}
