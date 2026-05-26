import { useEffect, useRef } from 'react';
import { Terminal, AlertTriangle, Info, Bug, AlertCircle } from 'lucide-react';

const LEVEL_CONFIG = {
  INFO:  { badge:'badge-info',  icon: Info,          color:'var(--cyan)' },
  WARN:  { badge:'badge-warn',  icon: AlertTriangle,  color:'var(--amber)' },
  ERROR: { badge:'badge-error', icon: AlertCircle,    color:'var(--red)' },
  DEBUG: { badge:'badge-debug', icon: Bug,            color:'var(--purple)' },
};

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

export default function LogsPanel({ logs }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [logs]);

  return (
    <div className="card" style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div className="card-title" style={{ justifyContent:'space-between' }}>
        <span style={{ display:'flex', alignItems:'center', gap:'6px' }}>
          <Terminal size={12} /> System Logs
        </span>
        <span style={{ background:'rgba(0,212,255,0.1)', color:'var(--cyan)', borderRadius:'20px',
          padding:'1px 8px', fontSize:'10px', fontWeight:600, border:'1px solid rgba(0,212,255,0.2)' }}>
          LIVE
        </span>
      </div>

      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'2px' }}>
        {(!logs || logs.length === 0) && (
          <div style={{ color:'var(--text-muted)', padding:'12px', fontSize:'12px' }}>Awaiting log data…</div>
        )}
        {logs && [...logs].reverse().map((log) => {
          const cfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.INFO;
          const LevelIcon = cfg.icon;
          return (
            <div key={log.id} style={{
              display:'flex', alignItems:'flex-start', gap:'8px',
              padding:'6px 8px', borderRadius:'4px',
              background:'rgba(0,0,0,0.2)',
              borderLeft:`2px solid ${cfg.color}`,
              transition:'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.2)'}>
              <LevelIcon size={11} color={cfg.color} style={{ marginTop:'2px', flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-muted)', flexShrink:0 }}>
                    {formatTime(log.timestamp)}
                  </span>
                  <span className={`badge ${cfg.badge}`} style={{ padding:'0px 5px', fontSize:'9px' }}>{log.level}</span>
                </div>
                <p style={{ fontSize:'11px', color:'var(--text-secondary)', lineHeight:1.4,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {log.message}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
