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
import { getServiceRegistry } from './ui/core/ServiceRegistry.js';
import CanvasUtils from './ui/utils/canvas-utils.js';

/**
 * Initialize the application with all modules
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Application instance
 */
export async function initializeApplication(options = {}) {
  // Optimización: Log eliminado para mejorar rendimiento
  // console.log('[App] Initializing application with modular monolith architecture');
  
  try {
    // Initialize the MultiNotation Modeler core
    const registry = getServiceRegistry();
    let modeler = options.bpmnModeler;
    
    // Si no se pasa como parámetro, intentar obtener del registry
    if (!modeler) {
      modeler = registry && registry.get('BpmnModeler');
    }
    
    // Si aún no está disponible, esperar un poco y reintentar
    if (!modeler && registry) {
      // Optimización: Log eliminado para mejorar rendimiento
      // console.log('[App] BpmnModeler not found, waiting for registration...');
      // Esperar hasta 2 segundos para que se registre
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        modeler = registry.get('BpmnModeler');
        if (modeler) {
          console.log('[App] BpmnModeler found after waiting');
          break;
        }
      }
    }
    
    // Si aún no está disponible, registrar el que se pasó como parámetro
    if (modeler && registry && !registry.get('BpmnModeler')) {
      registry.register('BpmnModeler', modeler);
    }
    
    if (!modeler) {
      throw new Error('TODO: registrar/inyectar BpmnModeler en ServiceRegistry');
    }
    
    const multiNotationModeler = initMultiNotationModeler({
      ...options,
      bpmnModeler: modeler
    });
    const core = multiNotationModeler.core;
    
    // Register modules with the core
    ppinotModule.registerWith(core);
    ralphModule.registerWith(core);
    
    // Initialize the core
    await multiNotationModeler.initialize();
    
    // Register CanvasUtils globally
    if (registry) {
      registry.register('CanvasUtils', CanvasUtils);
    }
    
    // Initialize independent modules
    const rasci = await rasciModule.initialize({
      eventBus: core.eventBus,
      core: core
    });
    
    const ppis = await ppisModule.initialize({
      eventBus: core.eventBus,
      core: core
    });
    
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('[App] Application initialized successfully');
    
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
  // DESHABILITADO: La inicialización se maneja completamente desde app.js
  // para evitar inicializaciones múltiples y recargas de welcome screen
  console.log('[App] Inicialización automática deshabilitada - manejada por app.js');
  return;
}

// Auto-start when loaded directly (but only if not already started)
if (typeof document !== 'undefined' && document.readyState === 'loading') {
  main();
}

// Export for module usage
export default {
  initializeApplication,
  MultiNotationModeler
};
