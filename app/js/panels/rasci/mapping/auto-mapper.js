// RASCI Mapping Auto - Clean Version
// Automatic mapping functionality

import { executeSimpleRasciMapping } from './main-mapper.js';
import { completeRasciCleanup } from './cleanup-utils.js';

function executeAutoMappingWithCleanup(modeler, matrix) {
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: 0
  };
  
  const cleanupCount = completeRasciCleanup(modeler, matrix);
  results.elementsRemoved = cleanupCount;
  
  let hasActiveResponsibilities = false;
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        hasActiveResponsibilities = true;
      }
    });
  });
  
  if (!hasActiveResponsibilities) {
    return results;
  }
  
  return executeSimpleRasciMapping(modeler, matrix);
}

// Define as local variable first
const rasciAutoMapping = {
  enabled: false,
  debounceTimer: null,
  smartTimer: null,
  
  enable() {
    this.enabled = true;
    if (window.bpmnModeler && window.rasciMatrixData && Object.keys(window.rasciMatrixData).length > 0) {
      this.triggerMapping();
    }
  },
  
  disable() {
    this.enabled = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.smartTimer) {
      clearTimeout(this.smartTimer);
      this.smartTimer = null;
    }
  },
  
  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  },
  
  triggerMapping() {
    if (!this.enabled) {
      return;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      onRasciMatrixUpdated();
    }, 200);
  },
  
  triggerSmartMapping() {
    if (!this.enabled) return;
    
    if (this.smartTimer) {
      clearTimeout(this.smartTimer);
    }
    
    this.smartTimer = setTimeout(() => {
      if (window.bpmnModeler && window.rasciMatrixData) {
        try {
          const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
        } catch (error) {
          // Handle error silently
        }
      }
    }, 200);
  }
};

// Define as local function first
function onRasciMatrixUpdated() {
  if (!rasciAutoMapping || !rasciAutoMapping.enabled) {
    return;
  }
  
  if (!window.bpmnModeler) {
    return;
  }
  
  if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
    return;
  }
  
  let hasActiveResponsibilities = false;
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        hasActiveResponsibilities = true;
      }
    });
  });
  
  if (!hasActiveResponsibilities) {
    try {
      const elementsRemoved = completeRasciCleanup(window.bpmnModeler, window.rasciMatrixData);
    } catch (error) {
      // Handle error silently
    }
    return;
  }
  
  try {
    if (rasciAutoMapping.debounceTimer) {
      clearTimeout(rasciAutoMapping.debounceTimer);
    }
    
    const results = executeAutoMappingWithCleanup(window.bpmnModeler, window.rasciMatrixData);
    
  } catch (error) {
    setTimeout(() => {
      try {
        syncRasciConnections();
      } catch (recoveryError) {
        // Handle error silently
      }
    }, 500);
  }
}

// Define as local function first
function executeRasciToRalphMapping() {
  if (!window.bpmnModeler) {
    return;
  }

  if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
    return;
  }
  
  try {
    const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
  } catch (error) {
    // Handle error silently
  }
}

// Define as local function first
function syncRasciConnections() {
  if (!window.bpmnModeler) {
    return;
  }
  
  if (!window.rasciMatrixData) {
    return;
  }
  
  try {
    const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
  } catch (error) {
    // Handle error silently
  }
}

// Export as named exports
export {
  executeAutoMappingWithCleanup,
  rasciAutoMapping,
  onRasciMatrixUpdated,
  executeRasciToRalphMapping,
  syncRasciConnections
};

// Assign to window for backward compatibility
if (typeof window !== 'undefined') {
  window.rasciAutoMapping = rasciAutoMapping;
  window.onRasciMatrixUpdated = onRasciMatrixUpdated;
  window.executeRasciToRalphMapping = executeRasciToRalphMapping;
  window.syncRasciConnections = syncRasciConnections;
} 