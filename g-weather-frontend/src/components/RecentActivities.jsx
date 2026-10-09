import React, { useState, useEffect } from 'react';
import { getStationActivity } from '../services/weatherApi';

export default function RecentActivities() {
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const data = await getStationActivity();
      setActivityData(data);
    } catch (err) {
      console.error('Activities Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 10000);
    return () => clearInterval(interval);
  }, []);

  const station = activityData?.station;
  const connectionHistory = activityData?.activities?.connectionHistory || [];
  const weatherReportLogs = activityData?.activities?.weatherReportLogs || [];

  const formatTimestamp = (rawTs) => {
    if (!rawTs) return 'N/A';
    try {
      const d = new Date(rawTs);
      if (isNaN(d.getTime())) return String(rawTs);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
             ' (' + d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
    } catch (e) {
      return String(rawTs);
    }
  };

  const calculateRelativeTime = (rawTs) => {
    if (!rawTs) return 'Unknown';
    try {
      const d = new Date(rawTs);
      const now = new Date();
      const diffSec = Math.max(0, Math.floor((now - d) / 1000));
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      return `${Math.floor(diffSec / 3600)}h ago`;
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <div className="recent-activities-wrapper">
      {/* SECTION 1: WEATHER STATION HARDWARE & CONNECTION ACTIVITY */}
      <div className="card activity-card station-hardware-card">
        <div className="card-header">
          <div className="header-left">
            <span className="card-icon">📡</span>
            <h2 className="card-title">1. Weather Station Connection & Uptime</h2>
          </div>

          <div className="station-status-pill">
            <span className={`status-indicator ${station?.status === 'ONLINE' ? 'indicator-online' : 'indicator-offline'}`}></span>
            <span className="status-label">{station?.status || 'OFFLINE'}</span>
          </div>
        </div>

        <div className="card-body">
          {/* Hardware Session Info Bar */}
          <div className="hardware-info-grid">
            <div className="hw-info-box">
              <span className="hw-info-label">Device ID</span>
              <span className="hw-info-value">{station?.deviceId || 'GWEATHER-001'}</span>
            </div>

            <div className="hw-info-box">
              <span className="hw-info-label">Active Session Uptime</span>
              <span className="hw-info-value highlight-val">
                {station?.uptimeHours !== undefined ? `${station.uptimeHours} hrs` : '--'}
              </span>
            </div>

            <div className="hw-info-box">
              <span className="hw-info-label">Session Came Online</span>
              <span className="hw-info-value">
                {station?.currentSessionStart ? formatTimestamp(station.currentSessionStart) : 'Recently'}
              </span>
            </div>

            <div className="hw-info-box">
              <span className="hw-info-label">Last Heartbeat Signal</span>
              <span className="hw-info-value">
                {station?.lastSeenAt ? `${calculateRelativeTime(station.lastSeenAt)}` : 'Waiting'}
              </span>
            </div>
          </div>

          {/* Connection Log Timeline */}
          <div className="activity-timeline-section">
            <h4 className="timeline-subtitle">Hardware Connection & Uptime Logs</h4>
            <div className="activity-stream">
              {connectionHistory.length === 0 ? (
                <div className="stream-empty">No hardware connection logs recorded yet.</div>
              ) : (
                connectionHistory.map((item) => (
                  <div key={item.id} className="stream-item connection-item">
                    <div className="stream-badge connection-badge">📶</div>
                    <div className="stream-content">
                      <div className="stream-header">
                        <span className="stream-title">{item.title}</span>
                        <span className="stream-time">{formatTimestamp(item.timestamp)}</span>
                      </div>
                      <p className="stream-desc">{item.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: WEATHER REPORT ACTIVITY (TELEMETRY LOGS) */}
      <div className="card activity-card weather-report-card">
        <div className="card-header">
          <div className="header-left">
            <span className="card-icon">⚡</span>
            <h2 className="card-title">2. Weather Report Live Updates</h2>
          </div>
          <div className="last-sync-badge">
            Last Telemetry Sync: {station?.lastSeenAt ? calculateRelativeTime(station.lastSeenAt) : 'Never'}
          </div>
        </div>

        <div className="card-body">
          <div className="activity-timeline-section">
            <h4 className="timeline-subtitle">Recent Weather Telemetry Stream</h4>
            <div className="activity-stream">
              {weatherReportLogs.length === 0 ? (
                <div className="stream-empty">Waiting for live weather telemetry from station...</div>
              ) : (
                weatherReportLogs.map((item) => (
                  <div key={item.id} className="stream-item telemetry-item">
                    <div className="stream-badge telemetry-badge">📊</div>
                    <div className="stream-content">
                      <div className="stream-header">
                        <span className="stream-title">{item.title}</span>
                        <span className="stream-time">{formatTimestamp(item.timestamp)}</span>
                      </div>
                      <p className="stream-desc">{item.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
