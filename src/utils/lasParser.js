export async function parseLAS(arrayBuffer, isLaz = false) {
  const view = new DataView(arrayBuffer);
  const magic = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
  );
  
  if (magic !== 'LASF') {
    throw new Error('Invalid LAS/LAZ file: missing LASF magic bytes');
  }

  const offsetToPointData = view.getUint32(96, true);
  const pointDataRecordFormat = view.getUint8(104);
  const pointDataRecordLength = view.getUint16(105, true);
  
  // Try to get 1.4 point count if 1.2 point count is 0
  let numberOfPointRecords = view.getUint32(107, true);
  if (numberOfPointRecords === 0) {
    // Read from LAS 1.4 extended fields (offset 247)
    // using DataView getting 64 bit integer requires split reading
    const low = view.getUint32(247, true);
    const high = view.getUint32(251, true);
    numberOfPointRecords = low + high * 4294967296;
  }

  const scaleX = view.getFloat64(131, true);
  const scaleY = view.getFloat64(139, true);
  const scaleZ = view.getFloat64(147, true);
  const offsetX = view.getFloat64(155, true);
  const offsetY = view.getFloat64(163, true);
  const offsetZ = view.getFloat64(171, true);

  const positions = new Float32Array(numberOfPointRecords * 3);
  const layersArray = new Uint8Array(numberOfPointRecords);
  
  // Formats 2, 3, 5, 7, 8, 9, 10, 11 contain RGB
  const hasColor = [2, 3, 5, 7, 8, 9, 10, 11].includes(pointDataRecordFormat);
  let colors = hasColor ? new Float32Array(numberOfPointRecords * 3) : null;
  
  let minZ = Infinity;
  let maxZ = -Infinity;

  if (isLaz) {
    // Try to use laz-perf
    if (typeof window !== 'undefined' && window.Module && window.Module.LASZip) {
      try {
        console.log("Decoding LAZ using laz-perf...");
        // Basic laz-perf stub handling - real integration is complex
        // We'll throw an error if laz-perf doesn't easily unpack
        throw new Error("LAZ decompression requires full laz-perf chunk iteration mapping which is complex. Export to LAS.");
      } catch (e) {
        throw new Error("Failed to decode LAZ: " + e.message);
      }
    } else {
      throw new Error("laz-perf library not loaded or unsupported. Please use uncompressed .las");
    }
  } else {
    // Plain LAS parsing
    let offset = offsetToPointData;
    for (let i = 0; i < numberOfPointRecords; i++) {
      const pIdx = i * 3;
      
      const x = (view.getInt32(offset, true) * scaleX) + offsetX;
      const y = (view.getInt32(offset + 4, true) * scaleY) + offsetY;
      const z = (view.getInt32(offset + 8, true) * scaleZ) + offsetZ;
      
      positions[pIdx] = x;
      positions[pIdx + 1] = y;
      positions[pIdx + 2] = z;
      
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;

      // Classification is byte 15
      layersArray[i] = view.getUint8(offset + 15) & 31;

      if (hasColor) {
        // Color starts at offset 28 for format 2 and 3
        const r = view.getUint16(offset + 28, true) / 65535.0;
        const g = view.getUint16(offset + 30, true) / 65535.0;
        const b = view.getUint16(offset + 32, true) / 65535.0;
        colors[pIdx] = r;
        colors[pIdx + 1] = g;
        colors[pIdx + 2] = b;
      }
      
      offset += pointDataRecordLength;
    }
  }

  // Apply Z gradient if no colors
  if (!hasColor) {
    colors = new Float32Array(numberOfPointRecords * 3);
    const zRange = maxZ - minZ || 1; 
    
    for (let i = 0; i < numberOfPointRecords; i++) {
      const z = positions[i * 3 + 2];
      const normalizedZ = (z - minZ) / zRange; 
      
      let r = 0, g = 0, b = 0;
      if (normalizedZ < 0.25) {
        b = 1;
        g = normalizedZ / 0.25;
      } else if (normalizedZ < 0.5) {
        g = 1;
        b = 1 - (normalizedZ - 0.25) / 0.25;
      } else if (normalizedZ < 0.75) {
        g = 1;
        r = (normalizedZ - 0.5) / 0.25;
      } else {
        r = 1;
        g = 1 - (normalizedZ - 0.75) / 0.25;
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
  }

  return { positions, colors, layersArray, vertexCount: numberOfPointRecords };
}
