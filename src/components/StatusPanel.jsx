import React from 'react';
import { Battery, Activity, Navigation, Zap } from 'lucide-react';

export function StatusPanel({ connected, robotPose, battery, mappingStatus, mode }) {
  return (
    <div className="panel status-panel">
      <div className="panel-header">
        <span>ROVER-01 TELEMETRY</span>
        <div className="flex-between" style={{gap: '8px'}}>
          <span style={{color: 'var(--text-muted)'}}>[{mode.toUpperCase()}]</span>
          <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></div>
        </div>
      </div>
      
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <div className="data-label flex-between">
            <span>Status</span>
            <Activity size={14} />
          </div>
          <div className="data-value">{connected ? mappingStatus : 'DISCONNECTED'}</div>
        </div>

        <div>
          <div className="data-label flex-between">
            <span>Position (X, Y, Z)</span>
            <Navigation size={14} />
          </div>
          <div className="data-value">
            {robotPose.x.toFixed(2)}, {robotPose.y.toFixed(2)}, {robotPose.z.toFixed(2)}
          </div>
        </div>

        <div>
          <div className="data-label">Heading (Yaw)</div>
          <div className="data-value">{(robotPose.yaw * (180 / Math.PI)).toFixed(1)}°</div>
        </div>

        <div>
          <div className="data-label flex-between">
            <span>Battery Level</span>
            <Battery size={14} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${battery}%`, 
                height: '100%', 
                background: battery > 20 ? 'var(--success-green)' : 'var(--error-red)',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            <div className="data-value" style={{ fontSize: '0.9rem' }}>{Math.round(battery)}%</div>
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="data-label flex-between">
            <span>Active Sensor</span>
            <Zap size={14} />
          </div>
          <div className="data-value" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Depth + LiDAR Fusion</div>
        </div>

      </div>
    </div>
  );
}
