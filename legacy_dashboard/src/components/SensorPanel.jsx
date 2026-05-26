import { Radar, Compass, Camera, MapPin, Battery, Cog } from 'lucide-react';

const SENSOR_ICONS = {
  lidar: Radar,
  imu: Compass,
  camera: Camera,
  gps: MapPin,
  battery: Battery,
  motors: Cog,
};

function statusBadge(status) {
  if (!status) return null;
  const map = { ONLINE:'badge-online', ACTIVE:'badge-online', DEGRADED:'badge-warn', CHARGING:'badge-info', OFFLINE:'badge-error' };
  const dot  = { ONLINE:'dot-green', ACTIVE:'dot-green', DEGRADED:'dot-amber', CHARGING:'dot-cyan', OFFLINE:'dot-red' };
  return (
    <span className={`badge ${map[status] || 'badge-warn'}`}>
      <span className={`dot ${dot[status] || 'dot-amber'}`} />
      {status}
    </span>
  );
}

function SensorRow({ icon: Icon, label, value, unit, status, sub }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px',
      padding:'10px 12px', borderRadius:'var(--radius-sm)',
      background:'var(--bg-surface)', border:'1px solid var(--border)',
      transition:'var(--transition)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-bright)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
          <Icon size={13} color="var(--cyan)" />
          <span style={{ fontSize:'11px', fontWeight:600, color:'var(--text-secondary)', letterSpacing:'0.05em' }}>{label}</span>
        </div>
        {statusBadge(status)}
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:'4px' }}>
        <span style={{ fontSize:'18px', fontWeight:700, fontFamily:'var(--font-mono)', color:'var(--text-primary)', letterSpacing:'-0.02em' }}>{value}</span>
        {unit && <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize:'10px', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{sub}</div>}
    </div>
  );
}

export default function SensorPanel({ sensors }) {
  if (!sensors) return (
    <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
      Awaiting sensor data…
    </div>
  );

  const rows = [
    { key:'imu',     label:'IMU / Gyro', value: sensors.imu?.yaw ?? '—',   unit:'°',   status:sensors.imu?.status,     sub:`R ${sensors.imu?.roll}° P ${sensors.imu?.pitch}°` },
    { key:'camera',  label:'Camera',  value: sensors.camera?.fps ?? '—',    unit:'fps', status:sensors.camera?.status,  sub:sensors.camera?.resolution },
    { key:'battery', label:'Battery', value: sensors.battery?.percentage ?? '—', unit:'%', status:sensors.battery?.status, sub:`${sensors.battery?.voltage}V` },
    { key:'motors',  label:'Motors',  value: sensors.motors?.temp ?? '—',   unit:'°C',  status:sensors.motors?.status,  sub:`L ${sensors.motors?.leftRPM} / R ${sensors.motors?.rightRPM} RPM` },
  ];

  return (
    <div className="card" style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div className="card-title">
        <Radar size={12} />
        Sensor Array
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'6px', overflowY:'auto', flex:1 }}>
        {rows.map(r => (
          <SensorRow key={r.key} icon={SENSOR_ICONS[r.key]} {...r} />
        ))}
      </div>
    </div>
  );
}
