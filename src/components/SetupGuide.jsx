import React, { useState } from 'react';
import { Settings, X, Wifi } from 'lucide-react';

export function SetupGuide({ onConnect, currentMode, currentUrl }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(currentMode);
  const [url, setUrl] = useState(currentUrl);

  const handleConnect = () => {
    onConnect(mode, url);
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} title="Connection Settings">
        <Settings size={18} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', 
          justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="panel" style={{ width: '600px', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <span>Connection Settings & Setup Guide</span>
              <button onClick={() => setIsOpen(false)} style={{ padding: '4px', border: 'none' }}><X size={16} /></button>
            </div>
            <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
                <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wifi size={18} /> Active Connection
                </h3>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="mode" value="demo" checked={mode === 'demo'} onChange={e => setMode(e.target.value)} />
                    Demo Mode
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="mode" value="rosbridge" checked={mode === 'rosbridge'} onChange={e => setMode(e.target.value)} />
                    Rosbridge
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="mode" value="zenoh" checked={mode === 'zenoh'} onChange={e => setMode(e.target.value)} />
                    Zenoh Bridge
                  </label>
                </div>
                
                {mode !== 'demo' && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>WebSocket URL</label>
                    <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="ws://localhost:9090" />
                  </div>
                )}
                
                <button className="primary" onClick={handleConnect} style={{ width: '100%', justifyContent: 'center' }}>
                  Connect
                </button>
              </div>

              <div style={{ padding: '15px', borderTop: '1px solid var(--panel-border)' }}>
                <h3 style={{ color: 'var(--text-main)', marginBottom: '10px' }}>How to Load Your Scan</h3>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#000', padding: '15px', borderRadius: '4px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
{`HOW TO LOAD A TRIMBLE REALWORKS PROJECT

STEP 1 — Install Python dependencies
pip install open3d laspy numpy

STEP 2 — Run the converter
python convert_scan.py --rwcx "Museum_ply__Station1_Scan1.rwcx" --output museum_scan.json

  OR if you exported from RealWorks to LAS:
python convert_scan.py --las "your_export.las" --output museum_scan.json

STEP 3 — Load in dashboard
Click "Load Scan File" → select museum_scan.json (or .las file directly)

ALTERNATIVE — Export directly:
1. Open RealWorks → open Museum_ply.rwp project
2. Select your scan → File → Export → Point Cloud
3. Choose format: LAS 1.2 or PLY with RGB
4. Save as museum_export.las or museum_export.ply
5. Load that file directly in the dashboard

----------------------------------------
HOW TO CONNECT YOUR ROS 2 ROBOT

OPTION A — Using Rosbridge (Easiest)
1. sudo apt install ros-humble-rosbridge-suite
2. ros2 launch rosbridge_server rosbridge_websocket_launch.xml
3. Select "Rosbridge" above, enter ws://<ROBOT_IP>:9090
4. Click Connect

OPTION B — Using Zenoh Bridge (Recommended)
1. cargo install zenoh-bridge-ros2dds OR pip install eclipse-zenoh
2. Run: zenoh-bridge-ros2dds
3. Run: zenohd
4. Select "Zenoh" above, enter ws://<ROBOT_IP>:7447
5. Click Connect`}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
