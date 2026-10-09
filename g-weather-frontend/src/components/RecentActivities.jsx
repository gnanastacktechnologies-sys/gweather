import React, { useState, useEffect } from 'react';
import { getStationActivity } from '../services/weatherApi';
import { ActivityIcon, BoltIcon, DatabaseIcon } from './Icons';

export default function RecentActivities() {
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    try {
      const res = await getStationActivity();
      if (res && res.success) {
        setActivityData(res);
      }
    } catch (err) {
      console.error('Activity Feed Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return String(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return String(isoString);
    }
  };

  const connectionLogs = activityData?.activities?.connectionHistory || [];
  const telemetryLogs = activityData?.activities?.weatherReportLogs || [];

  return (
    <div className="card activities-card">
      <div className="card-header">
        <div className="header-left">
          <div className="icon-badge"><ActivityIcon className="card-svg icon-cyan" /></div>
          <h2 className="card-title">Live Station Activity Feeds</h2>
        </div>
        <span className="card-subtitle-badge">Dual Real-time Stream</span>
      </div>

      <div className="card-body">
        {loading ? (
          <div className="state-container loading-state">
            <div className="spinner"></div>
            <span>Fetching live feed streams...</span>
          </div>
        ) : (
          <div className="activities-split-grid">
            {/* Column 1: Hardware Uptime & Connection History */}
            <div className="activity-column">
              <div className="activity-col-header">
                <BoltIcon className="col-svg icon-amber" />
                <h3 className="activity-col-title">1. Connection & Hardware Uptime</h3>
              </div>

              <div className="activity-feed-list">
                {connectionLogs.length === 0 ? (
                  <div className="empty-feed">No connection events recorded yet.</div>
                ) : (
                  connectionLogs.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className="activity-header-line">
                        <span className="activity-title-text text-emerald">🟢 {item.title}</span>
                        <span className="activity-time-text">{formatTime(item.timestamp)}</span>
                      </div>
                      <div className="activity-desc-text">{item.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Weather Report Telemetry Feed */}
            <div className="activity-column">
              <div className="activity-col-header">
                <DatabaseIcon className="col-svg icon-cyan" />
                <h3 className="activity-col-title">2. Weather Telemetry Live Stream</h3>
              </div>

              <div className="activity-feed-list">
                {telemetryLogs.length === 0 ? (
                  <div className="empty-feed">Waiting for live weather packets...</div>
                ) : (
                  telemetryLogs.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className="activity-header-line">
                        <span className="activity-title-text text-cyan">📡 {item.title}</span>
                        <span className="activity-time-text">{formatTime(item.timestamp)}</span>
                      </div>
                      <div className="activity-desc-text">{item.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
