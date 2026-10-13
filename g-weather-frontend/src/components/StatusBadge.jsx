import React from 'react';

export default function StatusBadge({ isOnline }) {
  return (
    <div className={`status-badge-glow ${isOnline ? 'badge-online' : 'badge-offline'}`}>
      <span className="pulse-ring"></span>
      <span className="status-dot"></span>
      <span className="status-text status-text-full">{isOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</span>
      <span className="status-text status-text-short">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
    </div>
  );
}
