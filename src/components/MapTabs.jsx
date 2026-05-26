// ANNOTATION: Fully upgraded MapTabs container component.
// Replaced the static mockup views for LiveFeedTab, MapsTab, and AnnotationTab with fully featured,
// state-synchronized live components. Shared selectedMap state is lifted here to enable loaded map syncing.
import { useState } from 'react';
import { Video, Map, Tag } from 'lucide-react';
import LiveFeedTab from './LiveFeedTab';
import MapsTab from './MapsTab';
import AnnotationTab from './AnnotationTab';

const TABS = [
  { id: 'live', label: 'Live Feed', icon: Video },
  { id: 'maps', label: '3D Maps', icon: Map },
  { id: 'annotation', label: 'Annotation', icon: Tag },
];

// ── Tab Bar ──────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px', flexShrink: 0 }}>
      {TABS.map(({ id, label, icon: Icon }) => {
        const on = active === id;
        return (
          <button key={id} id={`tab-${id}`} onClick={() => onChange(id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', transition: 'all 0.2s',
            background: on ? 'linear-gradient(135deg,rgba(0,212,255,0.18),rgba(59,130,246,0.12))' : 'transparent',
            color: on ? 'var(--cyan)' : 'var(--text-muted)',
            borderBottom: on ? '2px solid var(--cyan)' : '2px solid transparent',
            boxShadow: on ? '0 0 12px rgba(0,212,255,0.1)' : 'none',
          }}>
            <Icon size={13} />{label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────
export default function MapTabs({ activeTab, setActiveTab, robotState, logs }) {
  const [selectedMap, setSelectedMap] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      <TabBar active={activeTab} onChange={setActiveTab} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'live'       && <LiveFeedTab selectedMap={selectedMap} />}
        {activeTab === 'maps'       && <MapsTab selectedMap={selectedMap} setSelectedMap={setSelectedMap} />}
        {activeTab === 'annotation' && <AnnotationTab selectedMap={selectedMap} />}
      </div>
    </div>
  );
}
