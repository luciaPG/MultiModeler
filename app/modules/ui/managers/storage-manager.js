// Simple StorageManager facade used by tests and real system validation
// Provides minimal save/load/clear/reset/backup API over localStorage

export default class StorageManager {
  constructor(options = {}) {
    this.namespace = options.namespace || 'multinotation';
  }

  _key(key) {
    return `${this.namespace}:${key}`;
  }

  async save(key, data) {
    // Compat: permitir save(data) sin clave → usar clave por defecto 'project'
    if (data === undefined) {
      data = key;
      key = 'project';
    }
    try {
      const serialized = JSON.stringify({ data, timestamp: new Date().toISOString() });
      try {
        localStorage.setItem(this._key(key), serialized);
        return { success: true, key: this._key(key) };
      } catch (e) {
        // Fallback minimal: intentar guardar versión reducida
        const reduced = JSON.stringify({
          data: (data && data.welcomeScreenFormat) ? data.welcomeScreenFormat : data,
          timestamp: new Date().toISOString(),
          minimized: true
        });
        try {
          localStorage.setItem(this._key(key), reduced);
          return { success: true, key: this._key(key), minimized: true };
        } catch (e2) {
          return { success: false, error: e2 };
        }
      }
    } catch (error) {
      return { success: false, error };
    }
  }

  async load(key) {
    try {
      const raw = localStorage.getItem(this._key(key));
      if (!raw) return { success: false, error: 'NotFound' };
      const parsed = JSON.parse(raw);
      return { success: true, data: parsed.data, timestamp: parsed.timestamp };
    } catch (error) {
      return { success: false, error };
    }
  }

  clearStorage(predicate) {
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(`${this.namespace}:`) || (typeof predicate === 'function' && predicate(k)))) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
      return true;
    } catch (e) {
      return false;
    }
  }

  async createBackup(key = 'backup') {
    try {
      const snapshot = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${this.namespace}:`)) {
          snapshot[k] = localStorage.getItem(k);
        }
      }
      return this.save(key, { snapshot });
    } catch (error) {
      return { success: false, error };
    }
  }

  async prepareForImport() {
    // Clear project-specific keys but keep general app state if any
    const ok = this.clearStorage((k) => k.startsWith(`${this.namespace}:project:`));
    return ok;
  }

  async resetStorage() {
    this.clearStorage((k) => k.startsWith(`${this.namespace}:`));
    // Create a minimal clean state marker
    await this.save('state', { initialized: true });
    return true;
  }
}

export { StorageManager };

// Registro automático en ServiceRegistry para entornos de test y runtime sin bootstrap
try {
  // Ruta relativa desde este archivo
  const { getServiceRegistry } = require('../core/ServiceRegistry.js');
  const sr = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
  if (sr && !sr.get('StorageManager')) {
    const defaultInstance = new StorageManager({ namespace: 'multinotation' });
    sr.register('StorageManager', defaultInstance, { description: 'StorageManager auto-registrado' });
    // Función de ayuda usada por algunos tests
    sr.registerFunction && sr.registerFunction('saveProjectSnapshot', (data) => defaultInstance.save('project', data));
  }
} catch (_) { /* no-op en builds sin ServiceRegistry */ }


