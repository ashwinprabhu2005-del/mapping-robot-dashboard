// ANNOTATION: Integrated LiveROSViewer component.
// Connects to ROS websockets to dynamically render OccupancyGrids, PointCloud2 frames, and TF transforms in 3D.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as ROSLIB from 'roslib';
import { storageService } from '../utils/storageService';

export default function LiveROSViewer({ ros, robotPose, robotPath, isMapping }) {
  const containerRef = useRef(null);
  const robotMeshRef = useRef(null);
  const pathLineRef = useRef(null);
  const pointsRef = useRef(null);
  const pcGeomRef = useRef(null);
  const pcPositionsRef = useRef(null);
  const pcColorsRef = useRef(null);
  const pcCountRef = useRef(0);
  const sceneRef = useRef(null);
  const mapMeshRef = useRef(null);
  const rendererRef = useRef(null);

  const [dataStatus, setDataStatus] = useState({ map: false, cloud: false, tf: false });
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'

  // ── Save live point cloud snapshot to IndexedDB ─────────────────────────
  const saveMapSnapshot = useCallback(async () => {
    if (!rendererRef.current || !sceneRef.current) return;
    setSaveStatus('saving');
    try {
      // Snapshot the WebGL canvas as a PNG blob
      const canvas = rendererRef.current.domElement;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      const mapId = `live_${Date.now()}`;
      const mapMeta = {
        id: mapId,
        name: `Live Map ${new Date().toLocaleString()}`,
        type: 'live_snapshot',
        size: blob.size,
        dateAdded: Date.now(),
        pointCount: pcCountRef.current,
        source: 'ROS /cloud_map'
      };

      await storageService.saveMapData(mapMeta, blob);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      console.error('Failed to save map:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }, []);

  // ── Export point cloud as GLB ───────────────────────────────────────────
  const exportGLB = useCallback(() => {
    if (!pointsRef.current || pcCountRef.current === 0) {
      alert("No point cloud data to export!");
      return;
    }

    setSaveStatus('exporting');
    const exporter = new GLTFExporter();

    const activeCount = pcCountRef.current;
    const originalGeom = pcGeomRef.current;

    const exportGeom = new THREE.BufferGeometry();
    const pos = originalGeom.attributes.position.array.slice(0, activeCount * 3);
    const col = originalGeom.attributes.color.array.slice(0, activeCount * 3);

    exportGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    exportGeom.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const exportPoints = new THREE.Points(exportGeom, new THREE.PointsMaterial({ size: 0.05, vertexColors: true }));

    exporter.parse(
      exportPoints,
      (gltf) => {
        const blob = new Blob([gltf], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = `cloud_map_${Date.now()}.glb`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setSaveStatus('exported');
        setTimeout(() => setSaveStatus(null), 3000);
      },
      (error) => {
        console.error('An error happened during GLB export:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      },
      { binary: true }
    );
  }, []);
  
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // ── Scene Setup ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.01, 10000);
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); // preserveDrawingBuffer needed for canvas snapshot
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Grid
    const gridHelper = new THREE.GridHelper(40, 40, 0x333333, 0x222222);
    scene.add(gridHelper);
    scene.add(new THREE.AxesHelper(2));

    // ── Robot Mesh ───────────────────────────────────────────────────────────
    const robotGroup = new THREE.Group();
    const robotModelGroup = new THREE.Group();
    robotModelGroup.rotation.y = Math.PI / 2;
    robotGroup.add(robotModelGroup);
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.3, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x003344 })
    );
    robotModelGroup.add(bodyMesh);

    const frontMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xff3366, emissive: 0x440011 })
    );
    frontMesh.position.set(0.35, 0.25, 0);
    robotModelGroup.add(frontMesh);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.16;
    robotModelGroup.add(ring);
    scene.add(robotGroup);
    robotMeshRef.current = robotGroup;

    // ── Path Trail ───────────────────────────────────────────────────────────
    const pathLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 })
    );
    scene.add(pathLine);
    pathLineRef.current = pathLine;

    // ── Point Cloud — geometry allocated once, updated by Web Worker ──────────
    const pcGeom = new THREE.BufferGeometry();
    // Pre-allocate for 5M points (worker sends up to this many)
    const initPos = new Float32Array(5000000 * 3);
    const initCol = new Float32Array(5000000 * 3);
    pcGeom.setAttribute('position', new THREE.BufferAttribute(initPos, 3));
    pcGeom.setAttribute('color', new THREE.BufferAttribute(initCol, 3));
    pcGeom.setDrawRange(0, 0);
    const pcMat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, sizeAttenuation: true });
    const pointCloud = new THREE.Points(pcGeom, pcMat);
    scene.add(pointCloud);
    pointsRef.current = pointCloud;
    pcGeomRef.current = pcGeom;

    // ── ROS Subscriptions ─────────────────────────────────────────────────────
    if (ros) {


      // ─ OccupancyGrid — queue_length:1 prevents 2D map buildup ─
      const mapTopic = new ROSLIB.Topic({
        ros,
        name: '/map',
        messageType: 'nav_msgs/OccupancyGrid',
        throttle_rate: 3000,
        queue_length: 1
      });

      mapTopic.subscribe((msg) => {
        setDataStatus(s => ({ ...s, map: true }));
        try {
          const { width, height, resolution } = msg.info;
          const originX = msg.info.origin.position.x;
          const originY = msg.info.origin.position.y;
          const data = msg.data;
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          const imgData = ctx.createImageData(width, height);
          for (let i = 0; i < data.length; i++) {
            const val = data[i];
            const fi = (height - 1 - Math.floor(i / width)) * width + (i % width);
            const idx = fi * 4;
            if (val === -1) { imgData.data[idx] = 50; imgData.data[idx + 1] = 50; imgData.data[idx + 2] = 80; imgData.data[idx + 3] = 160; }
            else if (val === 0) { imgData.data[idx] = 15; imgData.data[idx + 1] = 20; imgData.data[idx + 2] = 30; imgData.data[idx + 3] = 200; }
            else { imgData.data[idx] = 0; imgData.data[idx + 1] = 200; imgData.data[idx + 2] = 255; imgData.data[idx + 3] = 255; }
          }
          ctx.putImageData(imgData, 0, 0);
          const tex = new THREE.CanvasTexture(canvas);
          if (mapMeshRef.current) { scene.remove(mapMeshRef.current); mapMeshRef.current.geometry.dispose(); }
          const mapW = width * resolution, mapH = height * resolution;
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(mapW, mapH),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
          );
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(originX + mapW / 2, 0.01, -(originY + mapH / 2));
          scene.add(mesh);
          mapMeshRef.current = mesh;
        } catch (e) { console.error('OccupancyGrid decode error:', e); }
      });

      // ─ TF diagnostic ─
      const diagTf = new ROSLIB.Topic({ ros, name: '/tf', messageType: 'tf2_msgs/TFMessage', queue_length: 1 });
      diagTf.subscribe(() => { setDataStatus(s => ({ ...s, tf: true })); diagTf.unsubscribe(); });
    }

    // ── Animation Loop ───────────────────────────────────────────────────────
    let animId;
    function animate() {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [ros]);

  // ── Live Pose Update ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!robotMeshRef.current || !robotPose) return;
    const { position, orientation } = robotPose;
    if (position) robotMeshRef.current.position.set(position.x, position.z, -position.y);
    if (orientation?.w !== undefined)
      robotMeshRef.current.quaternion.set(orientation.x, orientation.z, -orientation.y, orientation.w);

    // Frame attachment logic
    if (pointsRef.current && robotMeshRef.current) {
      if (isMapping) {
        if (pointsRef.current.parent !== sceneRef.current) {
          sceneRef.current.add(pointsRef.current);
          pointsRef.current.position.set(0, 0, 0);
          pointsRef.current.quaternion.identity();
        }
      } else {
        if (pointsRef.current.parent !== robotMeshRef.current) {
          robotMeshRef.current.add(pointsRef.current);
          // Optional camera offset (approximate RealSense mount position)
          pointsRef.current.position.set(0.2, 0.3, 0);
          pointsRef.current.quaternion.identity();
        }
      }
    }
  }, [robotPose, isMapping]);

  // ── Live Path Update ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!pathLineRef.current || !robotPath?.length) return;
    const points = robotPath.map(p => new THREE.Vector3(p.x, p.z, -p.y));
    pathLineRef.current.geometry.setFromPoints(points);
  }, [robotPath]);

  // ── Dynamic Point Cloud Subscription based on Mapping State ──────────────
  useEffect(() => {
    if (!ros) return;

    const pcWorker = new Worker(
      new URL('../workers/pointCloudWorker.js', import.meta.url),
      { type: 'module' }
    );

    let workerBusy = false;
    pcWorker.onmessage = (e) => {
      if (e.data.error) { console.error('Worker:', e.data.error); return; }
      if (!pointsRef.current) return;
      const pcGeom = pointsRef.current.geometry;
      const { positions, colors, count } = e.data;
      pcGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      pcGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
      pcGeom.setDrawRange(0, count);
      pcGeom.computeBoundingSphere();
      pcCountRef.current = count;
      workerBusy = false;
    };

    const cloudTopic = new ROSLIB.Topic({
      ros,
      name: isMapping ? '/cloud_map' : '/camera/points',
      messageType: 'sensor_msgs/PointCloud2',
      throttle_rate: 1000,
      queue_length: 1
    });

    cloudTopic.subscribe((msg) => {
      setDataStatus(s => ({ ...s, cloud: true }));
      if (workerBusy) return;
      workerBusy = true;
      const fields = {};
      msg.fields.forEach(f => { fields[f.name] = f; });
      if (!fields.x || !fields.y || !fields.z) { workerBusy = false; return; }
      pcWorker.postMessage({
        msgData: msg.data,
        pointStep: msg.point_step,
        width: msg.width,
        height: msg.height,
        is_bigendian: msg.is_bigendian,
        hasRGB: !!fields.rgb,
        xOffset: fields.x.offset,
        yOffset: fields.y.offset,
        zOffset: fields.z.offset,
        rgbOffset: fields.rgb ? fields.rgb.offset : 0,
        isMapping: isMapping
      });
    });

    return () => {
      cloudTopic.unsubscribe();
      pcWorker.terminate();
      if (pointsRef.current) {
        pointsRef.current.geometry.setDrawRange(0, 0); // clear on switch
      }
    };
  }, [ros, isMapping]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!ros && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'var(--text-muted)', fontFamily: 'monospace', zIndex: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⬡</div>
          Waiting for ROS Connection...
        </div>
      )}

      {/* Save / Export Buttons */}
      {ros && (
        <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 20, display: 'flex', gap: '10px' }}>
          <button
            onClick={saveMapSnapshot}
            disabled={saveStatus === 'saving'}
            style={{
              background: saveStatus === 'saved' ? '#00ff88' : saveStatus === 'error' ? '#ff4444' : 'rgba(0,212,255,0.15)',
              border: `1px solid ${saveStatus === 'saved' ? '#00ff88' : saveStatus === 'error' ? '#ff4444' : 'var(--accent-cyan)'}`,
              color: saveStatus === 'saved' ? '#000' : saveStatus === 'error' ? '#fff' : 'var(--accent-cyan)',
              padding: '8px 14px', borderRadius: '4px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold',
              transition: 'all 0.3s'
            }}
          >
            {saveStatus === 'saving' ? '⏳ Saving...' : saveStatus === 'saved' ? '✓ Saved to Library!' : saveStatus === 'error' ? '✗ Save Failed' : '💾 Save Map Snapshot'}
          </button>

          <button
            onClick={exportGLB}
            disabled={saveStatus === 'exporting'}
            style={{
              background: saveStatus === 'exported' ? '#00ff88' : 'rgba(255,100,255,0.15)',
              border: `1px solid ${saveStatus === 'exported' ? '#00ff88' : '#ff64ff'}`,
              color: saveStatus === 'exported' ? '#000' : '#ff64ff',
              padding: '8px 14px', borderRadius: '4px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold',
              transition: 'all 0.3s'
            }}
          >
            {saveStatus === 'exporting' ? '⏳ Exporting...' : saveStatus === 'exported' ? '✓ Downloaded!' : '📥 Export Cloud as GLB'}
          </button>
        </div>
      )}

      {/* Diagnostic Overlay */}
      {ros && (
        <div style={{ position: 'absolute', bottom: 15, left: 15, zIndex: 20, background: 'rgba(0,0,0,0.85)', padding: '10px 14px', borderRadius: '6px', border: '1px solid #333', fontFamily: 'monospace', fontSize: '11px', color: '#fff', pointerEvents: 'none' }}>
          <div style={{ marginBottom: 6, color: '#00d4ff', fontWeight: 'bold', letterSpacing: 1 }}>DATA STREAM STATUS</div>
          {[
            { label: 'TF (/tf)', key: 'tf' },
            { label: '2D Map (/map)', key: 'map' },
            { label: '3D Cloud (/cloud_map)', key: 'cloud' }
          ].map(({ label, key }) => (
            <div key={key} style={{ marginBottom: 3 }}>
              {label}: <span style={{ color: dataStatus[key] ? '#00ff88' : '#ff4444' }}>
                {dataStatus[key] ? '● RECEIVING' : '○ WAITING'}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 6, color: '#00d4ff' }}>Points: {pcCountRef.current.toLocaleString()}</div>
          <div style={{ marginTop: 8, color: '#555', fontSize: 10 }}>
            Left-drag: Pan  |  Right-drag: Rotate  |  Scroll: Zoom
          </div>
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
    </div>
  );
}
