import { Play, Pause, RotateCcw, Save, Bot, LogOut, Wifi } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ControlHeader({ robotState, isRunning, onToggleRunning, onRestart }) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logoutUser(); navigate('/login'); };

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

      {/* Right: Connection + User */}
      <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'var(--green)' }}>
          <Wifi size={13} />
          <span style={{ fontFamily:'var(--font-mono)' }}>CONNECTED</span>
        </div>
        <div style={{ width:'1px', height:'28px', background:'var(--border)' }} />
        <div style={{ fontSize:'12px', textAlign:'right' }}>
          <div style={{ fontWeight:600, color:'var(--text-primary)' }}>{user?.name}</div>
          <div style={{ color:'var(--text-muted)', fontSize:'10px' }}>{user?.role}</div>
        </div>
        <button id="btn-logout" className="btn btn-red" style={{ padding:'6px 12px' }} onClick={handleLogout}>
          <LogOut size={13} /> Logout
        </button>
      </div>
    </header>
  );
}
