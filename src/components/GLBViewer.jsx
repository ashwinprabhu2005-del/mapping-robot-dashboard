// ANNOTATION: Integrated 3D GLB/GLTF viewer using Three.js and OrbitControls
// Dynamically loads mesh objects from client-side IndexedDB with bounds-fitting calculations.
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { storageService } from '../utils/storageService';

const GLBViewer = forwardRef(({ selectedMap, setStats, onSceneReady, robotPose, robotPath }, ref) => {
  const containerRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const robotMeshRef = useRef(null);
  const pathLineRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getScene: () => sceneRef.current,
    getCamera: () => cameraRef.current,
    getRenderer: () => rendererRef.current,
    getControls: () => controlsRef.current,
    getModel: () => modelRef.current,
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // Lighting
    const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
    light1.position.set(10, 10, 10);
    light1.castShadow = true;
    scene.add(light1);
    
    const light2 = new THREE.DirectionalLight(0xffffff, 0.4);
    light2.position.set(-10, 5, 5);
    scene.add(light2);
    
    const ambLight = new THREE.AmbientLight(0x808080, 0.4);
    scene.add(ambLight);
    
    // Grid floor
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);
    
    // Axis helper
    const axisHelper = new THREE.AxesHelper(2);
    scene.add(axisHelper);

    // Robot Mesh representation
    const robotGeom = new THREE.BoxGeometry(0.5, 0.3, 0.7);
    const robotMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, metalness: 0.5, roughness: 0.5 });
    const robotMesh = new THREE.Mesh(robotGeom, robotMat);
    
    // Front indicator (red box)
    const frontGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const frontMat = new THREE.MeshStandardMaterial({ color: 0xff3366 });
    const frontMesh = new THREE.Mesh(frontGeom, frontMat);
    frontMesh.position.set(0, 0, 0.45);
    robotMesh.add(frontMesh);
    
    robotMesh.visible = false;
    scene.add(robotMesh);
    robotMeshRef.current = robotMesh;

    // Path trail
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 });
    const pathGeometry = new THREE.BufferGeometry();
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    pathLine.visible = false;
    scene.add(pathLine);
    pathLineRef.current = pathLine;

    if (onSceneReady) {
      onSceneReady({ scene, camera, renderer, controls });
    }

    // Animation loop
    let animationFrameId;
    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    
    // Handle window resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []); // Run once to setup Three.js

  // Effect to load the actual model when selectedMap changes
  useEffect(() => {
    if (!selectedMap || !sceneRef.current) return;
    
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    
    // Remove previous model if exists
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }

    setIsLoading(true);
    setLoadingProgress(0);

    let isMounted = true;
    let objectUrl = null;

    const loadModel = async () => {
      try {
        const blob = await storageService.getMapFile(selectedMap.id);
        if (!isMounted) return;
        if (!blob) throw new Error("Map file not found in storage.");

        // Create native object URL instead of parsing Base64 (saves memory & CPU)
        objectUrl = URL.createObjectURL(blob);

        const loader = new GLTFLoader();
        loader.load(
          objectUrl,
          (gltf) => {
            if (!isMounted) return;
            const model = gltf.scene;
            modelRef.current = model;
            scene.add(model);
            
            // Compute bounding box
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            
            // Auto-fit camera
            camera.position.set(center.x, center.y + maxDim * 0.5, center.z + cameraZ * 1.5);
            camera.lookAt(center);
            controls.target.copy(center);
            controls.update();
            
            // Count triangles/vertices
            let triangleCount = 0, vertexCount = 0;
            model.traverse((child) => {
              if (child.isMesh && child.geometry) {
                const geom = child.geometry;
                if (geom.getIndex()) {
                  triangleCount += geom.getIndex().count / 3;
                } else if (geom.attributes.position) {
                  triangleCount += geom.attributes.position.count / 3;
                }
                if (geom.attributes.position) {
                  vertexCount += geom.attributes.position.count;
                }
              }
            });
            
            if (setStats) {
              setStats({ triangleCount, vertexCount, bbox: box, size: selectedMap.size, name: selectedMap.name });
            }
            setIsLoading(false);
          },
          (xhr) => {
            if (xhr.lengthComputable && isMounted) {
              const percentComplete = Math.round((xhr.loaded / xhr.total) * 100);
              setLoadingProgress(percentComplete);
            }
          },
          (error) => {
            console.error("An error happened loading the GLB:", error);
            if (isMounted) setIsLoading(false);
          }
        );
      } catch (err) {
        console.error(err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadModel();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedMap, setStats]);

  // Update robot pose dynamically
  useEffect(() => {
    if (robotMeshRef.current && robotPose) {
      robotMeshRef.current.visible = true;
      const { position, orientation } = robotPose;
      if (position) {
        robotMeshRef.current.position.set(position.x, position.y, position.z);
      }
      if (orientation && orientation.w !== undefined) {
        robotMeshRef.current.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
      }
    }
  }, [robotPose]);

  // Update robot path dynamically
  useEffect(() => {
    if (pathLineRef.current && robotPath && robotPath.length > 0) {
      pathLineRef.current.visible = true;
      const points = robotPath.map(p => new THREE.Vector3(p.x, p.y, p.z));
      pathLineRef.current.geometry.setFromPoints(points);
    }
  }, [robotPath]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Loading indicator */}
      {isLoading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--accent-cyan)', background: 'rgba(0,0,0,0.7)', padding: '15px 25px', borderRadius: '4px', fontFamily: 'monospace', textAlign: 'center' }}>
          <div style={{ marginBottom: '10px' }}>Loading 3D model...</div>
          <div style={{ width: '150px', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden', margin: '0 auto' }}>
            <div style={{ width: `${loadingProgress}%`, height: '100%', background: 'var(--accent-cyan)', transition: 'width 0.1s' }}></div>
          </div>
          <div style={{ fontSize: '10px', marginTop: '5px' }}>{loadingProgress}%</div>
        </div>
      )}
    </div>
  );
});

export default GLBViewer;
