import React, { useEffect } from 'react';
import {
  CloseIcon,
  SunIcon,
  BoltIcon,
  TrendingUpIcon,
  CalendarIcon,
  ActivityIcon,
  LogIcon,
  SdCardIcon
} from './Icons';

export default function Sidebar({
  isOpen,
  onClose,
  activeSection,
  onNavigate,
  weatherData,
  onOpenSdSync
}) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navItems = [
    {
      id: 'today-status',
      num: '1',
      title: 'Today Status',
      subtitle: 'Atmosphere, DHT22 & Rain',
      icon: <SunIcon className="nav-svg text-cyan" />,
      badge: 'Live',
      badgeClass: 'badge-cyan'
    },
    {
      id: 'power-engine',
      num: '2',
      title: 'Power & Hardware efficiency engine',
      subtitle: 'Watts, Wh, Voltage & Battery',
      icon: <BoltIcon className="nav-svg text-amber" />,
      badge: 'Power',
      badgeClass: 'badge-amber'
    },
    {
      id: 'hour-trend',
      num: '3',
      title: 'Hour trend',
      subtitle: 'Barometric & Thermo Trends',
      icon: <TrendingUpIcon className="nav-svg text-emerald" />,
      badge: 'Trends',
      badgeClass: 'badge-emerald'
    },
    {
      id: 'weather-calendar',
      num: '4',
      title: 'Weather calander',
      subtitle: 'Monthly Agro-Climate Matrix',
      icon: <CalendarIcon className="nav-svg text-purple" />,
      badge: 'Archive',
      badgeClass: 'badge-purple'
    },
    {
      id: 'live-activity',
      num: '5',
      title: 'Live station activity',
      subtitle: 'Dual Connection & Telemetry Stream',
      icon: <ActivityIcon className="nav-svg text-cyan" />,
      badge: 'Stream',
      badgeClass: 'badge-cyan'
    },
    {
      id: 'telemetry-log',
      num: '6',
      title: 'Log',
      subtitle: 'Audit Table, Filters & CSV Export',
      icon: <LogIcon className="nav-svg text-emerald" />,
      badge: 'Records',
      badgeClass: 'badge-emerald'
    }
  ];

  const handleItemClick = (id) => {
    onNavigate(id);
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Off-canvas Navigation Drawer */}
      <aside
        className={`sidebar-drawer ${isOpen ? 'open' : ''}`}
        aria-label="Navigation Sidebar"
        aria-hidden={!isOpen}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand-group">
            <div className="sidebar-logo-glow">
              <img src="/logo.jpg" alt="Logo" className="sidebar-logo-img" />
            </div>
            <div>
              <div className="sidebar-brand-title">G-WEATHER</div>
              <div className="sidebar-brand-sub">Navigation & Engines</div>
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            title="Close navigation"
            aria-label="Close navigation"
          >
            <CloseIcon className="close-svg" />
          </button>
        </div>

        {/* Quick Station Health Capsule */}
        <div className="sidebar-station-pill">
          <div className="pill-metric">
            <span className="pill-lbl">STATION</span>
            <span className="pill-val text-cyan">{weatherData?.deviceId || 'GWEATHER-001'}</span>
          </div>
          <div className="pill-divider"></div>
          <div className="pill-metric">
            <span className="pill-lbl">TEMP</span>
            <span className="pill-val text-amber">
              {weatherData?.temperature !== undefined ? `${weatherData.temperature}°C` : '--'}
            </span>
          </div>
          <div className="pill-divider"></div>
          <div className="pill-metric">
            <span className="pill-lbl">RAIN</span>
            <span className="pill-val text-emerald">{weatherData?.rainStatus || 'DRY'}</span>
          </div>
        </div>

        {/* Section Navigation List */}
        <nav className="sidebar-nav-list">
          <div className="sidebar-nav-title">STATION SECTIONS</div>
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item.id)}
              >
                <div className="nav-item-num">{item.num}</div>
                <div className="nav-item-icon-wrap">{item.icon}</div>
                <div className="nav-item-content">
                  <div className="nav-item-title">{item.title}</div>
                  <div className="nav-item-sub">{item.subtitle}</div>
                </div>
                <span className={`nav-item-chip ${item.badgeClass}`}>{item.badge}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Quick Action */}
        <div className="sidebar-footer">
          <button
            className="sidebar-sync-action-btn"
            onClick={() => {
              onClose();
              if (onOpenSdSync) onOpenSdSync();
            }}
          >
            <SdCardIcon className="sync-svg text-cyan" />
            <span>Open MicroSD Sync Engine</span>
          </button>
          <div className="sidebar-footer-text">
            Village Meteorological Station V3.2
          </div>
        </div>
      </aside>
    </>
  );
}
