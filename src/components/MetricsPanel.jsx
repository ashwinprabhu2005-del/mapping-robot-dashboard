import { Activity } from 'lucide-react';



function StatChip({ label, value, color }) {
  return (
    <div style={{ textAlign:'center', padding:'5px 6px', borderRadius:'var(--radius-sm)',
      background:'var(--bg-surface)', border:'1px solid var(--border)', flex:1 }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:700, color: color || 'var(--text-primary)', lineHeight:1.2 }}>
        {value}
      </div>
      <div style={{ fontSize:'9px', color:'var(--text-muted)', marginTop:'2px', fontWeight:500, letterSpacing:'0.04em' }}>
        {label}
      </div>
    </div>
  );
}

export default function MetricsPanel({ performance }) {
  if (!performance) return (
    <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
      Awaiting metrics…
    </div>
  );

  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:'8px', padding:'10px 14px', height:'100%' }}>
      <div className="card-title" style={{ marginBottom:0 }}>
        <Activity size={11} /> Performance Metrics
      </div>

      {/* Single row: stat chips + progress bars side by side */}
      <div style={{ display:'flex', gap:'12px', flex:1, alignItems:'center' }}>
        {/* Stat chips */}
        <div style={{ display:'flex', gap:'5px', flexShrink:0 }}>
          <StatChip label="LATENCY" value={`${performance.latency}ms`}              color="var(--cyan)"   />
          <StatChip label="UPTIME"  value={performance.uptime}                       color="var(--green)"  />
          <StatChip label="MAPPING" value={`${performance.mapping}%`}               color="var(--blue)"   />
          <StatChip label="LOCAL."  value={`${performance.localization}%`}          color="var(--purple)" />
          <StatChip label="PATH"    value={`${performance.pathPlanning}%`}          color="var(--amber)"  />
        </div>

        <div style={{ width:'1px', alignSelf:'stretch', background:'var(--border)' }} />

        {/* Resource chips */}
        <div style={{ display:'flex', gap:'5px', flex:1 }}>
          <StatChip label="CPU"     value={`${performance.cpu}%`}     color="var(--cyan)"   />
          <StatChip label="MEMORY"  value={`${performance.memory}%`}  color="var(--blue)"   />
          <StatChip label="NETWORK" value={`${performance.network}%`} color="var(--purple)" />
        </div>
      </div>
    </div>
  );
}
