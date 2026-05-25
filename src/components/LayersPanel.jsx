import React from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';

export function LayersPanel({ layers, toggleLayer }) {
  if (!layers || layers.length === 0) return null;

  return (
    <div className="panel" style={{ gridColumn: '3 / 4', gridRow: '4 / 5' }}>
      <div className="panel-header">
        <span>Scan Layers</span>
        <Layers size={14} />
      </div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {layers.map(layer => (
          <div key={layer.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '12px', height: '12px', borderRadius: '50%', 
                background: `rgb(${layer.color[0]}, ${layer.color[1]}, ${layer.color[2]})` 
              }}></div>
              <span style={{ fontSize: '0.85rem' }}>{layer.name}</span>
            </div>
            <button onClick={() => toggleLayer(layer.id)} style={{ padding: '4px', background: 'transparent', border: 'none', color: layer.active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
              {layer.active ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
