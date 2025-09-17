/**
 * Application State Management
 * Centralized state management for application flags and environment state
 */

import { getServiceRegistry } from '../modules/ui/core/ServiceRegistry.js';

// Internal state objects
const importState = {
  isImportingProject: false
};

const envState = {
  storageCleared: false
};

/**
 * Import State Manager
 */
export const ImportState = {
  get isImportingProject() {
    return importState.isImportingProject;
  },
  
  set isImportingProject(value) {
    importState.isImportingProject = value;
  }
};

/**
 * Environment State Manager
 */
export const EnvState = {
  get storageCleared() {
    return envState.storageCleared;
  },
  
  set storageCleared(value) {
    envState.storageCleared = value;
  }
};

/**
 * Register states in ServiceRegistry
 */
export function registerApplicationStates() {
  const registry = getServiceRegistry();
  if (registry) {
    registry.register('ImportState', ImportState, {
      description: 'Manages import operation state'
    });
    registry.register('EnvState', EnvState, {
      description: 'Manages environment state flags'
    });
  }
}

// Auto-register when module is imported
registerApplicationStates();


















