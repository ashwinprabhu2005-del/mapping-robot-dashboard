// ANNOTATION: Fully integrated Live ROS 3D Feed, Live Camera, and Manual WASD Teleop Override controls.
// Features keyboard capture for WASD navigation, an interactive select menu for active camera topics, 
// simulated offline modes, telemetry meters (Position, Yaw, Battery, IMU diagnostics), and active alert banners.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ROSLIB from 'roslib';
import { Play, Square, RotateCcw, Maximize2, Pause } from 'lucide-react';
import LiveROSViewer from './LiveROSViewer';

export default function LiveFeedTab({ selectedMap }) {
  const [rosConnection, setRosConnection] = useState(null);
  const [cameraTopic, setCameraTopic] = useState('/camera/image_raw');
  const [wasdEnabled, setWasdEnabled] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [battery, setBattery] = useState(86);
  const [position, setPosition] = useState({ x: 1.44, y: 0.00, z: -19.33 });
  const [orientationQ, setOrientationQ] = useState({ x: 0, y: 0, z: 0, w: 1 });
  const [heading, setHeading] = useState(-149.9);
  const [robotPath, setRobotPath] = useState([]);
  const [imu, setImu] = useState({ roll: 0, pitch: 0, yaw: 0, accelX: 0, accelY: 0, accelZ: 0 });
  const [fps, setFps] = useState(30);
  const [robotHealth, setRobotHealth] = useState('Optimal');
  const [cmdVelTopic, setCmdVelTopic] = useState(null);
  const [activeKeys, setActiveKeys] = useState({});
  
  // Alerts
  const [alerts, setAlerts] = useState([
    { time: '4:45:49 PM', msg: 'Low confidence in loop closure', type: 'warning' },
    { time: '4:39:03 PM', msg: 'Low confidence in loop closure', type: 'warning' },
    { time: '4:38:17 PM', msg: 'Low confidence in loop closure', type: 'warning' },
    { time: '4:38:16 PM', msg: 'System initialized', type: 'info' }
  ]);

  const ROBOT_IP = window.localStorage.getItem('jetsonIp') || import.meta.env.VITE_ROBOT_IP || '127.0.0.1';
  const simIntervalRef = useRef(null);
  
  // Native MJPEG stream scaled down for performance (removes lag from raw 1080p images)
  const imageSrc = `http://${ROBOT_IP}:8080/stream?topic=${cameraTopic}&width=640&height=480&quality=40`;

  useEffect(() => {
    // Attempt ROS Connection
    let ros;
    let isConnected = false;
    try {
      ros = new ROSLIB.Ros({ url: `ws://${ROBOT_IP}:9090` });
      
      ros.on('connection', () => {
        console.log('Connected to websocket server.');
        isConnected = true;
        setRosConnection(ros);
        setRobotHealth('Nominal');
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
      });

      ros.on('close', () => {
        isConnected = false;
        setRosConnection(null);
      });

      ros.on('error', (error) => {
        console.log('Error connecting to websocket server: ', error);
      });

      // Subscribe to telemetry with throttle rates to prevent network congestion and React render lag
      const odomTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/odom',
        messageType: 'nav_msgs/Odometry',
        throttle_rate: 100 // 10Hz
      });

      odomTopic.subscribe((message) => {
        setPosition({
          x: message.pose.pose.position.x,
          y: message.pose.pose.position.y,
          z: message.pose.pose.position.z
        });
        const q = message.pose.pose.orientation;
        setOrientationQ(q);
        const yaw = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));
        setHeading(yaw * 180 / Math.PI);
      });

      const imuTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/imu/data',
        messageType: 'sensor_msgs/Imu',
        throttle_rate: 100 // 10Hz
      });

      imuTopic.subscribe((message) => {
        const q = message.orientation;
        const roll = Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y));
        const pitch = Math.asin(2 * (q.w * q.y - q.z * q.x));
        const yaw = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));
        
        setImu({
          roll: roll * 180 / Math.PI,
          pitch: pitch * 180 / Math.PI,
          yaw: yaw * 180 / Math.PI,
          accelX: message.linear_acceleration.x,
          accelY: message.linear_acceleration.y,
          accelZ: message.linear_acceleration.z,
        });
      });

      const batteryTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/battery_state',
        messageType: 'sensor_msgs/BatteryState',
        throttle_rate: 1000 // 1Hz
      });

      batteryTopic.subscribe((message) => {
        setBattery(Math.round(message.percentage * 100));
      });

      const pathTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/rtabmap/mapPath',
        messageType: 'nav_msgs/Path',
        throttle_rate: 1000 // Critical: Massive array, only update 1Hz
      });

      pathTopic.subscribe((message) => {
        // Extract array of points [{x, y, z}, ...]
        const pathPoints = message.poses.map(p => ({
          x: p.pose.position.x,
          y: p.pose.position.y,
          z: p.pose.position.z
        }));
        setRobotPath(pathPoints);
      });

      // Wait 2 seconds before falling back to simulation to avoid race conditions
      setTimeout(() => {
        if (!isConnected && !simIntervalRef.current) {
          console.warn('ROSlib timeout, falling back to simulated data');
          simIntervalRef.current = startSimulation();
        }
      }, 2000);
    } catch (e) {
      console.warn('ROSlib error, falling back to simulated data', e);
      if (!simIntervalRef.current) simIntervalRef.current = startSimulation();
    }

    return () => {
      if (ros) ros.close();
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // ── Teleop Control ────────────────────────────────────────────────────────
  useEffect(() => {
    if (rosConnection) {
      const topic = new ROSLIB.Topic({
        ros: rosConnection,
        name: '/cmd_vel',
        messageType: 'geometry_msgs/Twist'
      });
      setCmdVelTopic(topic);
    } else {
      setCmdVelTopic(null);
    }
  }, [rosConnection]);

  const publishTwist = useCallback((linear, angular) => {
    if (cmdVelTopic) {
      const twist = {
        linear: { x: linear, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: angular }
      };
      cmdVelTopic.publish(twist);
    }
  }, [cmdVelTopic]);

  const toggleMapping = (start) => {
    setIsMapping(start);
    if (!rosConnection) return;
    
    rosConnection.getServices((services) => {
      // 1. Simulation Mapping (launch_manager)
      if (services.includes('/start_mapping')) {
        const simSvcName = start ? '/start_mapping' : '/stop_mapping';
        const simSvc = new ROSLIB.Service({ ros: rosConnection, name: simSvcName, serviceType: 'std_srvs/Trigger' });
        simSvc.callService(new ROSLIB.ServiceRequest({}), (res) => {
          console.log(`Called ${simSvcName}:`, res?.message);
        });
      }

      // 2. Physical Robot Mapping (rtabmap pause/resume/reset)
      if (services.includes('/rtabmap/resume')) {
        if (start) {
          if (services.includes('/rtabmap/reset')) {
            // Completely wipe the physical robot's internal map memory before starting
            const resetSvc = new ROSLIB.Service({ ros: rosConnection, name: '/rtabmap/reset', serviceType: 'std_srvs/Empty' });
            resetSvc.callService(new ROSLIB.ServiceRequest({}), () => {
              console.log('Called /rtabmap/reset');
              const resumeSvc = new ROSLIB.Service({ ros: rosConnection, name: '/rtabmap/resume', serviceType: 'std_srvs/Empty' });
              resumeSvc.callService(new ROSLIB.ServiceRequest({}), () => console.log('Called /rtabmap/resume'));
            });
          } else {
            const resumeSvc = new ROSLIB.Service({ ros: rosConnection, name: '/rtabmap/resume', serviceType: 'std_srvs/Empty' });
            resumeSvc.callService(new ROSLIB.ServiceRequest({}), () => console.log('Called /rtabmap/resume'));
          }
        } else {
          const pauseSvc = new ROSLIB.Service({ ros: rosConnection, name: '/rtabmap/pause', serviceType: 'std_srvs/Empty' });
          pauseSvc.callService(new ROSLIB.ServiceRequest({}), () => console.log('Called /rtabmap/pause'));
        }
      }
    });
  };

  // Keyboard listener for WASD
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        setActiveKeys(prev => {
          if (prev[key]) return prev;
          return { ...prev, [key]: true };
        });
      }

      if (!cmdVelTopic || !wasdEnabled) return;
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      
      const speed = 0.5;
      const turn = 1.0;
      switch(key) {
        case 'w': publishTwist(speed, 0); break;
        case 's': publishTwist(-speed, 0); break;
        case 'a': publishTwist(0, turn); break;
        case 'd': publishTwist(0, -turn); break;
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        setActiveKeys(prev => ({ ...prev, [key]: false }));
      }

      if (!cmdVelTopic || !wasdEnabled) return;
      if (['w', 'a', 's', 'd'].includes(key)) {
        publishTwist(0, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [cmdVelTopic, publishTwist, wasdEnabled]);


  const startSimulation = () => {
    let simHeading = -149.9;
    let simPos = { x: 1.44, y: 0.00, z: -19.33 };
    let simPath = [];
    
    return setInterval(() => {
      setBattery(b => Math.max(0, b - 0.1));
      
      simPos.x += 0.005;
      simPos.z += 0.005;
      setPosition({...simPos});
      
      simPath.push({...simPos});
      if (simPath.length > 200) simPath.shift(); // keep trail length manageable
      setRobotPath([...simPath]);
      
      simHeading = (simHeading + 0.5) % 360;
      setHeading(simHeading);
      
      const headingRad = simHeading * Math.PI / 180;
      setOrientationQ({ x: 0, y: Math.sin(headingRad/2), z: 0, w: Math.cos(headingRad/2) });
      
      setImu({
        roll: Math.sin(Date.now() / 1000) * 2,
        pitch: Math.cos(Date.now() / 1000) * 2,
        yaw: simHeading,
        accelX: Math.random() * 0.1,
        accelY: Math.random() * 0.1,
        accelZ: 9.81 + (Math.random() * 0.2 - 0.1)
      });

      setFps(Math.floor(25 + Math.random() * 6));
      setRobotHealth(Math.random() > 0.95 ? 'Warning: Temp High' : 'Optimal');
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0a0c10' }}>
      
      {/* LEFT COLUMN: Telemetry & Controls (Reduced width) */}
      <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--panel-border)', overflowY: 'auto' }}>
        
        {/* TELEMETRY */}
        <div style={{ padding: '10px', borderBottom: '1px solid var(--panel-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>ROVER-01</div>
              <h3 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '12px' }}>TELEMETRY</h3>
            </div>
          </div>
          
          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '1px' }}>STATUS</div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              {isMapping ? 'Mapping Active' : 'Mapping Paused'}
            </div>

            <div style={{ color: 'var(--text-muted)', marginBottom: '1px' }}>POSITION (X, Y, Z)</div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'monospace' }}>
              {position.x.toFixed(2)}, {position.y.toFixed(2)}, {position.z.toFixed(2)}
            </div>
            
            <div style={{ color: 'var(--text-muted)', marginBottom: '1px' }}>HEADING (YAW)</div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'monospace' }}>
              {heading.toFixed(1)}°
            </div>
            
            <div style={{ color: 'var(--text-muted)', marginBottom: '1px' }}>IMU SENSOR</div>
            <div style={{ background: '#11151c', padding: '6px', borderRadius: '4px', marginBottom: '8px', fontFamily: 'monospace', fontSize: '10px', border: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', marginBottom: '3px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>R:</span> <span style={{ color: 'var(--accent-cyan)' }}>{imu.roll.toFixed(1)}°</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>P:</span> <span style={{ color: 'var(--accent-cyan)' }}>{imu.pitch.toFixed(1)}°</span></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Ax:</span> <span style={{ color: '#fff' }}>{Number(imu.accelX).toFixed(1)}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Ay:</span> <span style={{ color: '#fff' }}>{Number(imu.accelY).toFixed(1)}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Az:</span> <span style={{ color: '#fff' }}>{Number(imu.accelZ).toFixed(1)}</span></div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '3px' }}>
              <span>BATTERY LEVEL</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{battery.toFixed(0)}%</span>
            </div>
            <div style={{ background: '#1e2330', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ 
                width: `${battery}%`, height: '100%', 
                background: battery > 50 ? 'var(--success-green)' : (battery > 20 ? 'var(--warning-amber)' : 'var(--error-red)')
              }}></div>
            </div>

            <div style={{ color: 'var(--text-muted)', marginBottom: '1px' }}>ACTIVE SENSOR</div>
            <div style={{ color: '#fff', fontSize: '11px', marginBottom: '8px' }}>
              Depth + LiDAR Fusion
            </div>

            <div style={{ color: 'var(--text-muted)', marginBottom: '1px' }}>ROBOT HEALTH</div>
            <div style={{ color: robotHealth === 'Optimal' ? 'var(--success-green)' : 'var(--warning-amber)', fontSize: '11px', fontWeight: 'bold' }}>
              {robotHealth}
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ padding: '10px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent-cyan)', fontSize: '12px' }}>ROBOT CONTROLS</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: isMapping ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.05)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '8px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px' }} onClick={() => toggleMapping(true)}>
              <Play size={12} /> Start Mapping
            </button>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: !isMapping ? 'rgba(255, 50, 50, 0.2)' : 'rgba(255, 50, 50, 0.05)', border: '1px solid var(--error-red)', color: 'var(--error-red)', padding: '8px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px' }} onClick={() => toggleMapping(false)}>
              <Square size={12} /> Finish Mapping
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer', marginBottom: '12px', background: '#11151c', padding: '8px', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
            <input 
              type="checkbox" 
              checked={wasdEnabled} 
              onChange={(e) => setWasdEnabled(e.target.checked)} 
              style={{ width: '14px', height: '14px', accentColor: 'var(--accent-cyan)' }}
            />
            Enable WASD Control
          </label>
          {wasdEnabled && (
            <div style={{ marginTop: '5px', padding: '8px', background: 'rgba(0, 212, 255, 0.02)', border: '1px solid var(--panel-border)', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '8px', textAlign: 'center', letterSpacing: '0.5px' }}>
                MANUAL OVERRIDE (WASD)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                <button 
                  onMouseDown={() => { publishTwist(0.5, 0); setActiveKeys(prev => ({...prev, w: true})); }} 
                  onMouseUp={() => { publishTwist(0, 0); setActiveKeys(prev => ({...prev, w: false})); }} 
                  onMouseLeave={() => { publishTwist(0, 0); setActiveKeys(prev => ({...prev, w: false})); }}
                  style={{ width: '38px', height: '38px', background: activeKeys['w'] ? 'rgba(0, 212, 255, 0.2)' : '#11151c', boxShadow: activeKeys['w'] ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none', border: '1px solid var(--accent-cyan)', borderRadius: '4px', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.1s' }}>W</button>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button 
                    onMouseDown={() => { publishTwist(0, 1.0); setActiveKeys(prev => ({...prev, a: true})); }} 
                    onMouseUp={() => { publishTwist(0, 0); setActiveKeys(prev => ({...prev, a: false})); }} 
                    onMouseLeave={() => { publishTwist(0, 0); setActiveKeys(prev => ({...prev, a: false})); }}
                    style={{ width: '38px', height: '38px', background: activeKeys['a'] ? 'rgba(0, 212, 255, 0.2)' : '#11151c', boxShadow: activeKeys['a'] ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none', border: '1px solid var(--accent-cyan)', borderRadius: '4px', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.1s' }}>A</button>
                  <button 
                    onMouseDown={() => { publishTwist(-0.5, 0); setActiveKeys(prev => ({...prev, s: true})); }} 
                    onMouseUp={() => { publishTwist(0, 0); setActiveKeys(prev => ({...prev, s: false})); }} 
                    onMouseLeave={() => { publishTwist(0, 0); setActiveKeys(prev => ({...prev, s: false})); }}
                    style={{ width: '38px', height: '38px', background: activeKeys['s'] ? 'rgba(0, 212, 255, 0.2)' : '#11151c', boxShadow: activeKeys['s'] ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none', border: '1px solid var(--accent-cyan)', borderRadius: '4px', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.1s' }}>S</button>
                  <button 
                    onMouseDown={() => { publishTwist(0, -1.0); setActiveKeys(prev => ({...prev, d: true})); }} 
                    onMouseUp={() => { publishTwist(0, 0); setActiveKeys(prev => ({...prev, d: false})); }} 
                    onMouseLeave={() => { publishTwist(0, 0); setActiveKeys(prev => ({...prev, d: false})); }}
                    style={{ width: '38px', height: '38px', background: activeKeys['d'] ? 'rgba(0, 212, 255, 0.2)' : '#11151c', boxShadow: activeKeys['d'] ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none', border: '1px solid var(--accent-cyan)', borderRadius: '4px', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.1s' }}>D</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER COLUMN: 3D Map & Alerts (Priority flex: 1) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* 3D Map Area */}
        <div style={{ flex: 1, position: 'relative', background: '#000000', borderBottom: '1px solid var(--panel-border)' }}>
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--panel-border)', fontSize: '11px' }}>
              LIVE 3D MAP
            </div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: '11px', background: 'rgba(0, 212, 255, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
               {fps * 100} pts shown
            </div>
          </div>
          <LiveROSViewer ros={rosConnection} robotPose={{ position, orientation: orientationQ }} robotPath={robotPath} isMapping={isMapping} />
        </div>

        {/* Alerts Area (Reduced height) */}
        <div style={{ height: '110px', background: '#0d1117', padding: '10px', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--accent-cyan)', fontSize: '12px' }}>SYSTEM ALERTS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {alerts.map((alert, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', background: '#11151c', borderLeft: `3px solid ${alert.type === 'warning' ? 'var(--warning-amber)' : 'var(--accent-cyan)'}`, fontSize: '11px', fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--text-muted)' }}>[{alert.time}]</span>
                <span style={{ color: '#fff' }}>{alert.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Camera Feed (Reduced width) */}
      <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--panel-border)', background: '#0d1117' }}>
        
        <div style={{ padding: '10px', borderBottom: '1px solid var(--panel-border)' }}>
          <h3 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '12px' }}>LIVE CAMERA FEED</h3>
        </div>
        
        <div style={{ padding: '10px', flex: 1 }}>
          <div style={{ position: 'relative', width: '100%', paddingTop: '75%', background: '#000', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
            <img 
              src={imageSrc}
              alt="Robot Camera Stream"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23222%22%20%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23666%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%20font-family%3D%22monospace%22%20font-size%3D%2224%22%3ENO%20VIDEO%20SIGNAL%3C%2Ftext%3E%3C%2Fsvg%3E';
              }}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: 'var(--success-green)', padding: '2px 4px', fontFamily: 'monospace', fontSize: '10px', borderRadius: '4px' }}>
              {fps} FPS
            </div>
            <button style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', padding: '3px', borderRadius: '4px', cursor: 'pointer' }}>
              <Maximize2 size={12} />
            </button>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>CAMERA SOURCE</div>
            <select 
              value={cameraTopic} 
              onChange={(e) => setCameraTopic(e.target.value)}
              style={{ width: '100%', padding: '6px', background: '#11151c', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px' }}
            >
              <option value="/camera/image_raw">/camera/image_raw</option>
              <option value="/camera/color/image_raw">/camera/color/image_raw</option>
              <option value="/camera/depth/image_raw">/camera/depth/image_raw</option>
              <option value="/camera/color_rect/image_raw">/camera/color_rect/image_raw</option>
            </select>
          </div>
        </div>

      </div>
      
    </div>
  );
}
