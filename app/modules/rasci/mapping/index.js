// RASCI Mapping Index - Main exports for RASCI to RALph mapping system
// Clean, organized RASCI to RALph mapping system

import { rasciManager } from '../core/matrix-manager.js';
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
  onRasciMatrixUpdated
} from './auto-mapper.js';

import { mappingBridge } from './integration-bridge.js';

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
  
  // Integration bridge
  mappingBridge
};

// Initialize the system when this module is loaded
// El sistema modular maneja las funciones sin necesidad de window global
// Las funciones están disponibles a través de exports

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initRasciMapping();
    });
  } else {
    initRasciMapping();
  }
}
