import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import GLBViewer from './GLBViewer';
import { saveZonesToStorage, loadZonesFromStorage } from '../utils/storage';

export default function AnnotationTab({ selectedMap }) {
  const viewerRef = useRef(null);
  const [zones, setZones] = useState([]);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [pendingDetections, setPendingDetections] = useState(null);
  const [approvalSelection, setApprovalSelection] = useState({});
  const [drawModeType, setDrawModeType] = useState('2point');
  const [newZone, setNewZone] = useState({ name: '', type: 'Room', color: '#00d4ff', shape: 'Cuboid' });
  const [drawPoints, setDrawPoints] = useState([]); // will hold 1, 2, or 3 THREE.Vector3 points
  const [hoverPosition, setHoverPosition] = useState(null);
  const [yoloConf, setYoloConf] = useState(0.15);
  const [pointSize, setPointSize] = useState(3.0);
  const [selectedAlignZoneId, setSelectedAlignZoneId] = useState(null);
  // Meshes for rendering (using ref to prevent state loops)
  const zoneMeshesRef = useRef({});

  const handleAutoClickDetect = (pt) => {
    if (!viewerRef.current) return;
    
    const camera = viewerRef.current.getCamera();
    const renderer = viewerRef.current.getRenderer();
    
    // Project 3D point to 2D NDC coordinates
    const projected = pt.clone().project(camera);
    // Convert to normalized click coords [0, 1]
    const click_x = (projected.x + 1) / 2;
    const click_y = (1 - projected.y) / 2;
    
    // Capture the canvas screenshot
    const canvas = renderer.domElement;
    const base64Image = canvas.toDataURL('image/jpeg', 0.95);
    
    setIsDetecting(true);
    
    fetch('http://localhost:5000/api/detect_click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        click_x,
        click_y,
        conf: yoloConf
      })
    })
    .then(res => res.json())
    .then(data => {
      setIsDetecting(false);
      if (!data.success) {
        alert(data.error || 'Failed to detect object at click location.');
        return;
      }
      
      const det = data.detection;
      const model = viewerRef.current.getModel();
      const points = [];
      const raycaster = new THREE.Raycaster();
      raycaster.params.Points.threshold = 0.2;
      const mouse = new THREE.Vector2();
      
      // Calculate depth samples from polygon points
      const poly = det.polygon;
      
      if (poly && poly.length > 0) {
        // Sample up to 30 points from the polygon boundary
        const step = Math.max(1, Math.floor(poly.length / 30));
        for (let i = 0; i < poly.length; i += step) {
          const px = poly[i][0];
          const py = poly[i][1];
          mouse.x = px * 2 - 1;
          mouse.y = -(py * 2 - 1);
          
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObject(model, true);
          if (intersects.length > 0) {
            points.push(intersects[0].point.clone());
          }
        }
      } else {
        // Fallback: project bounding box corners and center
        const [x1, y1, x2, y2] = det.box;
        const boxPoints = [
          [x1 / data.width, y1 / data.height],
          [x2 / data.width, y1 / data.height],
          [x1 / data.width, y2 / data.height],
          [x2 / data.width, y2 / data.height],
          [(x1+x2)/2 / data.width, (y1+y2)/2 / data.height]
        ];
        boxPoints.forEach(([px, py]) => {
          mouse.x = px * 2 - 1;
          mouse.y = -(py * 2 - 1);
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObject(model, true);
          if (intersects.length > 0) {
            points.push(intersects[0].point.clone());
          }
        });
      }
      
      if (points.length === 0) {
        alert("Failed to map the detected object to 3D space. Please try another camera angle.");
        return;
      }
      
      // Compute 3D bounds
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const zs = points.map(p => p.z);
      
      const bounds = {
        x: [Math.min(...xs), Math.max(...xs)],
        y: [Math.min(...ys), Math.max(...ys)],
        z: [Math.min(...zs), Math.max(...zs)]
      };
      
      // Expand height (Y) slightly if too flat
      if (bounds.y[1] - bounds.y[0] < 0.1) {
        bounds.y[0] -= 0.5;
        bounds.y[1] += 0.5;
      }
      // Expand other bounds if needed
      if (bounds.x[1] - bounds.x[0] < 0.1) {
        bounds.x[0] -= 0.2; bounds.x[1] += 0.2;
      }
      if (bounds.z[1] - bounds.z[0] < 0.1) {
        bounds.z[0] -= 0.2; bounds.z[1] += 0.2;
      }
      
      let color = '#ff3366';
      if (det.class.includes('chair') || det.class.includes('couch') || det.class.includes('sofa')) color = '#ffaa00';
      else if (det.class.includes('tv')) color = '#00d4ff';
      else if (det.class.includes('table') || det.class.includes('desk')) color = '#00ff66';
      else if (det.class.includes('bookcase') || det.class.includes('wardrobe') || det.class.includes('cabinet')) color = '#cc00ff';
      
      const finalZone = {
        id: Date.now(),
        name: `${det.class.charAt(0).toUpperCase() + det.class.slice(1)} ${zones.length + 1}`,
        type: 'Equipment',
        color: color,
        shape: 'Cuboid',
        bounds,
        visible: true
      };
      
      const updatedZones = [...zones, finalZone];
      setZones(updatedZones);
      renderAllZones(updatedZones);
      if (selectedMap) {
        saveZonesToStorage(selectedMap.name, updatedZones);
      }
      
      // Select it for editing immediately
      setSelectedAlignZoneId(finalZone.id);
    })
    .catch(err => {
      setIsDetecting(false);
      console.error(err);
      alert('Error during interactive click detection: ' + err.message);
    });
  };

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
    raycaster.params.Points.threshold = 0.2; // Better point cloud intersection
    const mouse = new THREE.Vector2();

    // Cursor indicator (blue point)
    const cursorMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.8, depthTest: false })
    );
    cursorMesh.renderOrder = 999;
    cursorMesh.visible = false;
    scene.add(cursorMesh);

    // Existing points (red points)
    const pointMeshes = drawPoints.map(p => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff3366, depthTest: false })
      );
      m.position.copy(p);
      m.renderOrder = 999;
      scene.add(m);
      return m;
    });

    const onMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(model, true);

      if (intersects.length > 0) {
        const pt = intersects[0].point;
        cursorMesh.position.copy(pt);
        cursorMesh.visible = true;
        renderer.domElement.style.cursor = 'crosshair';
        setHoverPosition(pt);
      } else {
        cursorMesh.visible = false;
        renderer.domElement.style.cursor = 'default';
        setHoverPosition(null);
      }
    };

    const onClick = (event) => {
      if (!cursorMesh.visible) return; // Only click if hovered over model
      
      const pt = cursorMesh.position.clone();
      
      if (drawModeType === 'auto_click') {
        setIsDrawingMode(false);
        controls.enabled = true;
        handleAutoClickDetect(pt);
        return;
      }
      
      setDrawPoints(prev => {
        // Prevent adding multiple points if event fires repeatedly for same click
        if (prev.length > 0 && prev[prev.length-1].distanceTo(pt) < 0.05) return prev;
        
        const nextPts = [...prev, pt];
        
        let requiredPoints = 2;
        if (drawModeType === '3point') requiredPoints = 3;
        else if (drawModeType === 'object') requiredPoints = 1;
        
        if (nextPts.length === requiredPoints) {
          setIsDrawingMode(false);
          controls.enabled = true;
        }
        return nextPts;
      });
    };

    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerdown', onClick);

    return () => {
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onClick);
      renderer.domElement.style.cursor = 'default';
      
      scene.remove(cursorMesh);
      cursorMesh.geometry.dispose();
      cursorMesh.material.dispose();
      
      pointMeshes.forEach(m => {
        scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      });
      
      if (controls && !isDrawingMode) controls.enabled = true;
    };
  }, [isDrawingMode, drawPoints, drawModeType]);

  // Render temporary preview box if points are selected
  useEffect(() => {
    if (drawPoints.length >= 1 && viewerRef.current && showZoneDialog) {
      const scene = viewerRef.current.getScene();
      let bounds = null;

      if (drawModeType === 'object') {
        const p1 = drawPoints[0];
        bounds = {
          x: [p1.x - 0.15, p1.x + 0.15],
          y: [p1.y - 0.15, p1.y + 0.15],
          z: [p1.z - 0.15, p1.z + 0.15]
        };
      } else if (drawPoints.length >= 2) {
        const p1 = drawPoints[0];
        const p2 = drawPoints[1];
        
        bounds = {
          x: [Math.min(p1.x, p2.x), Math.max(p1.x, p2.x)],
          y: [Math.min(p1.y, p2.y), Math.max(p1.y, p2.y)],
          z: [Math.min(p1.z, p2.z), Math.max(p1.z, p2.z)]
        };
        
        if (drawModeType === '3point') {
          if (drawPoints.length === 3) {
            const p3 = drawPoints[2];
            bounds.y = [Math.min(p1.y, p2.y, p3.y), Math.max(p1.y, p2.y, p3.y)];
          } else if (hoverPosition) {
            bounds.y = [Math.min(p1.y, p2.y, hoverPosition.y), Math.max(p1.y, p2.y, hoverPosition.y)];
          }
        } else {
          // Expand bounds slightly so it has volume even if points are on a flat surface
          if (bounds.y[1] - bounds.y[0] < 0.1) {
            bounds.y[0] -= 1;
            bounds.y[1] += 2;
          }
        }
      }

      if (bounds) {
        if (bounds.x[1] - bounds.x[0] < 0.1) { bounds.x[0] -= 0.5; bounds.x[1] += 0.5; }
        if (bounds.z[1] - bounds.z[0] < 0.1) { bounds.z[0] -= 0.5; bounds.z[1] += 0.5; }

        const tempZone = { id: 'temp', ...newZone, bounds, visible: true, type: drawModeType === 'object' ? 'Object Tag' : newZone.type };
        renderZoneMesh(scene, tempZone);
      }
    }
  }, [drawPoints, hoverPosition, newZone.color, newZone.shape, showZoneDialog, drawModeType]);

  // Dynamic point size update effect for point cloud representation
  useEffect(() => {
    if (!viewerRef.current) return;
    const model = viewerRef.current.getModel();
    if (!model) return;
    model.traverse((child) => {
      if (child.isPoints) {
        child.material.size = pointSize;
        child.material.sizeAttenuation = false;
        child.material.needsUpdate = true;
      }
    });
  }, [pointSize, selectedMap]);

  const renderZoneMesh = (scene, zone) => {
    // Remove existing meshes for this zone if any
    if (zoneMeshesRef.current[zone.id]) {
      const existing = zoneMeshesRef.current[zone.id];
      if (existing.mesh) scene.remove(existing.mesh);
      if (existing.wireframe) scene.remove(existing.wireframe);
      if (existing.polygonLine) scene.remove(existing.polygonLine);
    }

    if (!zone.visible && zone.id !== 'temp') return;

    const width = zone.bounds.x[1] - zone.bounds.x[0];
    const height = zone.bounds.y[1] - zone.bounds.y[0];
    const depth = zone.bounds.z[1] - zone.bounds.z[0];

    const centerX = (zone.bounds.x[0] + zone.bounds.x[1]) / 2;
    const centerY = (zone.bounds.y[0] + zone.bounds.y[1]) / 2;
    const centerZ = (zone.bounds.z[0] + zone.bounds.z[1]) / 2;

    if (zone.type === 'Object Tag') {
      const geometry = new THREE.SphereGeometry(0.12, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: zone.color || '#ff3366',
        depthTest: false,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(centerX, centerY, centerZ);
      mesh.renderOrder = 999;
      scene.add(mesh);

      // Add a small wireframe or outline ring for contrast
      const wireframeGeom = new THREE.RingGeometry(0.15, 0.18, 16);
      const wireframeMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, depthTest: false });
      const wireframe = new THREE.Mesh(wireframeGeom, wireframeMat);
      wireframe.position.copy(mesh.position);
      wireframe.rotation.x = Math.PI / 2;
      wireframe.renderOrder = 999;
      scene.add(wireframe);

      zoneMeshesRef.current[zone.id] = { mesh, wireframe };
      return;
    }

    // Determine geometry based on shape
    let geometry;
    const shape = zone.shape || 'Cuboid';
    if (shape === 'Sphere') {
      const radius = Math.max(0.1, (width + height + depth) / 6);
      geometry = new THREE.SphereGeometry(radius, 16, 16);
    } else if (shape === 'Cylinder') {
      const radius = Math.max(0.1, (width + depth) / 4);
      geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
    } else {
      geometry = new THREE.BoxGeometry(width, height, depth);
    }

    const material = new THREE.MeshBasicMaterial({
      color: zone.color,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(centerX, centerY, centerZ);
    
    let wireframe;
    if (shape === 'Sphere') {
      const edges = new THREE.SphereGeometry(geometry.parameters.radius, 8, 8);
      wireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(edges),
        new THREE.LineBasicMaterial({ color: zone.color, linewidth: 1.5 })
      );
    } else if (shape === 'Cylinder') {
      wireframe = new THREE.LineSegments(
        new THREE.WireframeGeometry(geometry),
        new THREE.LineBasicMaterial({ color: zone.color, linewidth: 1.5 })
      );
    } else {
      const edges = new THREE.EdgesGeometry(geometry);
      wireframe = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: zone.color, linewidth: 2 })
      );
    }
    wireframe.position.copy(mesh.position);
    
    scene.add(mesh);
    scene.add(wireframe);

    // Render 3D segmentation polygon if it exists
    let polygonLine = null;
    if (zone.polygon3D && zone.polygon3D.length > 0) {
      const polyGeometry = new THREE.BufferGeometry().setFromPoints(zone.polygon3D);
      const polyMaterial = new THREE.LineBasicMaterial({ color: '#00ff00', linewidth: 3 });
      polygonLine = new THREE.LineLoop(polyGeometry, polyMaterial);
      polygonLine.position.y += 0.05; 
      scene.add(polygonLine);
    }

    zoneMeshesRef.current[zone.id] = { mesh, wireframe, polygonLine };
  };

  const removeAllZones = () => {
    if (!viewerRef.current) return;
    const scene = viewerRef.current.getScene();
    Object.values(zoneMeshesRef.current).forEach(existing => {
      if (existing.mesh) scene.remove(existing.mesh);
      if (existing.wireframe) scene.remove(existing.wireframe);
      if (existing.polygonLine) scene.remove(existing.polygonLine);
    });
    zoneMeshesRef.current = {};
  };

  const renderAllZones = (zonesToRender) => {
    if (!viewerRef.current) return;
    const scene = viewerRef.current.getScene();
    removeAllZones();
    zonesToRender.forEach(z => {
      if (z.visible) renderZoneMesh(scene, z);
    });
  };

  const detectObjectsYolo = async () => {
    if (!viewerRef.current || !selectedMap) {
      alert("Please load a map first.");
      return;
    }
    setIsDetecting(true);
    
    try {
      const renderer = viewerRef.current.getRenderer();
      const camera = viewerRef.current.getCamera();
      const model = viewerRef.current.getModel();
      const scene = viewerRef.current.getScene();
      
      // Force a render to capture current view
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL("image/jpeg", 0.8);
      
      const response = await fetch("http://localhost:5001/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image: dataUrl,
          conf: yoloConf
        })
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      if (result.detections.length === 0) {
        alert("No objects detected. Try changing the camera angle.");
        return;
      }
      
      // Open approval dialog
      setPendingDetections(result);
      const initialSelection = {};
      result.detections.forEach((d, i) => initialSelection[i] = true);
      setApprovalSelection(initialSelection);
      
    } catch (err) {
      console.error(err);
      alert("Error connecting to YOLO backend. Is the Python server running on port 5001?");
    } finally {
      setIsDetecting(false);
    }
  };

  const approveDetections = () => {
    if (!pendingDetections || !viewerRef.current) return;
    
    const { detections, width, height } = pendingDetections;
    const camera = viewerRef.current.getCamera();
    const model = viewerRef.current.getModel();
    
    const newDetectedZones = [];
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.2; 
    
    detections.forEach((det, index) => {
      if (!approvalSelection[index]) return; // Skip if user unchecked it
      
      let pts3D = [];
      let centerPt = null;
      let bounds = null;

      // Try to raycast the exact segmentation polygon first!
      if (det.polygon && det.polygon.length > 0) {
          const step = Math.max(1, Math.floor(det.polygon.length / 40));
          for(let i=0; i<det.polygon.length; i+=step) {
              const pt2d = det.polygon[i];
              const ndcX = (pt2d[0]) * 2 - 1;
              const ndcY = -(pt2d[1]) * 2 + 1;
              
              raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
              const intersects = raycaster.intersectObject(model, true);
              if (intersects.length > 0) {
                  pts3D.push(intersects[0].point);
              }
          }
      }

      const centerX = (det.box[0] + det.box[2]) / 2;
      const centerY = (det.box[1] + det.box[3]) / 2;
      
      const ndcCenterX = (centerX / width) * 2 - 1;
      const ndcCenterY = -(centerY / height) * 2 + 1;
      
      raycaster.setFromCamera(new THREE.Vector2(ndcCenterX, ndcCenterY), camera);
      const centerIntersects = raycaster.intersectObject(model, true);
      
      if (centerIntersects.length > 0) {
        centerPt = centerIntersects[0].point;
        pts3D.push(centerPt);
      }

      if (pts3D.length > 0) {
        if (pts3D.length < 3 && centerPt) {
            const projectedCenter = centerPt.clone().project(camera);
            const ndcX1 = (det.box[0] / width) * 2 - 1;
            const ndcY1 = -(det.box[1] / height) * 2 + 1;
            const ndcX2 = (det.box[2] / width) * 2 - 1;
            const ndcY2 = -(det.box[3] / height) * 2 + 1;
            
            const p1 = new THREE.Vector3(ndcX1, ndcY1, projectedCenter.z).unproject(camera);
            const p2 = new THREE.Vector3(ndcX2, ndcY2, projectedCenter.z).unproject(camera);
            
            const cameraDir = new THREE.Vector3();
            camera.getWorldDirection(cameraDir);
            
            const p3 = p1.clone().add(cameraDir.clone().multiplyScalar(0.5));
            const p4 = p2.clone().add(cameraDir.clone().multiplyScalar(-0.5));
            
            pts3D = [p1, p2, p3, p4, centerPt];
        }

        bounds = {
          x: [Math.min(...pts3D.map(p=>p.x)), Math.max(...pts3D.map(p=>p.x))],
          y: [Math.min(...pts3D.map(p=>p.y)), Math.max(...pts3D.map(p=>p.y))],
          z: [Math.min(...pts3D.map(p=>p.z)), Math.max(...pts3D.map(p=>p.z))]
        };
        
        ['x', 'y', 'z'].forEach(axis => {
           if (bounds[axis][1] - bounds[axis][0] < 0.2) {
               bounds[axis][0] -= 0.2;
               bounds[axis][1] += 0.2;
           }
        });
        
        newDetectedZones.push({
          id: Date.now() + index,
          name: `${det.class} ${(det.confidence*100).toFixed(0)}%`,
          type: 'YOLO Detection',
          color: '#ff00ff', 
          bounds,
          polygon3D: pts3D.length > 5 ? pts3D : null, 
          visible: true
        });
      }
    });
    
    if (newDetectedZones.length > 0) {
      const updatedZones = [...zones, ...newDetectedZones];
      setZones(updatedZones);
      renderAllZones(updatedZones);
      alert(`Successfully annotated ${newDetectedZones.length} approved objects!`);
    } else {
      alert("None of the approved objects could be mapped to the 3D surface.");
    }
    
    setPendingDetections(null);
  };

  const openZoneDialog = () => {
    if (!selectedMap) {
      alert("Please load a map from the 3D MAPS tab first!");
      return;
    }
    setNewZone({ name: `Zone ${zones.length + 1}`, type: 'Room', color: '#00d4ff', shape: 'Cuboid' });
    setDrawPoints([]);
    setShowZoneDialog(true);
  };

  const enterDrawMode = () => {
    setDrawPoints([]);
    setIsDrawingMode(true);
  };

  const saveZone = () => {
    let requiredPoints = 2;
    if (drawModeType === '3point') requiredPoints = 3;
    else if (drawModeType === 'object' || drawModeType === 'auto_click') requiredPoints = 1;

    if (drawModeType === 'auto_click') {
      alert("Please click directly on the 3D model to automatically detect objects.");
      return;
    }

    if (drawPoints.length !== requiredPoints) {
      alert(`Please draw on the model first (click ${requiredPoints} points)`);
      return;
    }
    
    let bounds = null;
    let type = newZone.type;
    
    if (drawModeType === 'object') {
      const p1 = drawPoints[0];
      bounds = {
        x: [p1.x - 0.15, p1.x + 0.15],
        y: [p1.y - 0.15, p1.y + 0.15],
        z: [p1.z - 0.15, p1.z + 0.15]
      };
      type = 'Object Tag';
    } else {
      const p1 = drawPoints[0];
      const p2 = drawPoints[1];
      bounds = {
        x: [Math.min(p1.x, p2.x), Math.max(p1.x, p2.x)],
        y: [Math.min(p1.y, p2.y), Math.max(p1.y, p2.y)],
        z: [Math.min(p1.z, p2.z), Math.max(p1.z, p2.z)]
      };

      if (drawModeType === '3point') {
          const p3 = drawPoints[2];
          bounds.y = [Math.min(p1.y, p2.y, p3.y), Math.max(p1.y, p2.y, p3.y)];
      } else {
          if (bounds.y[1] - bounds.y[0] < 0.1) {
            bounds.y[0] -= 1; bounds.y[1] += 2;
          }
      }
    }

    const finalZone = {
      id: Date.now(),
      name: newZone.name || (drawModeType === 'object' ? `Object ${zones.length + 1}` : `Zone ${zones.length + 1}`),
      type: type,
      color: newZone.color,
      shape: newZone.shape || (drawModeType === 'object' ? 'Sphere' : 'Cuboid'),
      bounds,
      visible: true
    };

    setZones([...zones, finalZone]);
    setShowZoneDialog(false);
    setDrawPoints([]);
    setHoverPosition(null);
    
    // Remove temp and render real
    if (viewerRef.current && zoneMeshesRef.current['temp']) {
      const scene = viewerRef.current.getScene();
      const temp = zoneMeshesRef.current['temp'];
      if (temp.mesh) scene.remove(temp.mesh);
      if (temp.wireframe) scene.remove(temp.wireframe);
      if (temp.polygonLine) scene.remove(temp.polygonLine);
      delete zoneMeshesRef.current['temp'];
    }
    renderAllZones([...zones, finalZone]);
  };

  const resetAll = () => {
    if (window.confirm("Are you sure you want to reset and delete all annotations and zones?")) {
      setZones([]);
      removeAllZones();
      if (selectedMap) {
        saveZonesToStorage(selectedMap.name, []);
      }
    }
  };

  const adjustZone = (id, field, value) => {
    const updated = zones.map(z => {
      if (z.id === id) {
        let cx = (z.bounds.x[0] + z.bounds.x[1]) / 2;
        let cy = (z.bounds.y[0] + z.bounds.y[1]) / 2;
        let cz = (z.bounds.z[0] + z.bounds.z[1]) / 2;
        
        let sx = z.bounds.x[1] - z.bounds.x[0];
        let sy = z.bounds.y[1] - z.bounds.y[0];
        let sz = z.bounds.z[1] - z.bounds.z[0];
        
        if (field === 'cx') cx = value;
        if (field === 'cy') cy = value;
        if (field === 'cz') cz = value;
        if (field === 'sx') sx = Math.max(0.05, value);
        if (field === 'sy') sy = Math.max(0.05, value);
        if (field === 'sz') sz = Math.max(0.05, value);
        
        const newBounds = {
          x: [cx - sx/2, cx + sx/2],
          y: [cy - sy/2, cy + sy/2],
          z: [cz - sz/2, cz + sz/2]
        };
        return { ...z, bounds: newBounds };
      }
      return z;
    });
    setZones(updated);
    renderAllZones(updated);
    if (selectedMap) {
      saveZonesToStorage(selectedMap.name, updated);
    }
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
        {isDetecting && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 1000, color: 'white', fontFamily: 'monospace' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '15px' }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <div>🤖 Running YOLO11 Real-Time Detector...</div>
          </div>
        )}
      </div>

      {/* Right: Annotation Panel */}
      <div style={{ flex: '0.3', background: 'var(--panel-bg)', borderLeft: '1px solid var(--panel-border)', padding: '20px', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0, color: 'var(--accent-cyan)' }}>3D ANNOTATION</h3>

        {/* Settings & Controls Panel */}
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-cyan)', fontSize: '11px', fontFamily: 'monospace' }}>⚙️ SETTINGS & CONTROLS</h4>
          
          {/* Point Size Control */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ccc', fontFamily: 'monospace', marginBottom: '6px' }}>
              <span>POINT SIZE (DENSITY)</span>
              <span style={{ color: 'var(--accent-cyan)' }}>{pointSize.toFixed(1)}px</span>
            </div>
            <input 
              type="range" 
              min="1.0" 
              max="10.0" 
              step="0.5"
              value={pointSize}
              onChange={(e) => setPointSize(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Increase to make sparse point clouds look solid for YOLO.</div>
          </div>

          {/* YOLO Confidence Control */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ccc', fontFamily: 'monospace', marginBottom: '6px' }}>
              <span>YOLO CONFIDENCE THRESHOLD</span>
              <span style={{ color: '#ff00ff' }}>{(yoloConf * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" 
              min="0.05" 
              max="0.80" 
              step="0.05"
              value={yoloConf}
              onChange={(e) => setYoloConf(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#ff00ff', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Lower this if objects are not being detected.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={openZoneDialog}
            className="primary"
            style={{ flex: 1, padding: '12px', fontSize: '14px' }}
          >
            + ADD ZONE
          </button>
          
          <button 
            onClick={detectObjectsYolo}
            disabled={isDetecting}
            style={{ 
              flex: 1, 
              padding: '12px', 
              fontSize: '14px', 
              background: isDetecting ? '#333' : '#ff00ff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isDetecting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isDetecting ? 'Detecting...' : '🤖 AUTO YOLO'}
          </button>
        </div>

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

            <div style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
              <select 
                value={drawModeType}
                onChange={(e) => setDrawModeType(e.target.value)}
                style={{ flex: 1, padding: '8px', background: '#1e2330', border: '1px solid var(--panel-border)', color: 'white', borderRadius: '4px', fontFamily: 'monospace' }}
              >
                <option value="auto_click">Auto Object Detector (1-Click YOLO)</option>
                <option value="3point">3-Point Zone (3-Dot Square)</option>
                <option value="2point">2-Point Zone (Floor Base)</option>
                <option value="object">Manual Object (1-Click Tag)</option>
              </select>
            </div>

            {drawModeType !== 'object' && drawModeType !== 'auto_click' && (
              <div style={{ marginBottom: '10px' }}>
                <select 
                  value={newZone.shape || 'Cuboid'}
                  onChange={(e) => setNewZone({...newZone, shape: e.target.value})}
                  style={{ width: '100%', padding: '8px', background: '#1e2330', border: '1px solid var(--panel-border)', color: 'white', borderRadius: '4px', fontFamily: 'monospace' }}
                >
                  <option value="Cuboid">Shape: Cuboid (Box)</option>
                  <option value="Sphere">Shape: Sphere</option>
                  <option value="Cylinder">Shape: Cylinder</option>
                </select>
              </div>
            )}

            <button 
              onClick={enterDrawMode}
              style={{ width: '100%', padding: '8px', background: isDrawingMode ? 'var(--warning-amber)' : '#1e2330', color: isDrawingMode ? '#000' : 'white', border: '1px solid var(--panel-border)', marginBottom: '10px', fontWeight: isDrawingMode ? 'bold' : 'normal' }}
            >
              {isDrawingMode 
                ? `Drawing... (Click ${drawModeType === 'object' || drawModeType === 'auto_click' ? '1' : drawModeType === '2point' ? '2' : '3'} point${drawModeType === 'object' || drawModeType === 'auto_click' ? '' : 's'})` 
                : '📍 Draw/Place on Model'}
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="primary" onClick={saveZone} style={{ flex: 1 }}>✓ Save</button>
              <button onClick={() => { setShowZoneDialog(false); setIsDrawingMode(false); }} style={{ flex: 1 }}>✕ Cancel</button>
            </div>
          </div>
        )}

        {isDrawingMode && (
          <div style={{ background: 'var(--warning-amber)', padding: '10px', borderRadius: '4px', color: '#000', marginBottom: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            {drawModeType === 'auto_click' 
              ? 'Click a single object on the 3D model to automatically detect and bounding-box it.'
              : drawModeType === 'object' 
                ? `Click a single point on the 3D model to place the object tag. ${drawPoints.length}/1 selected.`
                : `Click ${drawModeType === '2point' ? '2' : '3'} points on the 3D model. ${drawPoints.length}/${drawModeType === '2point' ? '2' : '3'} points selected.`}
          </div>
        )}

        {pendingDetections && (
          <div style={{ background: '#252a36', padding: '15px', borderRadius: '4px', marginBottom: '20px', border: '1px solid var(--accent-cyan)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--accent-cyan)' }}>Review Detections</h3>
            <p style={{ fontSize: '12px', color: '#ccc', marginBottom: '10px' }}>Please approve the correct objects to segment. Uncheck incorrect guesses.</p>
            
            <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '10px', background: '#1e2330', padding: '10px', borderRadius: '4px' }}>
              {pendingDetections.detections.map((det, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                  <input 
                    type="checkbox" 
                    checked={approvalSelection[index] || false} 
                    onChange={(e) => setApprovalSelection({...approvalSelection, [index]: e.target.checked})}
                    style={{ marginRight: '10px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px', flex: 1, color: '#fff' }}>{det.class}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>{(det.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="primary" onClick={approveDetections} style={{ flex: 1 }}>✓ Approve</button>
              <button onClick={() => setPendingDetections(null)} style={{ flex: 1, background: '#444', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>✕ Cancel</button>
            </div>
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
                      onClick={() => setSelectedAlignZoneId(selectedAlignZoneId === zone.id ? null : zone.id)}
                      style={{ padding: '4px 8px', background: selectedAlignZoneId === zone.id ? 'var(--warning-amber)' : '#1e2330', color: selectedAlignZoneId === zone.id ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      title="Align bounding box"
                    >
                      🔧
                    </button>
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
                {selectedAlignZoneId === zone.id && (
                  <div style={{ marginTop: '10px', background: '#1c2030', padding: '10px', borderRadius: '4px', border: '1px solid var(--accent-cyan)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '8px' }}>ALIGNMENT TUNER</div>
                    
                    {/* Size Controls */}
                    <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', width: '45px', color: '#ccc' }}>Width:</span>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="5" 
                        step="0.05"
                        value={(zone.bounds.x[1] - zone.bounds.x[0])}
                        onChange={(e) => adjustZone(zone.id, 'sx', parseFloat(e.target.value))}
                        style={{ flex: 1, height: '4px' }}
                      />
                      <span style={{ fontSize: '10px', width: '30px', textAlign: 'right' }}>{(zone.bounds.x[1] - zone.bounds.x[0]).toFixed(2)}m</span>
                    </div>

                    <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', width: '45px', color: '#ccc' }}>Height:</span>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="5" 
                        step="0.05"
                        value={(zone.bounds.y[1] - zone.bounds.y[0])}
                        onChange={(e) => adjustZone(zone.id, 'sy', parseFloat(e.target.value))}
                        style={{ flex: 1, height: '4px' }}
                      />
                      <span style={{ fontSize: '10px', width: '30px', textAlign: 'right' }}>{(zone.bounds.y[1] - zone.bounds.y[0]).toFixed(2)}m</span>
                    </div>

                    <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', width: '45px', color: '#ccc' }}>Depth:</span>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="5" 
                        step="0.05"
                        value={(zone.bounds.z[1] - zone.bounds.z[0])}
                        onChange={(e) => adjustZone(zone.id, 'sz', parseFloat(e.target.value))}
                        style={{ flex: 1, height: '4px' }}
                      />
                      <span style={{ fontSize: '10px', width: '30px', textAlign: 'right' }}>{(zone.bounds.z[1] - zone.bounds.z[0]).toFixed(2)}m</span>
                    </div>

                    {/* Offset Controls */}
                    <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', width: '45px', color: '#ccc' }}>Shift X:</span>
                      <input 
                        type="range" 
                        min={((zone.bounds.x[0] + zone.bounds.x[1])/2 - 2.5)}
                        max={((zone.bounds.x[0] + zone.bounds.x[1])/2 + 2.5)}
                        step="0.02"
                        value={((zone.bounds.x[0] + zone.bounds.x[1])/2)}
                        onChange={(e) => adjustZone(zone.id, 'cx', parseFloat(e.target.value))}
                        style={{ flex: 1, height: '4px' }}
                      />
                      <span style={{ fontSize: '10px', width: '30px', textAlign: 'right' }}>{((zone.bounds.x[0] + zone.bounds.x[1])/2).toFixed(2)}m</span>
                    </div>

                    <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', width: '45px', color: '#ccc' }}>Shift Y:</span>
                      <input 
                        type="range" 
                        min={((zone.bounds.y[0] + zone.bounds.y[1])/2 - 2.5)}
                        max={((zone.bounds.y[0] + zone.bounds.y[1])/2 + 2.5)}
                        step="0.02"
                        value={((zone.bounds.y[0] + zone.bounds.y[1])/2)}
                        onChange={(e) => adjustZone(zone.id, 'cy', parseFloat(e.target.value))}
                        style={{ flex: 1, height: '4px' }}
                      />
                      <span style={{ fontSize: '10px', width: '30px', textAlign: 'right' }}>{((zone.bounds.y[0] + zone.bounds.y[1])/2).toFixed(2)}m</span>
                    </div>

                    <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', width: '45px', color: '#ccc' }}>Shift Z:</span>
                      <input 
                        type="range" 
                        min={((zone.bounds.z[0] + zone.bounds.z[1])/2 - 2.5)}
                        max={((zone.bounds.z[0] + zone.bounds.z[1])/2 + 2.5)}
                        step="0.02"
                        value={((zone.bounds.z[0] + zone.bounds.z[1])/2)}
                        onChange={(e) => adjustZone(zone.id, 'cz', parseFloat(e.target.value))}
                        style={{ flex: 1, height: '4px' }}
                      />
                      <span style={{ fontSize: '10px', width: '30px', textAlign: 'right' }}>{((zone.bounds.z[0] + zone.bounds.z[1])/2).toFixed(2)}m</span>
                    </div>

                    <button 
                      onClick={() => setSelectedAlignZoneId(null)}
                      style={{ width: '100%', padding: '6px', background: 'var(--accent-cyan)', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Close Tuner
                    </button>
                  </div>
                )}
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
          <button onClick={resetAll} style={{ flex: 1, padding: '10px', background: 'var(--panel-border)', color: 'var(--error-red)' }}>
            🗑️ RESET ALL
          </button>
        </div>
      </div>
    </div>
  );
}
