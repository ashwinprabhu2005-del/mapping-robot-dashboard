import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Line, Box, Html } from '@react-three/drei';
import * as THREE from 'three';

// Component for the Robot Path Trail
function PathTrail({ path }) {
  const points = useMemo(() => path.map(p => new THREE.Vector3(p.x, p.y + 0.05, p.z)), [path]);
  
  if (points.length < 2) return null;
  return (
    <Line
      points={points}
      color="var(--accent-cyan)"
      lineWidth={2}
      dashed={false}
    />
  );
}

// Component for the Point Cloud
function PointCloudRenderer({ pointCloud, pointColors, mode, pointSize, cameraView, metadata }) {
  const geometryRef = useRef();
  const { camera, controls } = useThree();
  
  useEffect(() => {
    if (geometryRef.current && pointCloud.length > 0) {
      const geometry = geometryRef.current;
      geometry.setAttribute('position', new THREE.BufferAttribute(pointCloud, 3));
      
      if (pointColors) {
        geometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));
      } else {
        geometry.deleteAttribute('color');
      }
      
      geometry.attributes.position.needsUpdate = true;
      if (geometry.attributes.color) geometry.attributes.color.needsUpdate = true;
      
      // Auto-center geometry
      geometry.computeBoundingBox();
      geometry.center();
    }
  }, [pointCloud, pointColors]);

  // Handle camera view changes and initial load auto-fit
  useEffect(() => {
    if (mode === 'file' && pointCloud.length > 0) {
      let span = 34; // default assumption
      if (metadata && metadata.bounds) {
        const bounds = metadata.bounds;
        span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
      } else if (geometryRef.current && geometryRef.current.boundingBox) {
        const bb = geometryRef.current.boundingBox;
        span = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
      }

      if (cameraView.startsWith('top')) {
        camera.position.set(0, span * 1.2, 0.1);
      } else if (cameraView.startsWith('front')) {
        camera.position.set(0, 2, span * 1.2);
      } else {
        // Isometric / Default view
        camera.position.set(span * 0.4, span * 0.5, span * 0.4);
      }
      
      camera.lookAt(0, 0, 0);
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
    }
  }, [cameraView, mode, metadata, camera, controls, pointCloud.length]);

  return (
    <points>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial 
        size={pointSize || (mode === 'file' ? 0.03 : 0.05)} 
        color={pointColors ? 0xffffff : "#e2e8f0"} 
        vertexColors={!!pointColors}
        sizeAttenuation={true} 
      />
    </points>
  );
}

