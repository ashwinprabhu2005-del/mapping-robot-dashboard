import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, MapPin } from 'lucide-react';

export function ZonePanel({ zones, setZones, isDrawingZone, setIsDrawingZone }) {
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState('Room');
  const [newZoneColor, setNewZoneColor] = useState('#00d4ff');
  
  const handleAddZone = () => {
    if (!newZoneName) return;
    setIsDrawingZone({
      name: newZoneName,
      type: newZoneType,
      color: newZoneColor
    });
  };

  const handleDeleteZone = (id) => {
    setZones(prev => prev.filter(z => z.id !== id));
  };

  return (
    <div className="panel zone-panel">
      <div className="panel-header">
        <span>Zone Annotation</span>
        <Layers size={14} />
      </div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Add Zone Form */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
          <div style={{ marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>CREATE NEW ZONE</div>
          <input 
            type="text" 
            placeholder="Zone Name" 
            value={newZoneName} 
            onChange={e => setNewZoneName(e.target.value)}
            style={{ marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <select value={newZoneType} onChange={e => setNewZoneType(e.target.value)} style={{ flex: 1 }}>
              <option value="Room">Room</option>
              <option value="Corridor">Corridor</option>
              <option value="Restricted">Restricted</option>
              <option value="Storage">Storage</option>
              <option value="Lab">Lab</option>
            </select>
            <input 
              type="color" 
              value={newZoneColor} 
              onChange={e => setNewZoneColor(e.target.value)}
              style={{ width: '40px', padding: '0', cursor: 'pointer', border: '1px solid var(--panel-border)', borderRadius: '4px' }}
            />
          </div>
          
          <button 
            className="primary" 
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleAddZone}
            disabled={isDrawingZone !== null}
          >
            <Plus size={14} /> 
            {isDrawingZone ? 'Draw on Map...' : 'Add Zone (Draw)'}
          </button>
        </div>

        {/* Zone List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>ANNOTATED ZONES</div>
          {zones.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              No zones defined yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {zones.map(zone => (
                <div key={zone.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', borderLeft: `3px solid ${zone.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} color={zone.color} />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{zone.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{zone.type}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteZone(zone.id)} style={{ padding: '4px' }}>
                    <Trash2 size={14} color="var(--error-red)" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
