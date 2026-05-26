// ANNOTATION: Integrated IndexedDB storage service from mapping-robot-dashboard
// Hosts persistent database schema for storing client-side 3D maps and point clouds.
const DB_NAME = 'MappingDashboardDB';
const DB_VERSION = 1;

let db = null;

export const storageService = {
  async init() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = (e) => reject(e.target.error);
      
      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains('maps')) {
          database.createObjectStore('maps', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('map_files')) {
          database.createObjectStore('map_files', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('zones')) {
          database.createObjectStore('zones', { keyPath: 'mapId' });
        }
      };
    });
  },

  async requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persisted storage granted: ${isPersisted}`);
      return isPersisted;
    }
    return false;
  },

  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      return await navigator.storage.estimate();
    }
    return { quota: 0, usage: 0 };
  },

  async getAllMaps() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['maps'], 'readonly');
      const store = transaction.objectStore('maps');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async saveMapData(mapMetadata, blob) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['maps', 'map_files'], 'readwrite');
      
      transaction.oncomplete = () => resolve(mapMetadata);
      transaction.onerror = (e) => reject(e.target.error);
      
      const mapStore = transaction.objectStore('maps');
      const fileStore = transaction.objectStore('map_files');
      
      mapStore.put(mapMetadata);
      fileStore.put({ id: mapMetadata.id, blob: blob });
    });
  },

  async getMapFile(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['map_files'], 'readonly');
      const store = transaction.objectStore('map_files');
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async deleteMap(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['maps', 'map_files', 'zones'], 'readwrite');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
      
      transaction.objectStore('maps').delete(id);
      transaction.objectStore('map_files').delete(id);
      try { transaction.objectStore('zones').delete(id); } catch(e){}
    });
  },
  
  async saveZones(mapId, zones) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['zones'], 'readwrite');
      const store = transaction.objectStore('zones');
      const request = store.put({ mapId, zones });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  },
  
  async loadZones(mapId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['zones'], 'readonly');
      const store = transaction.objectStore('zones');
      const request = store.get(mapId);
      request.onsuccess = () => resolve(request.result ? request.result.zones : []);
      request.onerror = (e) => reject(e.target.error);
    });
  }
};