// Component for Annotated Zones
function Zones({ zones }) {
  return (
    <>
      {zones.map((zone) => {
        const width = Math.abs(zone.end.x - zone.start.x);
        const depth = Math.abs(zone.end.z - zone.start.z);
        const centerX = (zone.start.x + zone.end.x) / 2;
        const centerZ = (zone.start.z + zone.end.z) / 2;
        
        // Zone spans from Y = -2 to Y = 2 (height 4)
        return (
          <group key={zone.id} position={[centerX, 0, centerZ]}>
            <Box args={[width, 4, depth]}>
              <meshBasicMaterial color={zone.color} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
            </Box>
            <Box args={[width, 4, depth]}>
              <meshBasicMaterial color={zone.color} wireframe />
            </Box>
            <Html position={[0, 2.2, 0]} center style={{ pointerEvents: 'none' }}>
              <div style={{ 
                background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px', 
                color: zone.color, fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${zone.color}`,
                whiteSpace: 'nowrap'
              }}>
                {zone.name}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

export function MapViewer({ pointCloud, pointColors, path, robotPose, zones, setZones, isDrawingZone, setIsDrawingZone, isParsing, mode, pointSize, cameraView, metadata }) {
  const [drawingStart, setDrawingStart] = useState(null);
  const [drawingCurrent, setDrawingCurrent] = useState(null);

  const handlePointerDown = (e) => {
    if (!isDrawingZone) return;
    e.stopPropagation();
    setDrawingStart(e.point);
    setDrawingCurrent(e.point);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingZone || !drawingStart) return;
    e.stopPropagation();
    setDrawingCurrent(e.point);
  };

  const handlePointerUp = (e) => {
    if (!isDrawingZone || !drawingStart) return;
    e.stopPropagation();
    
    // Minimum size check to prevent accidental clicks
    const width = Math.abs(drawingCurrent.x - drawingStart.x);
    const depth = Math.abs(drawingCurrent.z - drawingStart.z);
    
    if (width > 0.5 && depth > 0.5) {
      setZones(prev => [...prev, {
        id: Date.now(),
        ...isDrawingZone,
        start: { x: drawingStart.x, z: drawingStart.z },
        end: { x: drawingCurrent.x, z: drawingCurrent.z }
      }]);
    }
    
    setDrawingStart(null);
    setDrawingCurrent(null);
    setIsDrawingZone(null); // Finish drawing
  };

  return (
    <div className="main-viewer" style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {isDrawingZone && (
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'var(--warning-amber)', color: '#000', padding: '5px 15px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
          DRAWING MODE: Click and drag on the floor to draw zone "{isDrawingZone.name}".
        </div>
      )}

      {mode === 'file' && pointCloud.length > 0 && (
        <div style={{
          position: 'absolute', top: '15px', left: '15px', zIndex: 10,
          background: 'rgba(10, 12, 16, 0.8)', padding: '10px', borderRadius: '6px',
          border: '1px solid var(--panel-border)', display: 'flex', gap: '10px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            width: '12px', height: '150px', borderRadius: '4px',
            background: 'linear-gradient(to top, #1a33cc 0%, #00bfff 25%, #1aed4d 50%, #ffdf00 75%, #ff330d 100%)'
          }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#fff', fontSize: '0.75rem', fontFamily: 'monospace', height: '150px' }}>
            <span>+1.8m</span>
            <span>+0.5m</span>
            <span>-0.8m</span>
            <span>-2.0m</span>
            <span>-4.8m</span>
          </div>
        </div>
      )}

      {isParsing && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--panel-border)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: '20px', color: 'var(--accent-cyan)', fontSize: '1.2rem', fontFamily: 'monospace' }}>Loading museum scan... please wait</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <Canvas camera={{ position: [0, 15, 15], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        {/* Orbit Controls (disable when drawing) */}
        <OrbitControls makeDefault enabled={!isDrawingZone} />

        {/* Floor Plane for raycasting interactions */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0, 0]} 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          visible={false}
        >
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial />
        </mesh>

        {/* Grid and Axes */}
        <Grid args={[100, 100]} cellColor="var(--panel-border)" sectionColor="var(--text-muted)" sectionSize={5} fadeDistance={60} />
        <axesHelper args={[5]} />

        {/* Render Map Elements */}
        <PointCloudRenderer pointCloud={pointCloud} pointColors={pointColors} mode={mode} pointSize={pointSize} cameraView={cameraView} metadata={metadata} />
        {mode !== 'file' && <PathTrail path={path} />}
        <Zones zones={zones} />

        {/* Temporary Drawing Box */}
        {drawingStart && drawingCurrent && (
          <group position={[
            (drawingStart.x + drawingCurrent.x) / 2, 
            0.5, 
            (drawingStart.z + drawingCurrent.z) / 2
          ]}>
            <Box args={[
              Math.abs(drawingCurrent.x - drawingStart.x), 
              1, 
              Math.abs(drawingCurrent.z - drawingStart.z)
            ]}>
              <meshBasicMaterial color={isDrawingZone.color} transparent opacity={0.5} />
            </Box>
          </group>
        )}

        {/* Robot Marker */}
        {mode !== 'file' && (
          <group position={[robotPose.x, 0.5, robotPose.z]} rotation={[0, -robotPose.yaw, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              {/* simple cone for heading */}
              <coneGeometry args={[0.3, 1, 8]} />
              <meshBasicMaterial color="var(--success-green)" />
            </mesh>
            <pointLight color="var(--success-green)" distance={5} intensity={2} />
          </group>
        )}
      </Canvas>
    </div>
  );
}
