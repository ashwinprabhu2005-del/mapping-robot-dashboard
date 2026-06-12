// ANNOTATION: Web Worker to decode binary PointCloud2 ROS streams off the main thread.
// Ensures 60 FPS UI rendering by delegating heavy computations to a background thread.
self.onmessage = function (e) {
    msgData, pointStep, width, height, is_bigendian,
    hasRGB, xOffset, yOffset, zOffset, rgbOffset, isMapping
  } = e.data;

  try {
    const MAX = 5000000;
    const totalPoints = width * height;

    // Decode base64 → binary
    const binaryStr = atob(msgData);
    const buffer = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) buffer[i] = binaryStr.charCodeAt(i);
    const dv = new DataView(buffer.buffer);
    const le = !is_bigendian;

    const cap = Math.min(totalPoints, MAX);
    const positions = new Float32Array(cap * 3);
    const colors    = new Float32Array(cap * 3);
    let count = 0;

    for (let i = 0; i < totalPoints && count < MAX; i++) {
      const base = i * pointStep;
      const x = dv.getFloat32(base + xOffset, le);
      const y = dv.getFloat32(base + yOffset, le);
      const z = dv.getFloat32(base + zOffset, le);
      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;

      // If mapping, points are in 'map' frame (X-fwd, Y-left, Z-up) -> Three.js (Y-up)
      // If not mapping, points are in 'camera_optical_frame' (Z-fwd, X-right, Y-down) -> Three.js (Y-up)
      if (isMapping) {
        positions[count * 3]     = x;
        positions[count * 3 + 1] = z;
        positions[count * 3 + 2] = -y;
      } else {
        positions[count * 3]     = x;
        positions[count * 3 + 1] = -y;
        positions[count * 3 + 2] = -z;
      }

      if (hasRGB) {
        const rgbInt = dv.getUint32(base + rgbOffset, le);
        colors[count * 3]     = ((rgbInt >> 16) & 0xff) / 255;
        colors[count * 3 + 1] = ((rgbInt >>  8) & 0xff) / 255;
        colors[count * 3 + 2] = ( rgbInt        & 0xff) / 255;
      } else {
        const t = Math.min(Math.max((z + 0.5) / 2.5, 0), 1);
        colors[count * 3]     = t;
        colors[count * 3 + 1] = 1 - t * 0.3;
        colors[count * 3 + 2] = 1 - t;
      }
      count++;
    }

    // Transfer buffers to main thread — ZERO COPY, instant
    self.postMessage(
      { positions: positions.buffer, colors: colors.buffer, count },
      [positions.buffer, colors.buffer]
    );
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};
