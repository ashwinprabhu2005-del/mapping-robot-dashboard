// ANNOTATION: Integrated MapsTab Component with support for IndexedDB Map Library and Chunked Uploads.
// Contains drop-zone elements with progress tracking, storage limit meters, map details, triangle counters, and 3D bounding box dimensions.
import React, { useState, useEffect, useRef } from 'react';
import GLBViewer from './GLBViewer';
import { storageService } from '../utils/storageService';
import { uploadFileChunked } from '../utils/chunkUploader';

export default function MapsTab({ selectedMap, setSelectedMap }) {
  const [maps, setMaps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadMaps();
    updateStorageInfo();
  }, []);

  const loadMaps = async () => {
    try {
      const storedMaps = await storageService.getAllMaps();
      setMaps(storedMaps);
    } catch (e) {
      console.error("Failed to load maps", e);
    }
  };

  const updateStorageInfo = async () => {
    try {
      const info = await storageService.getStorageEstimate();
      setStorageInfo(info);
    } catch (e) {
      console.error("Failed to get storage estimate", e);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      alert("Please upload a .GLB or .GLTF file");
      return;
    }
    
    setUploadProgress({ currentChunk: 0, totalChunks: 1, percentage: 0 });
    
    try {
      const newMap = await uploadFileChunked(file, (progress) => {
        setUploadProgress(progress);
      });
      
      await loadMaps();
      setSelectedMap(newMap);
      await updateStorageInfo();
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to save map.");
    } finally {
      setUploadProgress(null);
    }
  };

  const deleteMap = async (id) => {
    await storageService.deleteMap(id);
    await loadMaps();
    await updateStorageInfo();
    if (selectedMap && selectedMap.id === id) {
      setSelectedMap(null);
      setStats(null);
    }
  };

  const getStorageColor = (percentage) => {
    if (percentage > 80) return 'var(--error-red, #ff4444)';
    if (percentage > 50) return 'var(--warning-amber, #ffaa00)';
    return '#00ff00';
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {/* Left: Map Library */}
      <div style={{ flex: '0.25', background: 'var(--panel-bg)', padding: '15px', borderRight: '1px solid var(--panel-border)', overflowY: 'auto' }}>
        <h3 style={{ color: 'var(--accent-cyan)', marginTop: 0 }}>MAP LIBRARY</h3>
        
        {/* Storage Monitoring Panel */}
        {storageInfo && (
          <div style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', border: '1px solid var(--panel-border)', fontSize: '12px', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#fff' }}>
              <span>Storage Usage</span>
              <span>{(storageInfo.usage / 1024 / 1024).toFixed(1)}MB / {(storageInfo.quota / 1024 / 1024).toFixed(1)}MB</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${Math.min(100, (storageInfo.usage / storageInfo.quota) * 100)}%`, 
                height: '100%', 
                background: getStorageColor((storageInfo.usage / storageInfo.quota) * 100),
                transition: 'width 0.5s, background-color 0.5s'
              }}></div>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div 
          onDragOver={handleDragOver}
          onDrop={handleFileDrop}
          onClick={() => !uploadProgress && fileInputRef.current?.click()}
          style={{ 
            border: '2px dashed var(--accent-cyan)', borderRadius: '6px', padding: '20px',
            textAlign: 'center', marginBottom: '15px', cursor: uploadProgress ? 'default' : 'pointer', 
            background: uploadProgress ? 'rgba(0,0,0,0.5)' : 'rgba(0,212,255,0.05)',
            position: 'relative'
          }}
        >
          {uploadProgress ? (
            <div>
              <p style={{ margin: '0 0 10px 0', color: 'var(--accent-cyan)', fontSize: '12px' }}>
                Chunk {uploadProgress.currentChunk}/{uploadProgress.totalChunks}
              </p>
              <div style={{ width: '100%', height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden', marginBottom: '5px' }}>
                <div style={{ width: `${uploadProgress.percentage}%`, height: '100%', background: 'var(--accent-cyan)', transition: 'width 0.2s' }}></div>
              </div>
              <p style={{ margin: 0, color: '#fff', fontSize: '12px' }}>{uploadProgress.percentage}% Complete</p>
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '12px' }}>
              Drag GLB files here or click to upload<br/>(Up to 250MB+)
            </p>
          )}
          <input 
            type="file" 
            accept=".glb,.gltf" 
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
        </div>

        {/* Search */}
        <input 
          type="text" 
          placeholder="Search maps..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '15px', background: '#1e2330', border: '1px solid var(--accent-cyan)', color: '#fff', borderRadius: '4px', fontFamily: 'monospace' }}
        />

        {/* Map List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {maps.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(map => (
            <div 
              key={map.id}
              onClick={() => setSelectedMap(map)}
              style={{ 
                background: selectedMap?.id === map.id ? '#1e3a5f' : '#111318',
                border: `1px solid ${selectedMap?.id === map.id ? 'var(--accent-cyan)' : 'var(--panel-border)'}`,
                padding: '10px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '11px',
                fontFamily: 'monospace'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>{map.name}</div>
              <div style={{ color: 'var(--text-muted)' }}>
                {(map.size / 1024 / 1024).toFixed(1)} MB
              </div>
              <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
                {new Date(map.modified).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedMap(map); }}
                  style={{ flex: 1, padding: '4px', background: 'var(--accent-cyan)', color: '#000', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  LOAD
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteMap(map.id); }}
                  style={{ flex: 1, padding: '4px', background: 'var(--error-red)', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  DEL
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: 3D Viewer */}
      <div style={{ flex: '0.75', background: '#000000', position: 'relative' }}>
        <GLBViewer selectedMap={selectedMap} setStats={setStats} />
        
        {/* Color Legend (vertical bar on left edge) */}
        <div style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '200px', background: 'linear-gradient(to top, #0066ff, #00ffff, #00ff00, #ffff00, #ff0000)', borderRadius: '6px', boxShadow: '0 0 10px rgba(0,255,255,0.3)' }}></div>

        {/* Stats Panel (top-right) */}
        {stats && (
          <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(10, 12, 16, 0.8)', color: 'var(--accent-cyan)', padding: '15px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', minWidth: '220px', border: '1px solid var(--panel-border)', backdropFilter: 'blur(4px)' }}>
            <div style={{ fontSize: '14px', color: '#fff', marginBottom: '10px' }}><strong>{stats.name}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>Triangles:</span> <span style={{color: '#fff'}}>{stats.triangleCount.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>Vertices:</span> <span style={{color: '#fff'}}>{stats.vertexCount.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span>Size:</span> <span style={{color: '#fff'}}>{(stats.size / 1024 / 1024).toFixed(1)} MB</span></div>
            
            {stats.bbox && (
              <>
                <div style={{ borderTop: '1px solid var(--panel-border)', margin: '8px 0' }}></div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>BOUNDING BOX</div>
                <div style={{ color: '#fff' }}>X: [{stats.bbox.min.x.toFixed(1)}, {stats.bbox.max.x.toFixed(1)}]</div>
                <div style={{ color: '#fff' }}>Y: [{stats.bbox.min.y.toFixed(1)}, {stats.bbox.max.y.toFixed(1)}]</div>
                <div style={{ color: '#fff' }}>Z: [{stats.bbox.min.z.toFixed(1)}, {stats.bbox.max.z.toFixed(1)}]</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
