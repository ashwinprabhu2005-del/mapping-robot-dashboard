/**
 * Utility to parse ROS2 sensor_msgs/PointCloud2 messages in the browser
 * for rendering in Three.js/React-Three-Fiber.
 */
export function parsePointCloud2(message) {
  if (!message || !message.data) {
    return { positions: new Float32Array(0), colors: null, count: 0 };
  }

  // Decode base64 binary block
  const binaryString = window.atob(message.data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const buffer = bytes.buffer;
  const dataView = new DataView(buffer);
  const isLittleEndian = !message.is_bigendian;
  
  const width = message.width;
  const height = message.height;
  const numPoints = width * height;
  const pointStep = message.point_step;
  const fields = message.fields;
  
  // Find offsets of coordinates and colors
  let xOffset = 0;
  let yOffset = 4;
  let zOffset = 8;
  let rgbOffset = -1;
  
  fields.forEach(f => {
    if (f.name === 'x') xOffset = f.offset;
    if (f.name === 'y') yOffset = f.offset;
    if (f.name === 'z') zOffset = f.offset;
    if (f.name === 'rgb') rgbOffset = f.offset;
  });
  
  const positions = new Float32Array(numPoints * 3);
  const colors = rgbOffset !== -1 ? new Float32Array(numPoints * 3) : null;
  
  for (let i = 0; i < numPoints; i++) {
    const offset = i * pointStep;
    
    // Read coordinates
    const x = dataView.getFloat32(offset + xOffset, isLittleEndian);
    const y = dataView.getFloat32(offset + yOffset, isLittleEndian);
    const z = dataView.getFloat32(offset + zOffset, isLittleEndian);
    
    // Convert ROS coordinates to Three.js coordinates:
    // ROS: X forward, Y left, Z up.
    // Three.js: X right, Y up, Z backward.
    // Map: Three X = -y, Three Y = z, Three Z = -x (for correct standard camera alignment)
    // Or map directly: X = x, Y = z, Z = y matching the PLY load logic in our app:
    positions[i * 3] = x;
    positions[i * 3 + 1] = z;
    positions[i * 3 + 2] = y;
    
    // Unpack RGB values if color channel exists
    if (colors && rgbOffset !== -1) {
      // Read 32-bit packed RGBA value
      const rgbPacked = dataView.getUint32(offset + rgbOffset, isLittleEndian);
      const r = (rgbPacked >> 16) & 0xff;
      const g = (rgbPacked >> 8) & 0xff;
      const b = rgbPacked & 0xff;
      
      colors[i * 3] = r / 255.0;
      colors[i * 3 + 1] = g / 255.0;
      colors[i * 3 + 2] = b / 255.0;
    }
  }
  
  return { positions, colors, count: numPoints };
}
