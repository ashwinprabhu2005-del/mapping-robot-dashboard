// ANNOTATION: Integrated chunk uploader utility from mapping-robot-dashboard
// Handles chunked uploads of large 3D models (GLB/GLTF) to IndexedDB store
import { storageService } from './storageService';

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export async function uploadFileChunked(file, onProgress) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const chunks = [];
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    chunks.push(chunk);
    
    const percentage = Math.round(((i + 1) / totalChunks) * 100);
    if (onProgress) {
      onProgress({
        currentChunk: i + 1,
        totalChunks,
        percentage
      });
    }
    
    // Tiny delay to allow UI to render progress smoothly
    await new Promise(r => setTimeout(r, 100)); 
  }
  
  // Reconstruct the file from chunks
  const reconstructedBlob = new Blob(chunks, { type: file.type || 'model/gltf-binary' });
  
  const mapMetadata = {
    id: Date.now().toString(),
    name: file.name.replace('.glb', '').replace('.gltf', ''),
    size: file.size,
    modified: file.lastModified || Date.now()
  };
  
  await storageService.saveMapData(mapMetadata, reconstructedBlob);
  return mapMetadata;
}
