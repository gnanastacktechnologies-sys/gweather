import React, { useState } from 'react';
import { SdCardIcon, UploadIcon, RefreshIcon, DatabaseIcon } from './Icons';
import { uploadWeatherBatch } from '../services/weatherApi';

export default function SdSyncModal({ isOpen, onClose, onSyncSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResult, setSyncResult] = useState(null);
  const [parseError, setParseError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processCsvFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCsvFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const processCsvFile = (csvFile) => {
    setFile(csvFile);
    setParseError(null);
    setSyncResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

        if (lines.length < 2) {
          setParseError('The selected CSV file appears to be empty or has no data rows.');
          return;
        }

        const headerLine = lines[0].toLowerCase();
        const headers = headerLine.split(',').map(h => h.trim());

        // Map column indices
        const tsIdx = headers.findIndex(h => h.includes('time') || h.includes('date'));
        const tempIdx = headers.findIndex(h => h.includes('temp'));
        const humIdx = headers.findIndex(h => h.includes('hum'));
        const pressIdx = headers.findIndex(h => h.includes('press'));
        const luxIdx = headers.findIndex(h => h.includes('lux') || h.includes('light'));
        const uvIdx = headers.findIndex(h => h.includes('uv'));
        const rainProbIdx = headers.findIndex(h => h.includes('prob'));
        const rainStatIdx = headers.findIndex(h => h.includes('rain_stat') || (h.includes('status') && !h.includes('wifi')));
        const wifiIdx = headers.findIndex(h => h.includes('wifi'));

        const records = [];
        let offlineCount = 0;
        let temps = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < 3) continue;

          const rawTemp = parseFloat(tempIdx >= 0 ? cols[tempIdx] : cols[1]);
          const rawHum = parseFloat(humIdx >= 0 ? cols[humIdx] : cols[2]);
          const rawPress = parseFloat(pressIdx >= 0 ? cols[pressIdx] : cols[3]);

          if (isNaN(rawTemp) || isNaN(rawHum) || isNaN(rawPress)) continue;

          temps.push(rawTemp);

          const rawTs = tsIdx >= 0 ? cols[tsIdx] : cols[0];
          const rawLux = luxIdx >= 0 && cols[luxIdx] ? parseFloat(cols[luxIdx]) : 0;
          const rawUv = uvIdx >= 0 && cols[uvIdx] ? parseFloat(cols[uvIdx]) : 0;
          const rawProb = rainProbIdx >= 0 && cols[rainProbIdx] ? parseFloat(cols[rainProbIdx]) : 0;
          const rawRainStatus = rainStatIdx >= 0 && cols[rainStatIdx] ? cols[rainStatIdx] : 'DRY';
          const rawWifi = wifiIdx >= 0 && cols[wifiIdx] ? cols[wifiIdx] : 'Unknown';

          if (rawWifi.toLowerCase().includes('disc') || rawWifi.toLowerCase().includes('off')) {
            offlineCount++;
          }

          records.push({
            deviceId: 'GWEATHER-001',
            timestamp: rawTs,
            temperature: rawTemp,
            humidity: rawHum,
            pressure: rawPress,
            light: isNaN(rawLux) ? 0 : rawLux,
            uvIndex: isNaN(rawUv) ? 0 : rawUv,
            rainProbability: isNaN(rawProb) ? 0 : rawProb,
            rainStatus: rawRainStatus,
            wifiStatus: rawWifi
          });
        }

        if (records.length === 0) {
          setParseError('No valid weather data rows could be extracted. Please check the CSV structure.');
          return;
        }

        // Calculate stats
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);
        const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);

        setParsedRecords(records);
        setStats({
          totalRecords: records.length,
          offlineCount: offlineCount,
          startTime: records[0].timestamp,
          endTime: records[records.length - 1].timestamp,
          minTemp,
          maxTemp,
          avgTemp
        });
      } catch (err) {
        console.error('CSV Parsing Error:', err);
        setParseError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(csvFile);
  };

  const handleSyncToDatabase = async () => {
    if (!parsedRecords || parsedRecords.length === 0) return;

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncResult(null);

    const BATCH_SIZE = 50;
    let totalInserted = 0;
    const totalBatches = Math.ceil(parsedRecords.length / BATCH_SIZE);

    try {
      for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
        const batch = parsedRecords.slice(i, i + BATCH_SIZE);
        const res = await uploadWeatherBatch(batch);

        if (res.success) {
          totalInserted += (res.insertedCount || 0);
        }

        const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
        setSyncProgress(Math.round((currentBatchNum / totalBatches) * 100));
      }

      setSyncResult({
        success: true,
        message: `Sync complete! Synced ${totalInserted} records to MongoDB Atlas. (${parsedRecords.length - totalInserted} duplicate entries skipped).`,
        insertedCount: totalInserted,
        total: parsedRecords.length
      });

      if (onSyncSuccess) {
        onSyncSuccess();
      }
    } catch (err) {
      console.error('Batch Upload Error:', err);
      setSyncResult({
        success: false,
        message: 'Sync error: ' + err.message
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sd-sync-modal glass-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <SdCardIcon className="chip-svg text-cyan" />
            </div>
            <div>
              <h2 className="modal-title">SD CARD OFFLINE DATA SYNC</h2>
              <span className="modal-subtitle">
                Upload <code>weather_log.csv</code> to view historical graphs and sync offline data into the cloud
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">&times;</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* File Upload Zone */}
          <div
            className={`file-dropzone ${file ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              id="sdCsvInput"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <label htmlFor="sdCsvInput" className="dropzone-label">
              <UploadIcon className="dropzone-svg" />
              <div className="dropzone-text">
                {file ? (
                  <>
                    <span className="dropzone-filename">{file.name}</span>
                    <span className="dropzone-filesize">({(file.size / 1024).toFixed(1)} KB) — Click to pick another file</span>
                  </>
                ) : (
                  <>
                    <span className="dropzone-cta">Drag & Drop <code>weather_log.csv</code> here</span>
                    <span className="dropzone-sub">or click to browse from MicroSD Card reader / computer</span>
                  </>
                )}
              </div>
            </label>
          </div>

          {parseError && (
            <div className="alert-box alert-error">
              {parseError}
            </div>
          )}

          {/* Parsed Stats Overview */}
          {stats && (
            <div className="sd-stats-section">
              <div className="sd-stats-grid">
                <div className="sd-stat-card">
                  <span className="sd-stat-label">TOTAL LOGS</span>
                  <span className="sd-stat-value text-cyan">{stats.totalRecords}</span>
                  <span className="sd-stat-sub">Recorded rows</span>
                </div>
                <div className="sd-stat-card">
                  <span className="sd-stat-label">OFFLINE PERIODS</span>
                  <span className="sd-stat-value text-amber">{stats.offlineCount}</span>
                  <span className="sd-stat-sub">Wi-Fi disconnected</span>
                </div>
                <div className="sd-stat-card">
                  <span className="sd-stat-label">TEMP RANGE</span>
                  <span className="sd-stat-value text-emerald">{stats.minTemp}° – {stats.maxTemp}°C</span>
                  <span className="sd-stat-sub">Avg: {stats.avgTemp}°C</span>
                </div>
                <div className="sd-stat-card">
                  <span className="sd-stat-label">TIME SPAN</span>
                  <span className="sd-stat-value text-indigo">{stats.startTime.split('T')[0] || 'Logged'}</span>
                  <span className="sd-stat-sub">to {stats.endTime.split('T')[0] || 'Latest'}</span>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="sd-preview-table-wrapper">
                <div className="sd-preview-table-header">
                  <span>OFFLINE DATA PREVIEW (First 20 of {stats.totalRecords} entries)</span>
                </div>
                <div className="table-scroll-container">
                  <table className="sd-preview-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Temp</th>
                        <th>Humidity</th>
                        <th>Pressure</th>
                        <th>UV Index</th>
                        <th>Rain Status</th>
                        <th>Wi-Fi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRecords.slice(0, 20).map((row, idx) => (
                        <tr key={idx}>
                          <td className="text-muted">{row.timestamp}</td>
                          <td className="text-amber font-mono">{row.temperature.toFixed(1)} °C</td>
                          <td className="text-cyan font-mono">{row.humidity.toFixed(1)} %</td>
                          <td className="font-mono">{row.pressure.toFixed(1)} hPa</td>
                          <td className="text-amber font-mono">{row.uvIndex.toFixed(1)}</td>
                          <td>
                            <span className={`rain-tag ${row.rainStatus === 'RAINING' ? 'tag-rain' : 'tag-dry'}`}>
                              {row.rainStatus}
                            </span>
                          </td>
                          <td>
                            <span className={`wifi-tag ${row.wifiStatus === 'Connected' ? 'wifi-on' : 'wifi-off'}`}>
                              {row.wifiStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sync Action Area */}
              <div className="sd-sync-action-box">
                {isSyncing ? (
                  <div className="sync-progress-box">
                    <div className="sync-progress-bar-bg">
                      <div className="sync-progress-bar-fill" style={{ width: `${syncProgress}%` }}></div>
                    </div>
                    <span className="sync-progress-text">Uploading to MongoDB Atlas... {syncProgress}%</span>
                  </div>
                ) : (
                  <button
                    className="btn-sync-cloud"
                    onClick={handleSyncToDatabase}
                    disabled={isSyncing}
                  >
                    <DatabaseIcon className="chip-svg" />
                    <span>SYNC {stats.totalRecords} RECORDS TO CLOUD DATABASE</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sync Result Box */}
          {syncResult && (
            <div className={`alert-box ${syncResult.success ? 'alert-success' : 'alert-error'}`}>
              <div className="sync-result-content">
                <strong>{syncResult.success ? '✓ SYNC SUCCESSFUL' : '✕ SYNC FAILED'}</strong>
                <p>{syncResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-tip">
            💡 <strong>Offline Edge Sync:</strong> When the ESP32 weather station is online, it will also automatically sync backlogged records over Wi-Fi.
          </div>
          <button className="btn-modal-close" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
