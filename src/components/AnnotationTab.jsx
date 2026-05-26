// ANNOTATION: Integrated AnnotationTab Component with support for Interactive 3D Bounding Box Placements.
// Uses a Three.js Raycaster to capture 2 mouse clicks directly on the GLB mesh surface, calculates box centers,
// automatically generates colored wireframes & transparent fills, stores them in localStorage/IndexedDB,
// and supports custom category assignments (Room, Restricted, Equipment, observation) and JSON import/export options.
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import GLBViewer from './GLBViewer';
import { saveZonesToStorage, loadZonesFromStorage } from '../utils/storage';

export default function AnnotationTab({ selectedMap }) {
  const viewerRef = useRef(null);
  const [zones, setZones] = useState([]);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', type: 'Room', color: '#00d4ff' });
  const [drawPoints, setDrawPoints] = useState([]); // will hold 2 THREE.Vector3 points
  
  // Meshes for rendering
  const [zoneMeshes, setZoneMeshes] = useState({});

  useEffect(() => {
    if (selectedMap) {
      const loadedZones = loadZonesFromStorage(selectedMap.name);
      setZones(loadedZones);
      // Wait a moment for scene to be ready then render zones
      setTimeout(() => renderAllZones(loadedZones), 500);
    } else {
      setZones([]);
      removeAllZones();
    }
  }, [selectedMap]);

  // Save zones whenever they change
  useEffect(() => {
    if (selectedMap) {
      saveZonesToStorage(selectedMap.name, zones);
    }
  }, [zones, selectedMap]);

  // Handle Raycaster Interaction
  useEffect(() => {
    if (!isDrawingMode || !viewerRef.current) return;
    
    const renderer = viewerRef.current.getRenderer();
    const camera = viewerRef.current.getCamera();
    const scene = viewerRef.current.getScene();
    const model = viewerRef.current.getModel();
    const controls = viewerRef.current.getControls();
    
    if (!renderer || !camera || !scene || !model) return;

    controls.enabled = false; // disable orbit controls while drawing
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(model, true);

      if (intersects.length > 0) {
        const pt = intersects[0].point;
        setDrawPoints(prev => {
          const nextPts = [...prev, pt];
          if (nextPts.length === 2) {
            setIsDrawingMode(false);
            controls.enabled = true;
          }
          return nextPts;
        });
      }
    };

    renderer.domElement.addEventListener('pointerdown', onClick);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onClick);
      if (controls) controls.enabled = true;
    };
  }, [isDrawingMode]);

  // Render temporary preview box if 2 points are selected
  useEffect(() => {
    if (drawPoints.length === 2 && viewerRef.current && showZoneDialog) {
      const scene = viewerRef.current.getScene();
      const p1 = drawPoints[0];
      const p2 = drawPoints[1];
      
      const bounds = {
        x: [Math.min(p1.x, p2.x), Math.max(p1.x, p2.x)],
        y: [Math.min(p1.y, p2.y), Math.max(p1.y, p2.y)],
        z: [Math.min(p1.z, p2.z), Math.max(p1.z, p2.z)]
      };
      
      // Expand bounds slightly so it has volume even if points are on a flat surface
      if (bounds.y[1] - bounds.y[0] < 0.1) {
        bounds.y[0] -= 1;
        bounds.y[1] += 2;
      }
      if (bounds.x[1] - bounds.x[0] < 0.1) {
        bounds.x[0] -= 0.5; bounds.x[1] += 0.5;
      }
      if (bounds.z[1] - bounds.z[0] < 0.1) {
        bounds.z[0] -= 0.5; bounds.z[1] += 0.5;
      }

      const tempZone = { id: 'temp', ...newZone, bounds, visible: true };
      renderZoneMesh(scene, tempZone);
    }
  }, [drawPoints, newZone.color, showZoneDialog]);


  const renderZoneMesh = (scene, zone) => {
    // Remove existing meshes for this zone if any
    if (zoneMeshes[zone.id]) {
      scene.remove(zoneMeshes[zone.id].mesh);
      scene.remove(zoneMeshes[zone.id].wireframe);
    }

    if (!zone.visible && zone.id !== 'temp') return;

    const width = zone.bounds.x[1] - zone.bounds.x[0];
    const height = zone.bounds.y[1] - zone.bounds.y[0];
    const depth = zone.bounds.z[1] - zone.bounds.z[0];

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
      color: zone.color,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    const centerX = (zone.bounds.x[0] + zone.bounds.x[1]) / 2;
    const centerY = (zone.bounds.y[0] + zone.bounds.y[1]) / 2;
    const centerZ = (zone.bounds.z[0] + zone.bounds.z[1]) / 2;
    mesh.position.set(centerX, centerY, centerZ);
    
    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: zone.color, linewidth: 2 })
    );
    wireframe.position.copy(mesh.position);
    
    scene.add(mesh);
    scene.add(wireframe);

    setZoneMeshes(prev => ({ ...prev, [zone.id]: { mesh, wireframe } }));
  };

  const removeAllZones = () => {
    if (!viewerRef.current) return;
    const scene = viewerRef.current.getScene();
    Object.values(zoneMeshes).forEach(({ mesh, wireframe }) => {
      scene.remove(mesh);
      scene.remove(wireframe);
    });
    setZoneMeshes({});
  };

  const renderAllZones = (zonesToRender) => {
    if (!viewerRef.current) return;
    const scene = viewerRef.current.getScene();
    removeAllZones();
    zonesToRender.forEach(z => {
      if (z.visible) renderZoneMesh(scene, z);
    });
  };

  const openZoneDialog = () => {
    if (!selectedMap) {
      alert("Please load a map from the 3D MAPS tab first!");
      return;
    }
    setNewZone({ name: `Zone ${zones.length + 1}`, type: 'Room', color: '#00d4ff' });
    setDrawPoints([]);
    setShowZoneDialog(true);
  };

  const enterDrawMode = () => {
    setDrawPoints([]);
    setIsDrawingMode(true);
  };

  const saveZone = () => {
    if (drawPoints.length !== 2) {
      alert("Please draw on the model first (click 2 points)");
      return;
    }
    
    const p1 = drawPoints[0];
    const p2 = drawPoints[1];
    const bounds = {
      x: [Math.min(p1.x, p2.x), Math.max(p1.x, p2.x)],
      y: [Math.min(p1.y, p2.y), Math.max(p1.y, p2.y)],
      z: [Math.min(p1.z, p2.z), Math.max(p1.z, p2.z)]
    };

    if (bounds.y[1] - bounds.y[0] < 0.1) {
      bounds.y[0] -= 1; bounds.y[1] += 2;
    }

    const finalZone = {
      id: Date.now(),
      ...newZone,
      bounds,
      visible: true
    };

    setZones([...zones, finalZone]);
    setShowZoneDialog(false);
    setDrawPoints([]);
    
    // Remove temp and render real
    if (viewerRef.current && zoneMeshes['temp']) {
      const scene = viewerRef.current.getScene();
      scene.remove(zoneMeshes['temp'].mesh);
      scene.remove(zoneMeshes['temp'].wireframe);
    }
    renderAllZones([...zones, finalZone]);
  };

  const toggleZoneVisibility = (id) => {
    const updated = zones.map(z => z.id === id ? { ...z, visible: !z.visible } : z);
    setZones(updated);
    renderAllZones(updated);
  };

  const deleteZone = (id) => {
    const updated = zones.filter(z => z.id !== id);
    setZones(updated);
    renderAllZones(updated);
  };

  const exportZones = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(zones));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `zones_${selectedMap.name}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importZones = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const imported = JSON.parse(event.target.result);
          setZones(imported);
          renderAllZones(imported);
        } catch (err) {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    }
    input.click();
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {/* Left: 3D Viewer */}
      <div style={{ flex: '0.7', background: '#000000', position: 'relative' }}>
        {selectedMap ? (
          <GLBViewer ref={viewerRef} selectedMap={selectedMap} />
        ) : (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            Please select a map from the 3D MAPS tab first.
          </div>
        )}
      </div>

      {/* Right: Annotation Panel */}
      <div style={{ flex: '0.3', background: 'var(--panel-bg)', borderLeft: '1px solid var(--panel-border)', padding: '20px', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0, color: 'var(--accent-cyan)' }}>ZONE ANNOTATION</h3>

        <button 
          onClick={openZoneDialog}
          className="primary"
          style={{ width: '100%', padding: '12px', fontSize: '14px', marginBottom: '20px' }}
        >
          + ADD ZONE
        </button>

        {showZoneDialog && (
          <div style={{ background: '#111318', padding: '15px', borderRadius: '6px', border: '1px solid var(--accent-cyan)', marginBottom: '20px' }}>
            <div style={{ marginBottom: '10px' }}>
              <input 
                type="text" 
                placeholder="Zone name"
                value={newZone.name}
                onChange={(e) => setNewZone({...newZone, name: e.target.value})}
                style={{ width: '100%', padding: '8px', background: '#1e2330', border: '1px solid var(--panel-border)', color: 'white', borderRadius: '4px', fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
              <select 
                value={newZone.type}
                onChange={(e) => setNewZone({...newZone, type: e.target.value})}
                style={{ flex: 1, padding: '8px', background: '#1e2330', border: '1px solid var(--panel-border)', color: 'white', borderRadius: '4px', fontFamily: 'monospace' }}
              >
                <option>Room</option>
                <option>Corridor</option>
                <option>Restricted</option>
                <option>Equipment</option>
                <option>Observation Point</option>
              </select>
              <input 
                type="color" 
                value={newZone.color}
                onChange={(e) => setNewZone({...newZone, color: e.target.value})}
                style={{ width: '40px', height: '35px', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </div>

            <button 
              onClick={enterDrawMode}
              style={{ width: '100%', padding: '8px', background: isDrawingMode ? 'var(--warning-amber)' : '#1e2330', color: isDrawingMode ? '#000' : 'white', border: '1px solid var(--panel-border)', marginBottom: '10px', fontWeight: isDrawingMode ? 'bold' : 'normal' }}
            >
              {isDrawingMode ? 'Drawing... (Click 2 points)' : '📍 Draw on Model'}
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="primary" onClick={saveZone} style={{ flex: 1 }}>✓ Save</button>
              <button onClick={() => { setShowZoneDialog(false); setIsDrawingMode(false); }} style={{ flex: 1 }}>✕ Cancel</button>
            </div>
          </div>
        )}

        {isDrawingMode && (
          <div style={{ background: 'var(--warning-amber)', padding: '10px', borderRadius: '4px', color: '#000', marginBottom: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            Click 2 points on the 3D model to define the zone bounds. {drawPoints.length}/2 points selected.
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <h4 style={{ color: 'var(--accent-cyan)', marginTop: 0, borderBottom: '1px solid var(--panel-border)', paddingBottom: '10px' }}>ZONES ({zones.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {zones.map(zone => (
              <div key={zone.id} style={{ background: '#111318', borderLeft: `4px solid ${zone.color}`, padding: '12px', borderRadius: '4px', borderTop: '1px solid var(--panel-border)', borderRight: '1px solid var(--panel-border)', borderBottom: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>{zone.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{zone.type}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => toggleZoneVisibility(zone.id)}
                      style={{ padding: '4px 8px', background: zone.visible ? 'var(--accent-cyan)' : '#1e2330', color: zone.visible ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      {zone.visible ? '👁' : '🚫'}
                    </button>
                    <button 
                      onClick={() => deleteZone(zone.id)}
                      style={{ padding: '4px 8px', background: 'var(--error-red)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'monospace' }}>
                  X: [{zone.bounds.x[0].toFixed(1)}, {zone.bounds.x[1].toFixed(1)}]
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
          <button onClick={exportZones} style={{ flex: 1, padding: '10px', background: 'var(--panel-border)', color: 'var(--accent-cyan)' }}>
            💾 EXPORT
          </button>
          <button onClick={importZones} style={{ flex: 1, padding: '10px', background: 'var(--panel-border)', color: 'var(--accent-cyan)' }}>
            📂 IMPORT
          </button>
        </div>
      </div>
    </div>
  );
}
