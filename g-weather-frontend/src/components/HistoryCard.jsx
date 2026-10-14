import React from 'react';
import { DatabaseIcon } from './Icons';

export default function HistoryCard({ historyData, summary, selectedFilter, onFilterChange }) {
  const formatTime = (ts) => {
    if (!ts) return '--';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return String(ts);
    }
  };

  // Render telemetry logs cleanly:
  // 1. Live stream records: Display every 1-minute live reading.
  // 2. SD Event records: Display every urgent anomaly event.
  // 3. SD 5-Minute Averages: For entries within the same 5-minute window (e.g. 12:00 to 12:05)
  //    or sharing identical timestamps, take the LAST entry time and show it on the website!
  // Ensure entries are strictly sorted newest to oldest so the first record
  // in any 5-minute interval is guaranteed to be the LATEST / LAST entry!
  const sortedHistory = [...historyData].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.receivedAt || 0).getTime();
    const timeB = new Date(b.timestamp || b.receivedAt || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    const recvA = new Date(a.receivedAt || 0).getTime();
    const recvB = new Date(b.receivedAt || 0).getTime();
    if (recvB !== recvA) return recvB - recvA;
    return String(b._id || '').localeCompare(String(a._id || ''), undefined, { numeric: true });
  });

  const uniqueHistory = [];
  const seenKeys = new Set();

  for (const row of sortedHistory) {
    const isLive = !row.source || row.source === 'live';
    const isEvent = row.source === 'sd_event';

    if (isLive || isEvent) {
      const recordKey = row._id || `${row.deviceId || 'dev'}_${row.timestamp || row.receivedAt}`;
      if (!seenKeys.has(recordKey)) {
        seenKeys.add(recordKey);
        uniqueHistory.push(row);
      }
    } else {
      // SD Average record: Group by 5-minute rolling window or identical formatted minute.
      // Since historyData is sorted newest-first, the first row encountered is the LAST ENTRY TIME!
      const ts = new Date(row.timestamp || row.receivedAt);
      let windowKey;
      if (!isNaN(ts.getTime())) {
        const fiveMinBucket = Math.floor(ts.getTime() / 300000);
        windowKey = `sd_5m_${row.deviceId || 'dev'}_${fiveMinBucket}`;
      } else {
        windowKey = `sd_str_${row.deviceId || 'dev'}_${formatTime(row.timestamp || row.receivedAt)}`;
      }

      if (!seenKeys.has(windowKey)) {
        seenKeys.add(windowKey);
        uniqueHistory.push(row);
      }
    }
  }

  return (
    <div className="card history-card">
      <div className="card-header">
        <div className="header-left">
          <div className="icon-badge"><DatabaseIcon className="card-svg icon-cyan" /></div>
          <h2 className="card-title">Telemetry Telecommunications Log</h2>
        </div>

        <div className="history-controls">
          <button
            className={`filter-btn ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => onFilterChange('all', 0)}
          >
            All Logs
          </button>
          <button
            className={`filter-btn ${selectedFilter === 'today' ? 'active' : ''}`}
            onClick={() => onFilterChange('today', 1)}
          >
            Today
          </button>
          <button
            className={`filter-btn ${selectedFilter === '3days' ? 'active' : ''}`}
            onClick={() => onFilterChange('3days', 3)}
          >
            Last 3 Days
          </button>
          <button
            className={`filter-btn ${selectedFilter === '7days' ? 'active' : ''}`}
            onClick={() => onFilterChange('7days', 7)}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="table-responsive">
          <table className="history-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Source</th>
                <th>Device</th>
                <th>Temp (°C)</th>
                <th>Humidity (%)</th>
                <th>Pressure (hPa)</th>
                <th>Light (lx)</th>
                <th>UV (UVI)</th>
                <th>Rain Chance</th>
                <th>Status</th>
                <th>Supply</th>
              </tr>
            </thead>
            <tbody>
              {uniqueHistory.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No historical telemetry records found.
                  </td>
                </tr>
              ) : (
                uniqueHistory.map((row, idx) => {
                  const isSdAvg = row.source === 'sd_average' || row.source === 'sd_card';
                  const isSdEvent = row.source === 'sd_event';
                  return (
                    <tr key={row._id || idx}>
                      <td>{formatTime(row.timestamp || row.receivedAt)}</td>
                      <td>
                        {isSdEvent ? (
                          <span className="source-tag tag-sd-event" title="Event-driven rapid storm/rain log from MicroSD">🚨 SD EVENT</span>
                        ) : isSdAvg ? (
                          <span className="source-tag tag-sd-avg" title="5-Minute Rolling Mathematical Mean from MicroSD">💾 SD AVG (5m)</span>
                        ) : (
                          <span className="source-tag tag-live" title="1-Minute Live Wireless Hotspot Telemetry">⚡ LIVE (1m)</span>
                        )}
                      </td>
                      <td>{row.deviceId || 'GWEATHER-001'}</td>
                      <td><strong>{row.temperature}°C</strong></td>
                      <td>{row.humidity}%</td>
                      <td>{row.pressure} hPa</td>
                      <td>{row.light} lx</td>
                      <td>{row.uvIndex !== undefined ? row.uvIndex : 0}</td>
                      <td>{row.rainProbability}%</td>
                      <td>
                        <span className={`table-status-tag tag-${(row.rainStatus || 'dry').toLowerCase()}`}>
                          {row.rainStatus || 'DRY'}
                        </span>
                      </td>
                      <td>
                        {row.batteryVoltage >= 4.5 ? `${row.batteryVoltage.toFixed(2)}V ☀️` : (row.batteryVoltage > 0 ? `${row.batteryVoltage.toFixed(2)}V` : 'USB')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
