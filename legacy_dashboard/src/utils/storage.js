// ANNOTATION: LocalStorage helper to save/load annotated 3D zones for backward compatibility and quick sync access.
export function saveZonesToStorage(mapName, zones) {
  localStorage.setItem(`zones_${mapName}`, JSON.stringify(zones));
}

export function loadZonesFromStorage(mapName) {
  return JSON.parse(localStorage.getItem(`zones_${mapName}`) || '[]');
}
