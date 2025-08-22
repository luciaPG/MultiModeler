// Storage Manager - Facade for different storage mechanisms
// This class provides a unified interface for different storage backends

/**
 * Base storage adapter interface
 */
class StorageAdapter {
  constructor() {
    if (this.constructor === StorageAdapter) {
      throw new Error('StorageAdapter is abstract and cannot be instantiated directly');
    }
  }
  
  async save(key, value, options = {}) {
    throw new Error('Method save() must be implemented by subclass');
  }
  
  async load(key, options = {}) {
    throw new Error('Method load() must be implemented by subclass');
  }
  
  async delete(key, options = {}) {
    throw new Error('Method delete() must be implemented by subclass');
  }
  
  async list(options = {}) {
    throw new Error('Method list() must be implemented by subclass');
  }
}

/**
 * LocalStorage adapter
 */
class LocalStorageAdapter extends StorageAdapter {
  constructor() {
    super();
  }
  
  async save(key, value, options = {}) {
    try {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, serializedValue);
      return { success: true };
    } catch (error) {
      console.error(`[LocalStorageAdapter] Error saving ${key}:`, error);
      return { success: false, error };
    }
  }
  
  async load(key, options = {}) {
    try {
      const serializedValue = localStorage.getItem(key);
      if (serializedValue === null) {
        return { success: false, error: 'Item not found' };
      }
      
      try {
        // Try to parse as JSON first
        const value = JSON.parse(serializedValue);
        return { success: true, value };
      } catch (e) {
        // If not valid JSON, return as string
        return { success: true, value: serializedValue };
      }
    } catch (error) {
      console.error(`[LocalStorageAdapter] Error loading ${key}:`, error);
      return { success: false, error };
    }
  }
  
  async delete(key, options = {}) {
    try {
      localStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      console.error(`[LocalStorageAdapter] Error deleting ${key}:`, error);
      return { success: false, error };
    }
  }
  
  async list(options = {}) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      return { success: true, keys };
    } catch (error) {
      console.error(`[LocalStorageAdapter] Error listing keys:`, error);
      return { success: false, error };
    }
  }
}

/**
 * IndexedDB adapter
 */
class IndexedDBAdapter extends StorageAdapter {
  constructor() {
    super();
    this.dbName = 'multiNotationModeler';
    this.storeName = 'modelData';
    this.db = null;
  }
  
  async openDatabase() {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = (event) => {
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }
  
  async save(key, value, options = {}) {
    try {
      const db = await this.openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);
        
        request.onsuccess = () => resolve({ success: true });
        request.onerror = (event) => {
          reject({ success: false, error: event.target.error });
        };
      });
    } catch (error) {
      console.error(`[IndexedDBAdapter] Error saving ${key}:`, error);
      return { success: false, error };
    }
  }
  
  async load(key, options = {}) {
    try {
      const db = await this.openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        
        request.onsuccess = (event) => {
          const value = event.target.result;
          if (value === undefined) {
            resolve({ success: false, error: 'Item not found' });
          } else {
            resolve({ success: true, value });
          }
        };
        
        request.onerror = (event) => {
          reject({ success: false, error: event.target.error });
        };
      });
    } catch (error) {
      console.error(`[IndexedDBAdapter] Error loading ${key}:`, error);
      return { success: false, error };
    }
  }
  
  async delete(key, options = {}) {
    try {
      const db = await this.openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve({ success: true });
        request.onerror = (event) => {
          reject({ success: false, error: event.target.error });
        };
      });
    } catch (error) {
      console.error(`[IndexedDBAdapter] Error deleting ${key}:`, error);
      return { success: false, error };
    }
  }
  
  async list(options = {}) {
    try {
      const db = await this.openDatabase();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();
        
        request.onsuccess = (event) => {
          resolve({ success: true, keys: event.target.result });
        };
        
        request.onerror = (event) => {
          reject({ success: false, error: event.target.error });
        };
      });
    } catch (error) {
      console.error(`[IndexedDBAdapter] Error listing keys:`, error);
      return { success: false, error };
    }
  }
}

/**
 * File System Access adapter
 * Uses the modern File System Access API
 */
class FileSystemAdapter extends StorageAdapter {
  constructor() {
    super();
    this.fileHandles = new Map();
    this.directoryHandle = null;
  }
  
  async requestPermission(fileHandle) {
    if (!fileHandle) return false;
    
    // Check if permission was already granted
    const options = { mode: 'readwrite' };
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    
    // Request permission
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true;
    }
    
