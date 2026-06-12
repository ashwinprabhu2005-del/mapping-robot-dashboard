import { Play, Pause, RotateCcw, Save, Bot, Wifi, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as ROSLIB from 'roslib';

export default function ControlHeader({ robotState, isRunning, onToggleRunning, onRestart, setIsAuthenticated }) {
  const modeColor = robotState?.mode === 'AUTONOMOUS' ? 'var(--cyan)' : 'var(--amber)';

  return (
    <header style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 20px', height:'56px', flexShrink:0,
      background:'var(--bg-surface)',
      borderBottom:'1px solid var(--border)',
      boxShadow:'0 2px 20px rgba(0,0,0,0.3)',
    }}>
      {/* Left: Logo + Robot State */}
      <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'8px',
            background:'linear-gradient(135deg, rgba(0,212,255,0.25), rgba(59,130,246,0.25))',
            border:'1px solid rgba(0,212,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Bot size={18} color="var(--cyan)" />
          </div>
          <span style={{ fontWeight:700, fontSize:'16px', letterSpacing:'-0.02em' }}>
            Hyper<span style={{ color:'var(--cyan)' }}>vision</span>
          </span>
        </div>

        <div style={{ width:'1px', height:'28px', background:'var(--border)' }} />

        {/* Status pill */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px',
          padding:'4px 12px', borderRadius:'20px',
          background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.15)' }}>
          <span className="dot dot-cyan" />
          <span style={{ fontSize:'11px', fontWeight:600, color:'var(--cyan)', letterSpacing:'0.06em' }}>
            {robotState?.status || 'IDLE'}
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'6px',
          padding:'4px 12px', borderRadius:'20px',
          background:'rgba(0,0,0,0.2)', border:'1px solid var(--border)' }}>
          <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>MODE</span>
          <span style={{ fontSize:'11px', fontWeight:600, color: modeColor }}>
            {robotState?.mode || '—'}
          </span>
        </div>

        {robotState && (
          <div style={{ display:'flex', alignItems:'center', gap:'12px', color:'var(--text-muted)', fontSize:'11px' }}>
            <span>Area: <strong style={{ color:'var(--green)' }}>{robotState.mappedArea} m²</strong></span>
            <span>Speed: <strong style={{ color:'var(--text-primary)' }}>{robotState.speed} m/s</strong></span>
          </div>
        )}
      </div>

      {/* Center: Controls */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <button id="ctrl-toggle" className={`btn ${isRunning ? 'btn-ghost' : 'btn-green'}`} onClick={onToggleRunning}>
          {isRunning ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Resume</>}
        </button>
        <button id="ctrl-restart" className="btn btn-ghost" onClick={onRestart}>
          <RotateCcw size={13} /> Restart
        </button>
        <button id="ctrl-save" className="btn btn-cyan">
          <Save size={13} /> Save Map
        </button>
      </div>

      {/* Right: Connection & Logout */}
      <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'var(--green)' }}>
          <Wifi size={13} />
          <span style={{ fontFamily:'var(--font-mono)' }}>CONNECTED</span>
        </div>
        <div style={{ width:'1px', height:'24px', background:'var(--border)' }} />
        <button 
          onClick={async () => {
            try {
              const jetsonIp = window.localStorage.getItem('jetsonIp') || window.location.hostname;
              
              // 1. Stop mapping via ROS
              const ros = new ROSLIB.Ros({ url: `ws://${jetsonIp}:9090` });
              ros.on('connection', () => {
                ros.getServices((services) => {
                  if (services.includes('/stop_mapping')) {
                    const stopSimSvc = new ROSLIB.Service({ ros, name: '/stop_mapping', serviceType: 'std_srvs/Trigger' });
                    stopSimSvc.callService(new ROSLIB.ServiceRequest({}), () => {});
                  }
                  if (services.includes('/rtabmap/pause')) {
                    const stopPhysSvc = new ROSLIB.Service({ ros, name: '/rtabmap/pause', serviceType: 'std_srvs/Empty' });
                    stopPhysSvc.callService(new ROSLIB.ServiceRequest({}), () => {});
                  }
                  setTimeout(() => ros.close(), 500); // Close after services are called
                });
              });

              // 2. Stop launch via backend (if exists)
              await fetch(`http://${jetsonIp}:5174/api/stop_launch`, { method: 'POST' });
            } catch (e) {
              console.error("Logout stop_launch error:", e);
            }
            window.localStorage.removeItem('amrDashboardAuthenticated');
            window.localStorage.removeItem('jetsonIp');
            setIsAuthenticated(false);
          }}
          style={{
            background: 'transparent',
            border: '1px solid #ff4d4d',
            color: '#ff4d4d',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#ff4d4d';
            e.target.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = '#ff4d4d';
          }}
        >
          <LogOut size={13} />
          LOGOUT
        </button>
      </div>
    </header>
  );
}
