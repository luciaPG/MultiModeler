import RALphContextPadProvider from './RALphContextPadProvider';
import RALphOrderingProvider from './RALphOrderingProvider';
import RALphPalette from './RALphPalette';
import RALphRenderer from './RALphRenderer';
import RALphRules from './RALphRules';
import RALphUpdater from './RALphUpdater';
import RALPHLabelProvider from './RALphLabelProvider';
import RALphLabelEditingProvider from './RALphLabelEditingProvider';

// RALPH Module configuration
const RALPHModule = {
  __init__: [
    'RALphContextPadProvider',
    'RALphOrderingProvider',
    'RALphRenderer',
    'RALphRules',
    'RALphUpdater',
    'RALPHLabelProvider',
    'RALphLabelEditingProvider',
  ],
  RALphContextPadProvider: [ 'type', RALphContextPadProvider ],
  RALphOrderingProvider: [ 'type', RALphOrderingProvider ],
  RALphRenderer: [ 'type', RALphRenderer ],
  RALphRules: [ 'type', RALphRules ],
  RALphUpdater: [ 'type', RALphUpdater ],
  RALPHLabelProvider: [ 'type', RALPHLabelProvider ],
  RALphLabelEditingProvider: [ 'type', RALphLabelEditingProvider ],
};

// Export the module configuration for BPMN-JS compatibility
export default RALPHModule;

/**
 * Initialize the RALPH module
 * @param {Object} options - Configuration options
 * @returns {Object} - RALPH module instance
 */
export function initialize(options = {}) {
  // Optimización: Log eliminado para mejorar rendimiento
  // console.log('[RALPH] Initializing RALPH module');
  
  const ralphManager = {
    type: 'ralph',
    roles: [],
    
    // Method to synchronize with RASCI matrix
    syncWithRASCI: (rasciMatrix) => {
      console.log('[RALPH] Synchronizing with RASCI matrix');
      
      // Update RALPH roles based on RASCI changes
      if (rasciMatrix && rasciMatrix.roles) {
        ralphManager.roles = rasciMatrix.roles.map(role => ({
          id: role.id,
          name: role.name,
          description: role.description || ''
        }));
      }
      
      // Notify subscribers
      if (options.eventBus) {
        options.eventBus.publish('ralph.synchronized', { roles: ralphManager.roles });
      }
    }
  };
  
  // Set up event listeners
  if (options.eventBus) {
    options.eventBus.subscribe('rasci.matrix.updated', (event) => {
      // React to RASCI matrix updates
      ralphManager.syncWithRASCI(event.matrix);
    });
  }
  
  return ralphManager;
}

/**
 * Register the RALPH module with the MultiNotation Modeler Core
 * @param {Object} core - MultiNotation Modeler Core instance
 */
export function registerWith(core) {
  if (!core || typeof core.registerModule !== 'function') {
    console.error('[RALPH] Invalid core provided for registration');
    return;
  }
  
  core.registerModule('ralph', {
    name: 'RALPH',
    description: 'Resource Assignment Language for Process Handling',
    initialize
  });
  
  // Optimización: Log eliminado para mejorar rendimiento
  // console.log('[RALPH] Registered with MultiNotation Modeler Core');
}
