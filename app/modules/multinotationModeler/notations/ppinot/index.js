import PPINOTRenderer from './PPINOTRenderer';
import PPINOTRules from './PPINOTRules';
import PPINOTUpdater from './PPINOTUpdater';
import PPINOTBpmnUpdater from './PPINOTBpmnUpdater';
import PPINOTPalette from './PPINOTPalette';
import PPINOTContextPadProvider from './PPINOTContextPadProvider';
import PPINOTReplaceMenuProvider from './PPINOTReplaceMenuProvider';
import PPINOTLabelProvider from './PPINOTLabelProvider';
import PPINOTOrderingProvider from './PPINOTOrderingProvider';

// PPINOT Module configuration
const PPINOTModule = {
  __init__: [
    'PPINOTRenderer',
    'PPINOTRules',
    'PPINOTUpdater',
    'PPINOTContextPadProvider',
    'PPINOTReplaceMenuProvider',
    'PPINOTLabelProvider',
    'PPINOTOrderingProvider',
    'bpmnUpdater'
  ],
  PPINOTRules: ['type', PPINOTRules],
  PPINOTUpdater: ['type', PPINOTUpdater],
  PPINOTContextPadProvider: ['type', PPINOTContextPadProvider],
  PPINOTReplaceMenuProvider: ['type', PPINOTReplaceMenuProvider],
  PPINOTLabelProvider: ['type', PPINOTLabelProvider],
  PPINOTOrderingProvider: ['type', PPINOTOrderingProvider],
  bpmnUpdater: ['type', PPINOTBpmnUpdater],
  PPINOTRenderer: ['type', PPINOTRenderer]
};

// Export the module configuration for BPMN-JS compatibility
export default PPINOTModule;

/**
 * Initialize the PPINOT module
 * @param {Object} options - Configuration options
 * @returns {Object} - PPINOT module instance
 */
export function initialize(options = {}) {
  // Optimización: Log eliminado para mejorar rendimiento
  // console.log('[PPINOT] Initializing PPINOT module');
  
  const ppinotManager = {
    type: 'ppinot',
    elements: [],
    
    // Method to synchronize with BPMN elements
    syncWithBPMN: (bpmnElements) => {
      // Optimización: Reducir logs de debug para mejorar rendimiento
      // console.log('[PPINOT] Synchronizing with BPMN elements:', bpmnElements.length);
      
      // Existing synchronization logic
      if (options.eventBus) {
        options.eventBus.publish('ppinot.synchronized', { elements: ppinotManager.elements });
      }
    }
  };
  
  // Set up event listeners
  if (options.eventBus) {
    options.eventBus.subscribe('bpmn.element.added', (event) => {
      // React to BPMN element added
      console.log('[PPINOT] BPMN element added:', event.element.id);
    });
  }
  
  return ppinotManager;
}

/**
 * Register the PPINOT module with the MultiNotation Modeler Core
 * @param {Object} core - MultiNotation Modeler Core instance
 */
export function registerWith(core) {
  if (!core || typeof core.registerModule !== 'function') {
    console.error('[PPINOT] Invalid core provided for registration');
    return;
  }
  
  core.registerModule('ppinot', {
    name: 'PPINOT',
    description: 'Process Performance Indicators Notation',
    initialize
  });
  
  // Optimización: Log eliminado para mejorar rendimiento
  // console.log('[PPINOT] Registered with MultiNotation Modeler Core');
}
