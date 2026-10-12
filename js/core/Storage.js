/**
 * Storage Manager - IndexedDB + LocalStorage Wrapper
 * Menyimpan data riwayat download, data kendaraan, nota servis terkompresi, dan konfigurasi.
 */

const DB_NAME = 'AllInOneUtilityDB';
const DB_VERSION = 1;

class StorageManager {
  constructor() {
    this.db = null;
    this.isDbReady = false;
    this.initPromise = this.initIndexedDB();
  }

  /**
   * Inisialisasi IndexedDB
   */
  async initIndexedDB() {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      console.warn('[Storage] IndexedDB tidak didukung atau di luar browser, menggunakan memory fallback.');
      return null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store untuk riwayat download
        if (!db.objectStoreNames.contains('downloads')) {
          const store = db.createObjectStore('downloads', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        // Store untuk kendaraan & komponen
        if (!db.objectStoreNames.contains('vehicles')) {
          const store = db.createObjectStore('vehicles', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
        }

        // Store untuk catatan servis & nota
        if (!db.objectStoreNames.contains('services')) {
          const store = db.createObjectStore('services', { keyPath: 'id' });
          store.createIndex('vehicleId', 'vehicleId', { unique: false });
          store.createIndex('nextDueDate', 'nextDueDate', { unique: false });
        }

        // Store untuk template frame studio
        if (!db.objectStoreNames.contains('frames')) {
          db.createObjectStore('frames', { keyPath: 'id' });
        }

        // Store konfigurasi / generic key-val
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isDbReady = true;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[Storage] Gagal membuka IndexedDB:', event.target.error);
        resolve(null);
      };
    });
  }

  async ensureDb() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  // ==================== GENERIC STORE METHODS ====================

  async getAll(storeName) {
    const db = await this.ensureDb();
    if (!db) {
      return this.getLocalFallback(storeName) || [];
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      } catch (err) {
        console.error(`[Storage getAll ${storeName}] Error:`, err);
        resolve(this.getLocalFallback(storeName) || []);
      }
    });
  }

  async getById(storeName, id) {
    const db = await this.ensureDb();
    if (!db) {
      const all = this.getLocalFallback(storeName) || [];
      return all.find(item => item.id === id);
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } catch (err) {
        console.error(`[Storage getById ${storeName}] Error:`, err);
        resolve(null);
      }
    });
  }

  async put(storeName, item) {
    const db = await this.ensureDb();
    if (!db) {
      const all = this.getLocalFallback(storeName) || [];
      const index = all.findIndex(x => x.id === item.id);
      if (index >= 0) all[index] = item;
      else all.push(item);
      this.setLocalFallback(storeName, all);
      return item;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
      } catch (err) {
        console.error(`[Storage put ${storeName}] Error:`, err);
        reject(err);
      }
    });
  }

  async delete(storeName, id) {
    const db = await this.ensureDb();
    if (!db) {
      const all = this.getLocalFallback(storeName) || [];
      this.setLocalFallback(storeName, all.filter(x => x.id !== id));
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      } catch (err) {
        console.error(`[Storage delete ${storeName}] Error:`, err);
        reject(err);
      }
    });
  }

  async clear(storeName) {
    const db = await this.ensureDb();
    if (!db) {
      this.setLocalFallback(storeName, []);
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      } catch (err) {
        console.error(`[Storage clear ${storeName}] Error:`, err);
        reject(err);
      }
    });
  }

  // ==================== LOCALSTORAGE FALLBACK & SETTINGS ====================

  getLocalFallback(key) {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(`aio_fallback_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  setLocalFallback(key, val) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(`aio_fallback_${key}`, JSON.stringify(val));
    } catch (e) {
      console.warn('[Storage] LocalStorage quota exceeded or disabled:', e);
    }
  }

  getSetting(key, defaultValue = null) {
    try {
      if (typeof localStorage === 'undefined') return defaultValue;
      const item = localStorage.getItem(`aio_setting_${key}`);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  setSetting(key, value) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(`aio_setting_${key}`, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[Storage] Failed to save setting:', e);
      return false;
    }
  }
}

export const storage = new StorageManager();
