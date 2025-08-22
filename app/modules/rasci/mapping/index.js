// RASCI Mapping Index - Main exports for RASCI to RALph mapping system
// Clean, organized RASCI to RALph mapping system

import { 
  getElementName, 
  saveOriginalFlow, 
  findBpmnTaskByName, 
  createRalphRole, 
  findExistingAndGate, 
  createAndGate, 
  createSimpleAssignment,
  originalFlowMap,
  pendingReconnections
} from './core-functions.js';

import { 
  cleanupOrphanedElements, 
  completeRasciCleanup, 
  cleanupUnusedRoles 
} from './cleanup-utils.js';

import { 
  findNextTaskInOriginalFlow,
  createSpecialElement,
  createSequentialSpecialElements,
  restoreFlowAfterApprovalRemoval,
  restoreBpmnFlow,
  restoreFlowByElementNames
} from './element-manager.js';

import { 
  executeSimpleRasciMapping, 
  executeSmartRasciMapping, 
  initRasciMapping 
} from './main-mapper.js';

import { 
  executeAutoMappingWithCleanup,
  rasciAutoMapping,
  onRasciMatrixUpdated,
  executeRasciToRalphMapping,
  syncRasciConnections
} from './auto-mapper.js';

// Export all functions for external use
export {
  // Core functions
  getElementName,
  saveOriginalFlow,
  findBpmnTaskByName,
  createRalphRole,
  findExistingAndGate,
  createAndGate,
  createSimpleAssignment,
  originalFlowMap,
  pendingReconnections,
  
  // Cleanup functions
  cleanupOrphanedElements,
  completeRasciCleanup,
  cleanupUnusedRoles,
  
  // Element functions
  findNextTaskInOriginalFlow,
  createSpecialElement,
  createSequentialSpecialElements,
  restoreFlowAfterApprovalRemoval,
  restoreBpmnFlow,
  restoreFlowByElementNames,
  
  // Main mapping functions
  executeSimpleRasciMapping,
  executeSmartRasciMapping,
  executeAutoMappingWithCleanup,
  initRasciMapping,
  
  // Auto mapping functions
  rasciAutoMapping,
  onRasciMatrixUpdated,
  executeRasciToRalphMapping,
  syncRasciConnections
};

// Initialize the system when this module is loaded
if (typeof window !== 'undefined') {
  // Set up global functions for backward compatibility
  window.executeSimpleRasciMapping = executeSimpleRasciMapping;
  window.executeSmartRasciMapping = executeSmartRasciMapping;
  window.executeAutoMappingWithCleanup = executeAutoMappingWithCleanup;
  window.initRasciMapping = initRasciMapping;
  window.rasciAutoMapping = rasciAutoMapping;
  window.onRasciMatrixUpdated = onRasciMatrixUpdated;
  window.executeRasciToRalphMapping = executeRasciToRalphMapping;
  window.syncRasciConnections = syncRasciConnections;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initRasciMapping();
    });
  } else {
    initRasciMapping();
  }
}
