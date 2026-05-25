import React from 'react';
import { AlertCircle, X, Info, AlertTriangle } from 'lucide-react';

export function AlertsPanel({ alerts, removeAlert }) {
  return (
    <div className="panel alerts-panel">
      <div className="panel-header">
        <span>System Alerts</span>
      </div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            No active alerts.
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id} 
              style={{ 
                background: 'rgba(0,0,0,0.3)', 
                borderLeft: `3px solid ${
                  alert.severity === 'error' ? 'var(--error-red)' : 
                  alert.severity === 'warning' ? 'var(--warning-amber)' : 
                  'var(--accent-cyan)'
                }`,
                padding: '8px', 
                borderRadius: '0 4px 4px 0',
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                {alert.severity === 'error' ? <AlertCircle size={14} color="var(--error-red)" /> :
                 alert.severity === 'warning' ? <AlertTriangle size={14} color="var(--warning-amber)" /> :
                 <Info size={14} color="var(--accent-cyan)" />}
                <div>
                  <span style={{ color: 'var(--text-muted)', marginRight: '8px', fontSize: '0.75rem' }}>[{alert.time}]</span>
                  <span>{alert.msg}</span>
                </div>
              </div>
              <button 
                onClick={() => removeAlert(alert.id)}
                style={{ padding: '2px', border: 'none', background: 'transparent' }}
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
