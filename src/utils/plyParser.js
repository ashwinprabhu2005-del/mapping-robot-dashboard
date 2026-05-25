export function parsePLY(arrayBuffer) {
  const decoder = new TextDecoder('ascii');
  
  // Read a chunk to find header
  // Header is usually small, read first 10000 bytes
  const headerSlice = arrayBuffer.slice(0, Math.min(10000, arrayBuffer.byteLength));
  const headerString = decoder.decode(headerSlice);
  
  const endHeaderMatch = headerString.match(/end_header\r?\n/);
  if (!endHeaderMatch) {
    throw new Error('Invalid PLY file: could not find end_header');
  }
  
  const headerEndIndex = endHeaderMatch.index + endHeaderMatch[0].length;
  const headerLines = headerString.slice(0, endHeaderMatch.index).split(/\r?\n/);
  
  let format = '';
  let vertexCount = 0;
  const properties = [];
  let inVertexElement = false;
  
  for (const line of headerLines) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === 'format') {
      format = parts[1];
    } else if (parts[0] === 'element') {
      if (parts[1] === 'vertex') {
        vertexCount = parseInt(parts[2], 10);
        inVertexElement = true;
      } else {
        inVertexElement = false;
      }
    } else if (parts[0] === 'property' && inVertexElement) {
      properties.push({ type: parts[1], name: parts[2] });
    }
  }
  
  if (vertexCount === 0) {
    throw new Error('No vertices found in PLY header');
  }
  
  // Calculate offsets and vertex size
  let vertexByteSize = 0;
  let offsets = {};
  
  for (const prop of properties) {
    offsets[prop.name] = vertexByteSize;
    if (['float', 'float32'].includes(prop.type)) {
      prop.byteSize = 4;
      prop.isFloat = true;
    } else if (['uchar', 'uint8'].includes(prop.type)) {
      prop.byteSize = 1;
      prop.isFloat = false;
    } else if (['int', 'int32'].includes(prop.type)) {
      prop.byteSize = 4;
      prop.isFloat = false;
    } else if (['double', 'float64'].includes(prop.type)) {
      prop.byteSize = 8;
      prop.isFloat = true;
    } else {
      prop.byteSize = 4; // fallback
      prop.isFloat = true;
    }
    vertexByteSize += prop.byteSize;
  }
  
  const hasColor = offsets.red !== undefined && offsets.green !== undefined && offsets.blue !== undefined;
  
  const positions = new Float32Array(vertexCount * 3);
  let colors = hasColor ? new Float32Array(vertexCount * 3) : null;
  
  let minZ = Infinity;
  let maxZ = -Infinity;
  
  if (format === 'binary_little_endian') {
    const dataView = new DataView(arrayBuffer, headerEndIndex);
    let offset = 0;
    
    for (let i = 0; i < vertexCount; i++) {
      const pIdx = i * 3;
      
      const x = dataView.getFloat32(offset + offsets.x, true);
      const y = dataView.getFloat32(offset + offsets.y, true);
      const z = dataView.getFloat32(offset + offsets.z, true);
      
      positions[pIdx] = x;
      positions[pIdx + 1] = y;
      positions[pIdx + 2] = z;
      
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
      
      if (hasColor) {
        // usually colors are uchar (0-255), normalize to 0-1
        colors[pIdx] = dataView.getUint8(offset + offsets.red) / 255;
        colors[pIdx + 1] = dataView.getUint8(offset + offsets.green) / 255;
        colors[pIdx + 2] = dataView.getUint8(offset + offsets.blue) / 255;
      }
      
      offset += vertexByteSize;
    }
  } else if (format === 'ascii') {
    // Need to read the rest of the file as text
    const fullText = decoder.decode(arrayBuffer.slice(headerEndIndex));
    const lines = fullText.split(/\r?\n/);
    
    let lineIdx = 0;
    for (let i = 0; i < vertexCount; i++) {
      while (lineIdx < lines.length && lines[lineIdx].trim() === '') lineIdx++;
      if (lineIdx >= lines.length) break;
      
      const parts = lines[lineIdx].trim().split(/\s+/);
      const pIdx = i * 3;
      
      const x = parseFloat(parts[properties.findIndex(p => p.name === 'x')]);
      const y = parseFloat(parts[properties.findIndex(p => p.name === 'y')]);
      const z = parseFloat(parts[properties.findIndex(p => p.name === 'z')]);
      
      positions[pIdx] = x;
      positions[pIdx + 1] = y;
      positions[pIdx + 2] = z;
      
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
      
      if (hasColor) {
        const rIdx = properties.findIndex(p => p.name === 'red');
        const gIdx = properties.findIndex(p => p.name === 'green');
        const bIdx = properties.findIndex(p => p.name === 'blue');
        
        // check if they are floats or uchars based on type in ascii
        const rProp = properties[rIdx];
        const divisor = ['uchar', 'uint8'].includes(rProp.type) ? 255 : 1;
        
        colors[pIdx] = parseFloat(parts[rIdx]) / divisor;
        colors[pIdx + 1] = parseFloat(parts[gIdx]) / divisor;
        colors[pIdx + 2] = parseFloat(parts[bIdx]) / divisor;
      }
      
      lineIdx++;
    }
  } else {
    throw new Error('Unsupported PLY format: ' + format);
  }
  
  // Apply Z-height color gradient if no colors provided natively
  if (!hasColor) {
    colors = new Float32Array(vertexCount * 3);
    const zRange = maxZ - minZ || 1; // avoid divide by zero
    
    for (let i = 0; i < vertexCount; i++) {
      const z = positions[i * 3 + 2];
      const normalizedZ = (z - minZ) / zRange; // 0 to 1
      
      // Gradient: blue (0) -> cyan -> green -> yellow -> red (1)
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
  
  return { positions, colors, vertexCount };
}
