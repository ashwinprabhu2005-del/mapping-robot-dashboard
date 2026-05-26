import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

/* ── Animated robot body ── */
function Robot({ position }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 0.3 + Math.sin(clock.elapsedTime * 1.5) * 0.04;
      ref.current.rotation.y = clock.elapsedTime * 0.4;
    }
  });
  return (
    <group ref={ref} position={position}>
      {/* Body */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.25, 0.55]} />
        <meshStandardMaterial color="#0d1829" emissive="#003355" emissiveIntensity={0.4} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Cyan sensor ring */}
      <mesh position={[0, 0.18, 0]}>
        <torusGeometry args={[0.22, 0.025, 8, 32]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2} />
      </mesh>
      {/* Eyes */}
      {[-0.1, 0.1].map((x, i) => (
        <mesh key={i} position={[x, 0.04, 0.28]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={3} />
        </mesh>
      ))}
      {/* Wheels */}
      {[[-0.24, -0.12, 0.2], [0.24, -0.12, 0.2], [-0.24, -0.12, -0.2], [0.24, -0.12, -0.2]].map((pos, i) => (
        <mesh key={i} position={pos} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
          <meshStandardMaterial color="#1a2a3a" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/* ── LiDAR sweep ring ── */
function LidarSweep({ position }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 1.8;
  });
  return (
    <group ref={ref} position={position}>
      <mesh>
        <torusGeometry args={[1.2, 0.008, 4, 64]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={1.5} transparent opacity={0.6} />
      </mesh>
      <mesh>
        <torusGeometry args={[2.2, 0.006, 4, 64]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.8} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/* ── Point cloud (mapped environment) ── */
function PointCloud({ count = 1800 }) {
  const positions = useMemo(() => {
    const arr = [];
    const rng = () => (Math.random() - 0.5);

    // Floor scatter
    for (let i = 0; i < count * 0.4; i++) {
      arr.push(rng() * 9, 0.01, rng() * 9);
    }
    // Wall points
    const wallH = () => Math.random() * 2;
    for (let i = 0; i < count * 0.15; i++) arr.push(-4.5, wallH(), rng() * 9);
    for (let i = 0; i < count * 0.15; i++) arr.push( 4.5, wallH(), rng() * 9);
    for (let i = 0; i < count * 0.15; i++) arr.push(rng() * 9, wallH(), -4.5);
    for (let i = 0; i < count * 0.15; i++) arr.push(rng() * 9, wallH(),  4.5);

    return new Float32Array(arr);
  }, [count]);

  const colors = useMemo(() => {
    const c = new Float32Array((positions.length / 3) * 3);
    for (let i = 0; i < c.length / 3; i++) {
      const h = positions[i * 3 + 1]; // height
      c[i * 3]     = 0 + h * 0.1;
      c[i * 3 + 1] = 0.6 + h * 0.2;
      c[i * 3 + 2] = 1.0;
    }
    return c;
  }, [positions]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} vertexColors sizeAttenuation transparent opacity={0.75} />
    </points>
  );
}

/* ── Room walls (wireframe) ── */
function Room() {
  const mat = <meshStandardMaterial color="#0a1f35" emissive="#001122" emissiveIntensity={0.3} transparent opacity={0.5} side={THREE.BackSide} />;
  return (
    <mesh receiveShadow>
      <boxGeometry args={[10, 3, 10]} />
      {mat}
    </mesh>
  );
}

/* ── Wall edge lines ── */
function RoomEdges() {
  const color = "#1e3352";
  const pts = (x1,y1,z1,x2,y2,z2) => [new THREE.Vector3(x1,y1,z1), new THREE.Vector3(x2,y2,z2)];
  const edges = [
    pts(-5,0,-5, 5,0,-5), pts(5,0,-5, 5,0,5), pts(5,0,5,-5,0,5), pts(-5,0,5,-5,0,-5),
    pts(-5,3,-5, 5,3,-5), pts(5,3,-5, 5,3,5), pts(5,3,5,-5,3,5), pts(-5,3,5,-5,3,-5),
    pts(-5,0,-5,-5,3,-5), pts(5,0,-5,5,3,-5), pts(5,0,5,5,3,5), pts(-5,0,5,-5,3,5),
  ];
  return (
    <>
      {edges.map((points, i) => (
        <Line key={i} points={points} color={color} lineWidth={1} />
      ))}
    </>
  );
}

/* ── Obstacle boxes ── */
function Obstacle({ position, size, color = "#0f2a44" }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive="#001833" emissiveIntensity={0.5} metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

/* ── Animated path trail ── */
function PathTrail() {
  const pathPoints = useMemo(() => [
    new THREE.Vector3(0, 0.05, 0),
    new THREE.Vector3(1, 0.05, 0.5),
    new THREE.Vector3(2, 0.05, -0.5),
    new THREE.Vector3(2.5, 0.05, -2),
    new THREE.Vector3(1, 0.05, -3),
    new THREE.Vector3(-1, 0.05, -2.5),
    new THREE.Vector3(-2, 0.05, -1),
    new THREE.Vector3(-1.5, 0.05, 1),
  ], []);
  return <Line points={pathPoints} color="#22d3a5" lineWidth={2} dashed dashSize={0.15} gapSize={0.08} />;
}

/* ── Waypoint markers ── */
function Waypoint({ position, label }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.3 + Math.sin(clock.elapsedTime * 2 + position[0]) * 0.06;
  });
  return (
    <group ref={ref} position={position}>
      <mesh>
        <coneGeometry args={[0.1, 0.3, 6]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.5} />
      </mesh>
      <Text position={[0, 0.4, 0]} fontSize={0.22} color="#fbbf24" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

/* ── Coordinate axes ── */
function Axes() {
  return (
    <>
      <Line points={[new THREE.Vector3(0,0.02,0), new THREE.Vector3(1,0.02,0)]} color="#f43f5e" lineWidth={2} />
      <Line points={[new THREE.Vector3(0,0.02,0), new THREE.Vector3(0,1.02,0)]} color="#22d3a5" lineWidth={2} />
      <Line points={[new THREE.Vector3(0,0.02,0), new THREE.Vector3(0,0.02,-1)]} color="#3b82f6" lineWidth={2} />
    </>
  );
}

/* ── Main Scene ── */
function Scene({ robotPos }) {
  const rp = robotPos ? [robotPos.x, 0.3, robotPos.y] : [0, 0.3, 0];
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 2.5, 0]} intensity={1.5} color="#0077aa" distance={12} />
      <pointLight position={[rp[0], rp[1] + 0.5, rp[2]]} intensity={3} color="#00d4ff" distance={4} />
      <spotLight position={[-4, 4, -4]} angle={0.5} intensity={1} color="#003366" castShadow />

      <Room />
      <RoomEdges />
      <PointCloud />
      <PathTrail />

      <Grid
        args={[10, 10]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#1e3352"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#2a4a72"
        fadeDistance={12}
        fadeStrength={1}
        position={[0, 0.001, 0]}
      />

      <Obstacle position={[-3, 0.4, -2]} size={[1, 0.8, 0.6]} />
      <Obstacle position={[3,  0.3, 2]}  size={[0.6, 0.6, 1.2]} />
      <Obstacle position={[-2, 0.5, 3]}  size={[1.2, 1, 0.5]} />
      <Obstacle position={[2.5, 0.2, -3]} size={[0.8, 0.4, 0.8]} />

      <Waypoint position={[2, 0.5, -2.5]} label="WP1" />
      <Waypoint position={[-1.5, 0.5, 2.5]} label="WP2" />

      <Robot position={rp} />
      <LidarSweep position={[rp[0], rp[1] + 0.15, rp[2]]} />

      <Axes />

      <OrbitControls
        enablePan enableZoom enableRotate
        minDistance={2} maxDistance={14}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

/* ── Exported Component ── */
export default function Map3D({ robotState }) {
  return (
    <div style={{ position:'relative', height:'100%', width:'100%',
      borderRadius:'var(--radius-md)', overflow:'hidden',
      border:'1px solid var(--border)', background:'var(--bg-base)' }}>

      {/* Corner label */}
      <div style={{ position:'absolute', top:'10px', left:'12px', zIndex:10,
        fontSize:'10px', fontWeight:600, letterSpacing:'0.1em', color:'var(--cyan)',
        background:'rgba(7,13,26,0.8)', padding:'4px 10px', borderRadius:'4px',
        border:'1px solid rgba(0,212,255,0.2)', backdropFilter:'blur(4px)' }}>
        SLAM 3D MAP · LIVE
      </div>

      {/* Position overlay removed */}

      {/* Legend */}
      <div style={{ position:'absolute', top:'10px', right:'12px', zIndex:10,
        fontSize:'10px', color:'var(--text-muted)',
        background:'rgba(7,13,26,0.8)', padding:'6px 10px', borderRadius:'4px',
        border:'1px solid var(--border)', backdropFilter:'blur(4px)', lineHeight:1.8 }}>
        <div><span style={{ color:'#f43f5e' }}>■</span> X-axis</div>
        <div><span style={{ color:'#22d3a5' }}>■</span> Y-axis</div>
        <div><span style={{ color:'#3b82f6' }}>■</span> Z-axis</div>
        <div><span style={{ color:'#22d3a5' }}>—</span> Path</div>
        <div><span style={{ color:'#fbbf24' }}>▲</span> Waypoints</div>
      </div>

      <Canvas
        shadows
        camera={{ position: [6, 5, 7], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(180deg, #060d1a 0%, #0a1525 100%)' }}
      >
        <Scene robotPos={robotState?.position} />
      </Canvas>
    </div>
  );
}
