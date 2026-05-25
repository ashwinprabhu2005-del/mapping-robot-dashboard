import { useState, useEffect, useCallback, useRef } from 'react';
import { parsePLY } from '../utils/plyParser';
import { parseLAS } from '../utils/lasParser';
import { parsePointCloud2 } from '../utils/pointcloudParser';
import * as ROSLIB from 'roslib';

export function useRobotConnection() {
  const [mode, setMode] = useState('demo'); // 'demo', 'rosbridge', 'zenoh', 'file'
  const [url, setUrl] = useState(import.meta.env.VITE_ROSBRIDGE_URL || 'ws://localhost:9090');
  const [connected, setConnected] = useState(false);
  
  // Telemetry state
  const [robotPose, setRobotPose] = useState({ x: 0, y: 0, z: 0, yaw: 0 });
  const [battery, setBattery] = useState(100);
  const [mappingStatus, setMappingStatus] = useState('Idle');
  
  // Map data
  const [pointCloud, setPointCloud] = useState(new Float32Array(0)); // XYZ interleaved
  const [pointColors, setPointColors] = useState(null); // RGB interleaved
  const [path, setPath] = useState([]); // Array of {x, y, z}
  const [stats, setStats] = useState({ points: 0, coverage: 0, sessions: 1 });
  
  // File Loading State
  const [isParsing, setIsParsing] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState('');
  const [scanMetadata, setScanMetadata] = useState(null);
  
  // Layers State
  const [layers, setLayers] = useState([]);
  const [rawPointCloud, setRawPointCloud] = useState(null);
  const [rawPointColors, setRawPointColors] = useState(null);
  const [rawPointLayers, setRawPointLayers] = useState(null);

  // Zones State
  const [zones, setZones] = useState(() => {
    const saved = localStorage.getItem('robot-zones');
    return saved ? JSON.parse(saved) : [];
  });

  // Alerts
  const [alerts, setAlerts] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), severity: 'info', msg: 'System initialized' }
  ]);

  // Reference hooks for cleanup
  const rosRef = useRef(null);
  const subsRef = useRef([]);

  const addAlert = useCallback((severity, msg) => {
    setAlerts(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), severity, msg }, ...prev].slice(0, 50));
  }, []);

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  // Demo Mode Simulation
  useEffect(() => {
    if (mode !== 'demo') return;

    setConnected(true);
    setMappingStatus('Mapping');
    setPointColors(null); 
    setLayers([]);
    
    let simAngle = 0;
    let simX = 0;
    let simZ = 0;
    
    const initialPoints = [];
    for(let i=0; i<5000; i++) {
      initialPoints.push(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 2, 
        (Math.random() - 0.5) * 10
      );
    }
    setPointCloud(new Float32Array(initialPoints));
    setStats(s => ({...s, points: 5000, coverage: 5000 * 0.01}));

    const interval = setInterval(() => {
      simAngle += (Math.random() - 0.5) * 0.5;
      simX += Math.cos(simAngle) * 0.1;
      simZ += Math.sin(simAngle) * 0.1;
      
      const newPose = { x: simX, y: 0, z: simZ, yaw: simAngle };
      setRobotPose(newPose);
      
      setPath(p => [...p, {x: simX, y: 0, z: simZ}]);
      
      setPointCloud(prev => {
        const newPts = new Float32Array(prev.length + 30);
        newPts.set(prev);
        for(let i=0; i<10; i++) {
          newPts[prev.length + i*3] = simX + (Math.random() - 0.5) * 3;
          newPts[prev.length + i*3 + 1] = (Math.random()) * 2;
          newPts[prev.length + i*3 + 2] = simZ + (Math.random() - 0.5) * 3;
        }
        setStats(s => ({...s, points: newPts.length / 3, coverage: (newPts.length/3) * 0.01 }));
        return newPts;
      });

      setBattery(b => Math.max(0, b - 0.05));

      if (Math.random() < 0.01) {
        addAlert('warning', 'Low confidence in loop closure');
      }

    }, 100); 

    return () => clearInterval(interval);
  }, [mode, addAlert]);

  // Clean up function for ROS
  const disconnectROS = useCallback(() => {
    subsRef.current.forEach(sub => sub.unsubscribe());
    subsRef.current = [];
    if (rosRef.current) {
      rosRef.current.close();
      rosRef.current = null;
    }
    setConnected(false);
  }, []);

  const setupRosSubscribers = (ros) => {
    // 1. Subscribe to Odometry
    const odomSub = new ROSLIB.Topic({
      ros: ros,
      name: '/odom',
      messageType: 'nav_msgs/Odometry'
    });
    odomSub.subscribe((message) => {
      const pos = message.pose.pose.position;
      const q = message.pose.pose.orientation;
      // Convert quaternion to Euler yaw
      const yaw = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));
      setRobotPose({
        x: pos.x,
        y: pos.y,
        z: pos.z || 0.0,
        yaw: yaw
      });
      setPath(prev => [...prev, { x: pos.x, y: pos.y, z: pos.z || 0.0 }]);
    });
    subsRef.current.push(odomSub);

    // 2. Subscribe to BatteryState
    const batterySub = new ROSLIB.Topic({
      ros: ros,
      name: '/battery_state',
      messageType: 'sensor_msgs/BatteryState'
    });
    batterySub.subscribe((message) => {
      setBattery(message.percentage * 100);
    });
    subsRef.current.push(batterySub);

    // 3. Subscribe to 3D Point Cloud
    const cloudSub = new ROSLIB.Topic({
      ros: ros,
      name: '/cloud_map',
      messageType: 'sensor_msgs/PointCloud2'
    });
    cloudSub.subscribe((message) => {
      const { positions, colors, count } = parsePointCloud2(message);
      setPointCloud(positions);
      if (colors) {
        setPointColors(colors);
      }
      setStats(s => ({ ...s, points: count, coverage: count * 0.01 }));
    });
    subsRef.current.push(cloudSub);
  };

  const connect = (newMode, newUrl) => {
    disconnectROS();
    setMode(newMode);
    setUrl(newUrl);
    
    if (newMode === 'demo') {
      addAlert('info', 'Switched to Demo Mode');
      setLoadedFileName('');
      setScanMetadata(null);
      setConnected(true);
    } else if (newMode === 'rosbridge') {
      addAlert('info', `Connecting to Rosbridge WebSocket at ${newUrl}...`);
      try {
        const ros = new ROSLIB.Ros({ url: newUrl });
        rosRef.current = ros;
        
        ros.on('connection', () => {
          setConnected(true);
          setMappingStatus('Connected');
          addAlert('success', 'Connected to Rosbridge WebSocket server!');
          setupRosSubscribers(ros);
        });
        
        ros.on('error', (err) => {
          setConnected(false);
          addAlert('error', 'Rosbridge connection error! Check if stack is running.');
        });
        
        ros.on('close', () => {
          setConnected(false);
          setMappingStatus('Disconnected');
          addAlert('warning', 'Disconnected from Rosbridge WebSocket.');
        });
      } catch (e) {
        addAlert('error', `Connection setup failed: ${e.message}`);
      }
    } else if (newMode !== 'file') {
      addAlert('warning', `Connection to ${newMode} is not supported in this stack.`);
    }
  };

  // Sync zones with PostgreSQL database if connected via rosbridge
  const updateZones = useCallback(async (newZonesOrFn) => {
    setZones(prev => {
      const next = typeof newZonesOrFn === 'function' ? newZonesOrFn(prev) : newZonesOrFn;
      
      if (mode === 'rosbridge') {
        const added = next.filter(nz => !prev.some(pz => pz.id === nz.id));
        const deleted = prev.filter(pz => !next.some(nz => nz.id === pz.id));
        
        // Sync additions
        added.forEach(async (z) => {
          const w = Math.abs(z.end.x - z.start.x);
          const d = Math.abs(z.end.z - z.start.z);
          const cx = (z.start.x + z.end.x) / 2;
          const cz = (z.start.z + z.end.z) / 2;
          
          try {
            const res = await fetch('http://localhost:8000/api/zones', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                robot_id: 'amr_001',
                name: z.name,
                zone_type: z.zone_type,
                color: z.color,
                position: { x: cx, y: 0.0, z: cz },
                dimensions: { width: w, height: 4.0, depth: d },
                created_by: 'dashboard'
              })
            });
            if (res.ok) {
              addAlert('success', `Zone "${z.name}" persisted to PostgreSQL.`);
            }
          } catch (err) {
            console.error("Failed to persist zone:", err);
          }
        });
        
        // Sync deletions
        deleted.forEach(async (z) => {
          try {
            const res = await fetch(`http://localhost:8000/api/zones/${z.id}`, {
              method: 'DELETE'
            });
            if (res.ok) {
              addAlert('info', `Zone "${z.name}" deleted from PostgreSQL.`);
            }
          } catch (err) {
            console.error("Failed to delete zone:", err);
          }
        });
      } else {
        localStorage.setItem('robot-zones', JSON.stringify(next));
      }
      return next;
    });
  }, [mode, addAlert]);

  // Load zones on startup when connected
  useEffect(() => {
    if (mode === 'rosbridge' && connected) {
      fetch('http://localhost:8000/api/zones')
        .then(res => res.json())
        .then(data => {
          const clientZones = data.map(z => {
            const w = z.dimensions.width;
            const d = z.dimensions.depth;
            const cx = z.position.x;
            const cz = z.position.z;
            return {
              id: z.id,
              name: z.name,
              zone_type: z.zone_type,
              color: z.color,
              start: { x: cx - w/2, z: cz - d/2 },
              end: { x: cx + w/2, z: cz + d/2 }
            };
          });
          setZones(clientZones);
          addAlert('success', `Fetched ${clientZones.length} zones from PostgreSQL.`);
        })
        .catch(err => {
          console.error("Could not fetch zones from DB", err);
        });
    }
  }, [mode, connected, addAlert]);

  // Keyboard Driving Control Loop (WASD keys)
  useEffect(() => {
    if (!connected || mode !== 'rosbridge' || !rosRef.current) return;
    
    const cmdVelTopic = new ROSLIB.Topic({
      ros: rosRef.current,
      name: '/cmd_vel',
      messageType: 'geometry_msgs/Twist'
    });
    
    const activeKeys = new Set();
    
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        activeKeys.add(key);
      }
    };
    
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (activeKeys.has(key)) {
        activeKeys.delete(key);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const intervalId = setInterval(() => {
      let linear = 0.0;
      let angular = 0.0;
      
      if (activeKeys.has('w')) linear += 0.5;
      if (activeKeys.has('s')) linear -= 0.5;
      if (activeKeys.has('a')) angular += 0.8;
      if (activeKeys.has('d')) angular -= 0.8;
      
      if (linear !== 0.0 || angular !== 0.0) {
        cmdVelTopic.publish({
          linear: { x: linear, y: 0.0, z: 0.0 },
          angular: { x: 0.0, y: 0.0, z: angular }
        });
      }
    }, 100); // 10 Hz cmd_vel publication
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(intervalId);
    };
  }, [connected, mode]);

  // Clean up on unmount
  useEffect(() => {
    return () => disconnectROS();
  }, [disconnectROS]);

  // Recompute visible points when layers change
  useEffect(() => {
    if (mode === 'file' && rawPointCloud && rawPointLayers && layers.length > 0) {
      const activeLayerIds = new Set(layers.filter(l => l.active).map(l => l.id));
      
      // Count visible points first
      let visibleCount = 0;
      for (let i = 0; i < rawPointLayers.length; i++) {
        if (activeLayerIds.has(rawPointLayers[i])) visibleCount++;
      }
      
      const newPositions = new Float32Array(visibleCount * 3);
      const newColors = rawPointColors ? new Float32Array(visibleCount * 3) : null;
      
      let idx = 0;
      for (let i = 0; i < rawPointLayers.length; i++) {
        if (activeLayerIds.has(rawPointLayers[i])) {
          newPositions[idx * 3] = rawPointCloud[i * 3];
          newPositions[idx * 3 + 1] = rawPointCloud[i * 3 + 1];
          newPositions[idx * 3 + 2] = rawPointCloud[i * 3 + 2];
          
          if (newColors) {
            newColors[idx * 3] = rawPointColors[i * 3];
            newColors[idx * 3 + 1] = rawPointColors[i * 3 + 1];
            newColors[idx * 3 + 2] = rawPointColors[i * 3 + 2];
          }
          idx++;
        }
      }
      
      setPointCloud(newPositions);
      setPointColors(newColors);
      setStats(s => ({ ...s, points: visibleCount }));
    }
  }, [layers, mode, rawPointCloud, rawPointColors, rawPointLayers]);

  const toggleLayer = (id) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, active: !l.active } : l));
  };

  const loadPLYFile = async (file) => {
    if (!file) return;
    
    setMode('file');
    setConnected(true);
    setMappingStatus('Viewing File');
    setIsParsing(true);
    setLoadedFileName(file.name);
    addAlert('info', `Loading file: ${file.name}`);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (ext === 'json') {
        const text = await file.text();
        const data = JSON.parse(text);
        
        let count = 0;
        let positions = null;
        let colors = null;
        
        if (data.metadata && data.x) {
          // New format from user request
          count = data.metadata.pointCount || data.x.length;
          positions = new Float32Array(count * 3);
          colors = new Float32Array(count * 3);
          
          setScanMetadata(data.metadata);
          
          const zMin = data.metadata.bounds.minZ;
          const zMax = data.metadata.bounds.maxZ;
          
          const heightToColor = (t) => {
            const stops = [
              [0.00, [0.10, 0.20, 0.80]],  // deep blue
              [0.25, [0.00, 0.75, 0.90]],  // cyan
              [0.50, [0.10, 0.85, 0.30]],  // green
              [0.75, [1.00, 0.85, 0.00]],  // yellow
              [1.00, [1.00, 0.20, 0.05]],  // red
            ];
            for (let i = 0; i < stops.length - 1; i++) {
              const [t0, c0] = stops[i];
              const [t1, c1] = stops[i + 1];
              if (t <= t1) {
                const f = (t - t0) / (t1 - t0);
                return c0.map((v, j) => v + f * (c1[j] - v));
              }
            }
            return stops[stops.length - 1][1];
          };

          for (let i = 0; i < count; i++) {
            positions[i*3] = data.x[i];
            positions[i*3+1] = data.z[i]; // Z up
            positions[i*3+2] = data.y[i];
            
            const t = Math.max(0, Math.min(1, (data.z[i] - zMin) / (zMax - zMin || 1)));
            const [r, g, b] = heightToColor(t);
            colors[i*3] = r;
            colors[i*3+1] = g;
            colors[i*3+2] = b;
          }
        } else {
          // Old format from python script
          count = data.metadata.pointCount;
          positions = new Float32Array(count * 3);
          colors = (data.points.r && data.points.r.length > 0) ? new Float32Array(count * 3) : null;
          
          setScanMetadata(data.metadata);

          for (let i = 0; i < count; i++) {
            positions[i*3] = data.points.x[i];
            positions[i*3+1] = data.points.y[i];
            positions[i*3+2] = data.points.z[i];
            if (colors) {
              colors[i*3] = data.points.r[i] / 255.0;
              colors[i*3+1] = data.points.g[i] / 255.0;
              colors[i*3+2] = data.points.b[i] / 255.0;
            }
          }
        }
        
        setRawPointCloud(positions);
        setRawPointColors(colors);
        
        if (data.layers) {
          setLayers(data.layers);
          const layersArray = new Uint8Array(count);
          setRawPointLayers(layersArray);
        } else {
          setLayers([]);
          setPointCloud(positions);
          setPointColors(colors);
        }
        
        setStats(s => ({ ...s, points: count, coverage: count * 0.01 }));
        addAlert('success', `Loaded ${count.toLocaleString()} points.`);
        setIsParsing(false);
        
      } else if (ext === 'las' || ext === 'laz') {
        const arrayBuffer = await file.arrayBuffer();
        setTimeout(async () => {
          try {
            const { positions, colors, layersArray, vertexCount } = await parseLAS(arrayBuffer, ext === 'laz');
            
            setRawPointCloud(positions);
            setRawPointColors(colors);
            setRawPointLayers(layersArray);
            
            const uniqueLayers = new Set(layersArray);
            const newLayers = Array.from(uniqueLayers).map(id => ({
              id,
              name: `Classification ${id}`,
              color: [Math.random()*255, Math.random()*255, Math.random()*255],
              active: true
            }));
            
            if (newLayers.length > 1) {
              setLayers(newLayers);
            } else {
              setLayers([]);
              setPointCloud(positions);
              setPointColors(colors);
            }
            
            setStats(s => ({ ...s, points: vertexCount, coverage: vertexCount * 0.01 }));
            addAlert('success', `Loaded ${vertexCount.toLocaleString()} points.`);
            setIsParsing(false);
          } catch (err) {
            console.error(err);
            addAlert('error', `Failed to parse LAS: ${err.message}`);
            setIsParsing(false);
            setMode('demo');
          }
        }, 50);
        
      } else {
        const arrayBuffer = await file.arrayBuffer();
        setTimeout(() => {
          try {
            const { positions, colors, vertexCount } = parsePLY(arrayBuffer);
            setRawPointCloud(positions);
            setRawPointColors(colors);
            setLayers([]); 
            setPointCloud(positions);
            setPointColors(colors);
            setStats(s => ({ ...s, points: vertexCount, coverage: vertexCount * 0.01 }));
            addAlert('success', `Successfully loaded ${vertexCount.toLocaleString()} points.`);
            setIsParsing(false);
          } catch (err) {
            console.error(err);
            addAlert('error', `Failed to parse PLY: ${err.message}`);
            setIsParsing(false);
            setMode('demo');
          }
        }, 50);
      }
    } catch (err) {
      addAlert('error', `Failed to read file: ${err.message}`);
      setIsParsing(false);
      setMode('demo');
    }
  };

  const resetToDemo = () => {
    connect('demo', url);
  };

  return {
    connected,
    mode,
    url,
    connect,
    robotPose,
    battery,
    mappingStatus,
    pointCloud,
    pointColors,
    path,
    stats,
    alerts,
    addAlert,
    removeAlert,
    loadPLYFile,
    resetToDemo,
    isParsing,
    loadedFileName,
    scanMetadata,
    layers,
    toggleLayer,
    zones,
    setZones: updateZones
  };
}
