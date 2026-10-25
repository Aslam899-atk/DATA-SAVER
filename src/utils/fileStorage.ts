import type { DroppedFileItem } from '../types/game';

const DB_NAME = 'GtaFileDropperDB';
const STORE_NAME = 'dropped_files';
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDroppedFile(item: DroppedFileItem): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save dropped file to IndexedDB', err);
  }
}

export async function loadDroppedFiles(): Promise<DroppedFileItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const now = Date.now();
        const files: DroppedFileItem[] = request.result || [];
        // Filter out expired crates or max-claimed crates
        const activeFiles = files.filter((f) => {
          if (f.expiresAt && now > f.expiresAt) return false;
          if (f.maxClaims > 0 && f.claimedCount >= f.maxClaims) return false;
          return true;
        });
        resolve(activeFiles);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to load dropped files from IndexedDB', err);
    return [];
  }
}

export async function claimFileDownload(id: string): Promise<{ remainingClaims: number; isExpired: boolean }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const file: DroppedFileItem | undefined = request.result;
        if (!file) {
          resolve({ remainingClaims: 0, isExpired: true });
          return;
        }

        file.claimedCount = (file.claimedCount || 0) + 1;
        const reachedLimit = file.maxClaims > 0 && file.claimedCount >= file.maxClaims;

        if (reachedLimit) {
          store.delete(id);
          resolve({ remainingClaims: 0, isExpired: true });
        } else {
          store.put(file);
          const remaining = file.maxClaims > 0 ? file.maxClaims - file.claimedCount : 999;
          resolve({ remainingClaims: remaining, isExpired: false });
        }
      };
      request.onerror = () => resolve({ remainingClaims: 0, isExpired: true });
    });
  } catch (e) {
    return { remainingClaims: 0, isExpired: true };
  }
}

export async function deleteDroppedFile(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete dropped file from IndexedDB', err);
  }
}