    return false;
  }
  
  async selectDirectory() {
    try {
      this.directoryHandle = await window.showDirectoryPicker({
        startIn: 'documents',
        mode: 'readwrite'
      });
      return { success: true, directoryHandle: this.directoryHandle };
    } catch (error) {
      console.error('[FileSystemAdapter] Error selecting directory:', error);
      return { success: false, error };
    }
  }
  
  async save(key, value, options = {}) {
    try {
      let fileHandle = this.fileHandles.get(key);
      const createNewFile = !fileHandle || options.saveAs;
      
      // If no file handle exists or saveAs option is true, create a new file
      if (createNewFile) {
        // If directory handle is available, create file in it
        if (this.directoryHandle) {
          try {
            fileHandle = await this.directoryHandle.getFileHandle(key, { create: true });
          } catch (error) {
            console.error(`[FileSystemAdapter] Error creating file ${key} in directory:`, error);
          }
        }
        
        // Fall back to file picker if needed
        if (!fileHandle) {
          fileHandle = await window.showSaveFilePicker({
            suggestedName: key,
            types: [
              {
                description: 'XML Files',
                accept: {
                  'text/xml': ['.xml', '.bpmn']
                }
              },
              {
                description: 'JSON Files',
                accept: {
                  'application/json': ['.json']
                }
              }
            ]
          });
        }
        
        this.fileHandles.set(key, fileHandle);
      }
      
      // Check permissions
      const hasPermission = await this.requestPermission(fileHandle);
      if (!hasPermission) {
        return { success: false, error: 'Permission denied' };
      }
      
      // Create a writable stream
      const writable = await fileHandle.createWritable();
      
      // Convert value to string if needed
      const data = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      
      // Write data and close the stream
      await writable.write(data);
      await writable.close();
      
      return { success: true, path: fileHandle.name };
    } catch (error) {
      console.error(`[FileSystemAdapter] Error saving ${key}:`, error);
      return { success: false, error };
    }
  }
  
  async load(key, options = {}) {
    try {
      let fileHandle = this.fileHandles.get(key);
      
      // If no file handle exists or open option is true, open file picker
      if (!fileHandle || options.open) {
        try {
          fileHandle = await window.showOpenFilePicker({
            types: [
              {
                description: 'XML Files',
                accept: {
                  'text/xml': ['.xml', '.bpmn']
                }
              },
              {
                description: 'JSON Files',
                accept: {
                  'application/json': ['.json']
                }
              }
            ],
            multiple: false
          }).then(handles => handles[0]);
          
          this.fileHandles.set(key, fileHandle);
        } catch (error) {
          console.error('[FileSystemAdapter] Error opening file:', error);
          return { success: false, error };
        }
      }
      
      // Check permissions
      const hasPermission = await this.requestPermission(fileHandle);
      if (!hasPermission) {
        return { success: false, error: 'Permission denied' };
      }
      
      // Read file
      const file = await fileHandle.getFile();
      const text = await file.text();
      
      // Try to parse JSON, return as string if not valid JSON
      try {
        const json = JSON.parse(text);
        return { success: true, value: json, path: file.name };
      } catch (e) {
        return { success: true, value: text, path: file.name };
      }
    } catch (error) {
      console.error(`[FileSystemAdapter] Error loading ${key}:`, error);
      return { success: false, error };
    }
  }
  
  async delete(key, options = {}) {
    try {
      if (this.directoryHandle && this.fileHandles.has(key)) {
        await this.directoryHandle.removeEntry(this.fileHandles.get(key).name);
        this.fileHandles.delete(key);
        return { success: true };
      }
      return { success: false, error: 'File not found or no directory handle' };
    } catch (error) {
      console.error(`[FileSystemAdapter] Error deleting ${key}:`, error);
      return { success: false, error };
    }
  }
  
  async list(options = {}) {
    try {
      if (!this.directoryHandle) {
        return { success: false, error: 'No directory selected' };
      }
      
      const keys = [];
      for await (const [key] of this.directoryHandle.entries()) {
        keys.push(key);
      }
      return { success: true, keys };
    } catch (error) {
      console.error(`[FileSystemAdapter] Error listing keys:`, error);
      return { success: false, error };
    }
  }
}

/**
 * Storage Manager class - provides a unified interface for all storage mechanisms
 */
export class StorageManager {
  constructor(options = {}) {
    this.adapters = {
      localStorage: new LocalStorageAdapter(),
      indexedDB: new IndexedDBAdapter(),
      fileSystem: new FileSystemAdapter()
    };
    this.defaultAdapter = options.defaultAdapter || 'localStorage';
    
    // Add any custom adapters
    if (options.adapters) {
      for (const [name, adapter] of Object.entries(options.adapters)) {
        this.addAdapter(name, adapter);
      }
    }
  }
  
  /**
   * Add a custom storage adapter
   * @param {string} name - Name of the adapter
   * @param {StorageAdapter} adapter - Adapter instance
   */
  addAdapter(name, adapter) {
    if (!(adapter instanceof StorageAdapter)) {
      throw new Error('Adapter must inherit from StorageAdapter');
    }
    this.adapters[name] = adapter;
  }
  
  /**
   * Get a specific adapter
   * @param {string} adapterName - Name of the adapter to retrieve
   * @returns {StorageAdapter} The requested adapter
   */
  getAdapter(adapterName) {
    const adapter = adapterName ? this.adapters[adapterName] : this.adapters[this.defaultAdapter];
    if (!adapter) {
      throw new Error(`Storage adapter '${adapterName || this.defaultAdapter}' not found`);
    }
    return adapter;
  }
  
  /**
   * Save data using the specified adapter
   * @param {string} key - Key to save under
   * @param {any} value - Value to save
   * @param {Object} options - Options including adapter name
   * @returns {Promise<Object>} Result object
   */
  async save(key, value, options = {}) {
    const adapter = this.getAdapter(options.adapter);
    return adapter.save(key, value, options);
  }
  
  /**
   * Load data using the specified adapter
   * @param {string} key - Key to load
   * @param {Object} options - Options including adapter name
   * @returns {Promise<Object>} Result object with loaded value
   */
  async load(key, options = {}) {
    const adapter = this.getAdapter(options.adapter);
    return adapter.load(key, options);
  }
  
  /**
   * Delete data using the specified adapter
   * @param {string} key - Key to delete
   * @param {Object} options - Options including adapter name
   * @returns {Promise<Object>} Result object
   */
  async delete(key, options = {}) {
    const adapter = this.getAdapter(options.adapter);
    return adapter.delete(key, options);
  }
  
  /**
   * List keys using the specified adapter
   * @param {Object} options - Options including adapter name
   * @returns {Promise<Object>} Result object with list of keys
   */
  async list(options = {}) {
    const adapter = this.getAdapter(options.adapter);
    return adapter.list(options);
  }
}
