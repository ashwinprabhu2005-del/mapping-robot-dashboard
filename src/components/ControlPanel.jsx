import React, { useState } from 'react';
import { Play, Pause, Square, RefreshCw, Download, Trash2, Sliders } from 'lucide-react';

export function ControlPanel({ onClearPath, onExportMap }) {
  const [density, setDensity] = useState(100);
  const [autoNav, setAutoNav] = useState(false);

  return (
    <div className="panel control-panel">
      <div className="panel-header">
        <span>Robot Controls</span>
        <Sliders size={14} />
      </div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button className="primary" style={{ justifyContent: 'center' }}>
            <Play size={14} /> Start
          </button>
          <button style={{ justifyContent: 'center' }}>
            <Pause size={14} /> Pause
          </button>
          <button className="danger" style={{ justifyContent: 'center' }}>
            <Square size={14} /> Stop
          </button>
          <button style={{ justifyContent: 'center' }}>
            <RefreshCw size={14} /> Reset
          </button>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input 
              type="checkbox" 
              checked={autoNav} 
              onChange={e => setAutoNav(e.target.checked)} 
              style={{ width: 'auto' }}
            />
            Enable Autonomous Navigation
          </label>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>
          <div className="flex-between" style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
            <span>Point Cloud Density</span>
            <span style={{ color: 'var(--accent-cyan)' }}>{density}%</span>
          </div>
          <input 
            type="range" 
            min="10" 
            max="100" 
            value={density} 
            onChange={e => setDensity(e.target.value)}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
          <button style={{ flex: 1, justifyContent: 'center' }} onClick={onExportMap}>
            <Download size={14} /> Export Map
          </button>
          <button style={{ flex: 1, justifyContent: 'center' }} className="danger" onClick={onClearPath}>
            <Trash2 size={14} /> Clear Path
          </button>
        </div>

      </div>
    </div>
  );
}
