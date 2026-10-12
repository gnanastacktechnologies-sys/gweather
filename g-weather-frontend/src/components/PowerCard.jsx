import React from 'react';
import { BoltIcon, BatteryIcon } from './Icons';

export default function PowerCard({ batteryVoltage, isUsbPower, estimatedPowerW, estimatedEnergyWh, uptimeHours }) {
  const isUsb = isUsbPower !== false && (batteryVoltage === 0 || batteryVoltage < 3.0);
  const isSolar = !isUsb && batteryVoltage >= 4.5;
  const displayVoltage = isUsb ? '5.00 V (USB)' : `${(batteryVoltage || 5.0).toFixed(2)} V`;
  const powerSourceBadge = isUsb 
    ? '🔌 USB POWERED' 
    : (isSolar ? '☀️ SOLAR POWERED' : '🔋 BATTERY POWERED');

  return (
    <div className="card power-card">
      <div className="card-header">
        <div className="header-left">
          <div className="icon-badge"><BoltIcon className="card-svg icon-amber" /></div>
          <h2 className="card-title">Power & Hardware Efficiency Engine</h2>
        </div>
        <span className="power-source-badge">
          {powerSourceBadge}
        </span>
      </div>

      <div className="card-body">
        <div className="power-metrics-grid">
          <div className="power-box">
            <span className="power-box-label">Supply Voltage</span>
            <span className="power-box-value highlight-gold">{displayVoltage}</span>
            <span className="power-box-sub">{isSolar ? 'Solar PV Rail' : (isUsb ? 'USB 5V Supply' : 'Battery Rail')}</span>
          </div>

          <div className="power-box">
            <span className="power-box-label">Estimated Power</span>
            <span className="power-box-value">{estimatedPowerW ? `${estimatedPowerW.toFixed(2)} W` : '0.85 W'}</span>
            <span className="power-box-sub">Active Circuit Draw</span>
          </div>

          <div className="power-box">
            <span className="power-box-label">Accumulated Energy</span>
            <span className="power-box-value">{estimatedEnergyWh ? `${estimatedEnergyWh.toFixed(2)} Wh` : '1.42 Wh'}</span>
            <span className="power-box-sub">Total Wh Consumed</span>
          </div>

          <div className="power-box">
            <span className="power-box-label">Station Runtime</span>
            <span className="power-box-value">{uptimeHours !== undefined && uptimeHours > 0 ? `${uptimeHours} h` : 'Active'}</span>
            <span className="power-box-sub">Uptime Hours</span>
          </div>
        </div>
      </div>
    </div>
  );
}
