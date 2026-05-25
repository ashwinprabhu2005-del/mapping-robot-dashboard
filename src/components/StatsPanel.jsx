import React from 'react';
import { Database, Map, Target, Layers } from 'lucide-react';

export function StatsPanel({ stats, metadata, mode }) {
  if (mode === 'file' && metadata) {
    const { bounds } = metadata;
    const sizeX = bounds ? Math.abs(bounds.maxX - bounds.minX).toFixed(1) : 0;
    const sizeY = bounds ? Math.abs(bounds.maxY - bounds.minY).toFixed(1) : 0;
    const minZ = bounds ? bounds.minZ.toFixed(1) : 0;
    const maxZ = bounds ? bounds.maxZ.toFixed(1) : 0;
    
    const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' };
    const labelStyle = { color: 'var(--accent-cyan)', opacity: 0.8, fontSize: '0.8rem', fontWeight: 600, width: '100px' };
    const valueStyle = { color: '#ffffff', fontFamily: 'monospace', fontSize: '0.9rem', textAlign: 'right' };

    return (
      <div className="panel" style={{ gridColumn: '3 / 4', gridRow: '1 / 2' }}>
        <div className="panel-header">
          <span>SCAN DETAILS</span>
          <Database size={14} />
        </div>
        <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          
          <div style={rowStyle}>
            <span style={labelStyle}>SCAN NAME</span>
            <span style={valueStyle}>{metadata.name || 'Unknown'}</span>
          </div>
  
          <div style={rowStyle}>
            <span style={labelStyle}>SCAN DATE</span>
            <span style={valueStyle}>{metadata.date || 'Unknown'}</span>
          </div>
  
          <div style={rowStyle}>
            <span style={labelStyle}>POINTS SHOWN</span>
            <span style={valueStyle}>{stats.points.toLocaleString()}</span>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>TOTAL POINTS</span>
            <span style={valueStyle}>{metadata.totalPoints ? metadata.totalPoints.toLocaleString() : 'Unknown'}</span>
          </div>
  
          <div style={rowStyle}>
            <span style={labelStyle}>COVERAGE</span>
            <span style={valueStyle}>{sizeX}m × {sizeY}m</span>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>HEIGHT RANGE</span>
            <span style={valueStyle}>{minZ}m to {maxZ > 0 ? '+'+maxZ : maxZ}m</span>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>FORMAT</span>
            <span style={valueStyle}>Trimble RWX → JSON</span>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>SENSOR</span>
            <span style={valueStyle}>LiDAR (Terrestrial)</span>
          </div>
  
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ gridColumn: '3 / 4', gridRow: '1 / 2' }}>
      <div className="panel-header">
        <span>Map Statistics</span>
        <Database size={14} />
      </div>
      <div className="panel-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
          <div className="data-label">Total Points</div>
          <div className="data-value" style={{ fontSize: '1rem' }}>
            {stats.points > 1000 ? (stats.points / 1000).toFixed(1) + 'k' : stats.points}
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
          <div className="data-label">Coverage</div>
          <div className="data-value" style={{ fontSize: '1rem' }}>
            {stats.coverage.toFixed(2)} m²
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
          <div className="data-label">Zones</div>
          <div className="data-value" style={{ fontSize: '1rem' }}>{stats.zones || 0}</div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
          <div className="data-label">Sessions</div>
          <div className="data-value" style={{ fontSize: '1rem' }}>{stats.sessions}</div>
        </div>

      </div>
    </div>
  );
}
