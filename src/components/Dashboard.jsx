import { useState, useEffect, useCallback } from 'react';
import ControlHeader from './ControlHeader';
import SensorPanel from './SensorPanel';
import MapTabs from './MapTabs';
import { fetchDashboardData, fetchLogs } from '../utils/api';
import { MapPin, Navigation, Clock } from 'lucide-react';

const POLL_INTERVAL = 2500;
const LOG_INTERVAL  = 3500;

export default function Dashboard({ setIsAuthenticated }) {
  const [activeTab, setActiveTab]   = useState('live');
  const [dashData, setDashData]     = useState(null);
  const [logs, setLogs]             = useState([]);
  const [isRunning, setRunning]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadDash = useCallback(async () => {
    try {
      const data = await fetchDashboardData();
      setDashData(data);
      setLastUpdate(new Date());
    } catch (e) { console.error('Dashboard fetch error:', e); }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const { logs: l } = await fetchLogs();
      setLogs(l || []);
    } catch (e) { console.error('Logs fetch error:', e); }
  }, []);

  useEffect(() => { loadDash(); loadLogs(); }, []);

  useEffect(() => {
    if (!isRunning) return;
    const d = setInterval(loadDash, POLL_INTERVAL);
    const l = setInterval(loadLogs, LOG_INTERVAL);
    return () => { clearInterval(d); clearInterval(l); };
  }, [isRunning, loadDash, loadLogs]);

  const handleRestart = () => { setDashData(null); setLogs([]); loadDash(); loadLogs(); };

  const robotState = dashData?.robotState;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <ControlHeader
        robotState={robotState}
        isRunning={isRunning}
        onToggleRunning={() => setRunning(r => !r)}
        onRestart={handleRestart}
        setIsAuthenticated={setIsAuthenticated}
      />

      {/* ── Status bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '5px 20px', background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
        fontSize: '11px', color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Navigation size={11} color="var(--cyan)" />
          <span>Position:</span>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            ({robotState?.position?.x ?? '—'}, {robotState?.position?.y ?? '—'})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <MapPin size={11} color="var(--green)" />
          <span>Mapped:</span>
          <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {robotState?.mappedArea ?? '—'} m²
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={11} />
          <span>Updated:</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}
          </span>
          {!isRunning && <span style={{ marginLeft: '8px', color: 'var(--amber)', fontWeight: 600 }}>⏸ PAUSED</span>}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{
        flex: 1, display: 'grid', overflow: 'hidden', padding: '12px', gap: '12px',
        gridTemplateColumns: activeTab === 'live' ? '180px 1fr' : '1fr',
        gridTemplateRows: '1fr',
      }}>

        {/* Left: Sensor Panel (only visible on Live Feed tab) */}
        {activeTab === 'live' && (
          <div style={{ gridColumn: '1', gridRow: '1', overflow: 'hidden' }}>
            <SensorPanel sensors={dashData?.sensors} />
          </div>
        )}

        {/* Center/Right: Tabbed Map Area */}
        <div style={{ gridColumn: activeTab === 'live' ? '2' : '1', gridRow: '1', overflow: 'hidden' }}>
          <MapTabs activeTab={activeTab} setActiveTab={setActiveTab} robotState={robotState} logs={logs} />
        </div>
      </div>
    </div>
  );
}
