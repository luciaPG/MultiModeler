/**
 * Main Module Orchestrator
 * 
 * This is the main entry point for the modular monolith architecture.
 * It loads and orchestrates all the modules in the application.
 */

import { initMultiNotationModeler, MultiNotationModeler } from './multinotationModeler/index.js';
import * as ppinotModule from './multinotationModeler/notations/ppinot/index.js';
import * as ralphModule from './multinotationModeler/notations/ralph/index.js';
import * as rasciModule from './rasci/index.js';
import * as ppisModule from './ppis/index.js';

/**
 * Initialize the application with all modules
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Application instance
 */
export async function initializeApplication(options = {}) {
  console.log('[App] Initializing application with modular monolith architecture');
  
  try {
    // Initialize the MultiNotation Modeler core
    const multiNotationModeler = initMultiNotationModeler({
      ...options,
      bpmnModeler: options.bpmnModeler || window.modeler // Use provided modeler or global one
    });
    const core = multiNotationModeler.core;
    
    // Register modules with the core
    ppinotModule.registerWith(core);
    ralphModule.registerWith(core);
    
    // Initialize the core
    await multiNotationModeler.initialize();
    
    // Initialize independent modules
    const rasci = await rasciModule.initialize({
      eventBus: core.eventBus,
      core: core
    });
    
    const ppis = await ppisModule.initialize({
      eventBus: core.eventBus,
      core: core
    });
    
    console.log('[App] Application initialized successfully');
    
    // Return the application API
    return {
      core,
      multiNotationModeler,
      rasci,
      ppis,
      
      // Add convenience methods for common operations
      saveModel: core.saveModel.bind(core),
      loadModel: core.loadModel.bind(core)
    };
  } catch (error) {
    console.error('[App] Failed to initialize application:', error);
    throw error;
  }
}

// Export the MultiNotationModeler class
export { MultiNotationModeler };

/**
 * Main entry point when loaded in the browser
 */
async function main() {
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
      try {
        // Initialize application when DOM is ready
        const app = await initializeApplication({
          container: document.getElementById('container')
        });
        
        // Make available globally for debugging
        window.app = app;
        
        console.log('[App] Application loaded and ready');
      } catch (error) {
        console.error('[App] Failed to load application:', error);
      }
    });
  }
}

// Auto-start when loaded directly
main();

// Export for module usage
export default {
  initializeApplication,
  MultiNotationModeler
};
