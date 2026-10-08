import React from 'react';

export default function StatusBadge({ isOnline }) {
  return (
    <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
      <span className="status-dot"></span>
      <span className="status-text">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
    </div>
  );
}
