import React, { useState, useEffect, useRef } from 'react';
import { useRobotConnection } from './hooks/useRobotConnection';
import { StatusPanel } from './components/StatusPanel';
import { StatsPanel } from './components/StatsPanel';
import { AlertsPanel } from './components/AlertsPanel';
import { ControlPanel } from './components/ControlPanel';
import { ZonePanel } from './components/ZonePanel';
import { SetupGuide } from './components/SetupGuide';
import { MapViewer } from './components/MapViewer';
import { LayersPanel } from './components/LayersPanel';
import { Upload, RefreshCw, BarChart2, View, Maximize, Box as BoxIcon } from 'lucide-react';

function App() {
  const robot = useRobotConnection();
  const fileInputRef = useRef(null);
  
  // Retrieve zones from connection manager (PostgreSQL sync or fallback)
  const zones = robot.zones;
  const setZones = robot.setZones;
  
  const [isDrawingZone, setIsDrawingZone] = useState(null);
  
  // Toolbar state
  const [pointSize, setPointSize] = useState(0.03);
  const [cameraView, setCameraView] = useState('iso'); // 'top', 'front', 'iso'

  // Zone persistence is handled internally by the robot connection manager

  const handleExportMap = () => {
    robot.addAlert('info', 'Exporting map... (simulated)');
  };

  const handleClearPath = () => {
    robot.addAlert('info', 'Path history cleared');
    // For real app we'd clear the path state in hook or call service
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      robot.loadPLYFile(file);
    }
  };

  return (
    <div className="dashboard-container">
      {/* TOP BAR */}
      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '24px', height: '24px', background: 'var(--accent-cyan)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>R</div>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '1px' }}>AUTONOMOUS MAPPING SYSTEM</span>
          {robot.loadedFileName && (
            <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>
              File: {robot.loadedFileName}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            {new Date().toLocaleTimeString()}
          </div>
          <SetupGuide onConnect={robot.connect} currentMode={robot.mode} currentUrl={robot.url} />
        </div>
      </div>

      {/* PANELS */}
      <StatusPanel 
        connected={robot.connected} 
        robotPose={robot.robotPose} 
        battery={robot.battery} 
        mappingStatus={robot.mappingStatus}
        mode={robot.mode}
      />
      
      <div style={{ gridColumn: '2 / 3', gridRow: '2 / 3', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
        {/* FILE LOAD TOOLBAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0d1117', padding: '8px 12px', borderRadius: '4px', borderBottom: '1px solid #1e2330' }}>
          <input 
            type="file" 
            accept=".ply,.las,.laz,.json" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />
          <button className="primary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Load JSON
          </button>
          
          <button onClick={robot.resetToDemo}>
            <RefreshCw size={14} /> Demo
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)', margin: '0 5px' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>Point Size:</span>
            <input 
              type="range" 
              min="0.01" 
              max="0.15" 
              step="0.01" 
              value={pointSize} 
              onChange={(e) => setPointSize(parseFloat(e.target.value))} 
              style={{ width: '80px', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)', margin: '0 5px' }}></div>

          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setCameraView('top' + Date.now())} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
              <View size={14} /> Top
            </button>
            <button onClick={() => setCameraView('front' + Date.now())} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
              <Maximize size={14} /> Front
            </button>
            <button onClick={() => setCameraView('iso' + Date.now())} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
              <BoxIcon size={14} /> Iso
            </button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: '500', background: 'rgba(0,212,255,0.1)', padding: '0 12px', borderRadius: '4px' }}>
            <BarChart2 size={14} />
            {robot.stats.points.toLocaleString()} pts shown
          </div>
        </div>

        <MapViewer 
          pointCloud={robot.pointCloud}
          pointColors={robot.pointColors}
          path={robot.path}
          robotPose={robot.robotPose}
          zones={zones}
          setZones={setZones}
          isDrawingZone={isDrawingZone}
          setIsDrawingZone={setIsDrawingZone}
          isParsing={robot.isParsing}
          mode={robot.mode}
          pointSize={pointSize}
          cameraView={cameraView}
          metadata={robot.scanMetadata}
        />
      </div>

      <ZonePanel 
        zones={zones}
        setZones={setZones}
        isDrawingZone={isDrawingZone}
        setIsDrawingZone={setIsDrawingZone}
      />

      <LayersPanel 
        layers={robot.layers} 
        toggleLayer={robot.toggleLayer} 
      />

      <ControlPanel 
        onClearPath={handleClearPath}
        onExportMap={handleExportMap}
      />

      <AlertsPanel 
        alerts={robot.alerts}
        removeAlert={robot.removeAlert}
      />

      <StatsPanel stats={robot.stats} metadata={robot.scanMetadata} mode={robot.mode} />
    </div>
  );
}

export default App;
