import { getServiceRegistry } from '../modules/ui/core/ServiceRegistry.js';

export class ProjectInfoService {
  constructor() {
    this.defaultName = 'Nuevo Diagrama';
    this.currentName = this._loadStoredName() || this.defaultName;
    this._syncUI(this.currentName);
    this._syncImportExportManager(this.currentName);
  }

  _loadStoredName() {
    try {
      return localStorage.getItem('projectName');
    } catch (_) {
      return null;
    }
  }

  _storeName(name) {
    try {
      localStorage.setItem('projectName', name);
    } catch (_) { /* ignore */ }
  }

  _clearStoredName() {
    try {
      localStorage.removeItem('projectName');
    } catch (_) { /* ignore */ }
  }

  _syncUI(name) {
    try {
      const input = document.getElementById('project-name-input');
      if (input && input.value !== name) input.value = name;
      if (typeof window !== 'undefined') window.currentProjectName = name;
      document.title = name;
    } catch (_) { /* ignore */ }
  }

  _syncImportExportManager(name) {
    try {
      const registry = getServiceRegistry();
      const importManager = registry ? registry.get('ImportExportManager') : null;
      if (importManager && typeof importManager.setProjectName === 'function') {
        importManager.setProjectName(name);
      }
    } catch (_) { /* ignore */ }
  }

  getName() {
    return this.currentName;
  }

  setName(name) {
    const finalName = (name && String(name).trim()) || this.defaultName;
    this.currentName = finalName;
    this._storeName(finalName);
    this._syncUI(finalName);
    this._syncImportExportManager(finalName);
    return finalName;
  }

  resetToDefault() {
    this._clearStoredName();
    return this.setName(this.defaultName);
  }

  deriveFromFileName(fileName, fallback = 'Diagrama BPMN') {
    const base = (fileName || '').replace(/\.[^.]+$/, '');
    const name = base || fallback || this.defaultName;
    return this.setName(name);
  }
}

// Register singleton in ServiceRegistry
export function registerProjectInfoService() {
  const registry = getServiceRegistry();
  if (!registry) return null;
  let instance = registry.get('ProjectInfoService');
  if (!instance) {
    instance = new ProjectInfoService();
    registry.register('ProjectInfoService', instance, { description: 'Manages project name and related UI/storage sync' });
  }
  return instance;
}


