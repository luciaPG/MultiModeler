/**
 * PPIs Module
 * 
 * This module handles Process Performance Indicators (PPIs) within the application.
 * It provides capabilities for defining, managing and visualizing PPIs.
 */

// Import internal dependencies
import './ppi-core.js';
import './ppi-ui.js';
import './ppi-manager.js';
import './ppi-sync-manager.js';
import './ppi-sync-ui.js';
import './bpmn-integration.js';
import { getServiceRegistry } from '../ui/core/ServiceRegistry.js';
import { resolve } from '../../services/global-access.js';

/**
 * PPI Manager
 * Manages Process Performance Indicators
 */
class PPIModuleManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.ppis = [];
    
    // Bind methods
    this.addPPI = this.addPPI.bind(this);
    this.updatePPI = this.updatePPI.bind(this);
    this.removePPI = this.removePPI.bind(this);
    this.getPPIs = this.getPPIs.bind(this);
  }
  
  /**
   * Initialize the PPI Manager
   */
  async initialize() {
    // Set up event listeners
    if (this.eventBus) {
      this.eventBus.subscribe('ppinot.element.added', (event) => {
        // React to new PPINOT elements that might affect PPIs
        console.log('[PPIs] PPINOT element added:', event.element);
      });
    }
    
    // Initialize legacy PPI manager if available
    try {
      // Get PPIManager from ServiceRegistry
      const registry = getServiceRegistry();
      const PPIManager = registry && registry.get ? registry.get('PPIManager') : null;
      if (!PPIManager) {
        throw new Error('TODO: registrar/inyectar PPIManager en ServiceRegistry');
      }
      
      const ppiManagerInstance = new PPIManager();
      
      // Register in service registry
      if (registry) {
        registry.register('PPIManagerInstance', ppiManagerInstance);
      }
      
      console.log('[PPIs] PPIManager instance creada exitosamente');
    } catch (error) {
      console.error('[PPIs] Error initializing legacy PPIManager:', error);
    }
    
    console.log('[PPIs] Manager initialized');
    return this;
  }
  
  /**
   * Add a new PPI
   * @param {Object} ppi - PPI object
   */
  addPPI(ppi) {
    this.ppis.push(ppi);
    this.eventBus.publish('ppi.added', { ppi });
    
    // Update legacy manager if available
    const ppiManager = resolve('PPIManagerInstance');
    if (ppiManager && typeof ppiManager.addPPI === 'function') {
      ppiManager.addPPI(ppi);
    }
    
    return ppi;
  }
  
  /**
   * Update an existing PPI
   * @param {string} id - PPI ID
   * @param {Object} data - Updated PPI data
   */
  updatePPI(id, data) {
    const index = this.ppis.findIndex(ppi => ppi.id === id);
    if (index !== -1) {
      this.ppis[index] = { ...this.ppis[index], ...data };
      this.eventBus.publish('ppi.updated', { ppi: this.ppis[index] });
      
      // Update legacy manager if available
      const ppiManager = resolve('PPIManagerInstance');
      if (ppiManager && typeof ppiManager.updatePPI === 'function') {
        ppiManager.updatePPI(id, data);
      }
      
      return this.ppis[index];
    }
    return null;
  }
  
  /**
   * Remove a PPI
   * @param {string} id - PPI ID
   * @returns {boolean} - Success status
   */
  removePPI(id) {
    const index = this.ppis.findIndex(ppi => ppi.id === id);
    if (index !== -1) {
      const ppi = this.ppis[index];
      this.ppis.splice(index, 1);
      this.eventBus.publish('ppi.removed', { ppi });
      
      // Update legacy manager if available
      const ppiManager = resolve('PPIManagerInstance');
      if (ppiManager && typeof ppiManager.removePPI === 'function') {
        ppiManager.removePPI(id);
      }
      
      return true;
    }
    return false;
  }
  
  /**
   * Get all PPIs
   * @returns {Array} - Array of PPIs
   */
  getPPIs() {
    // Get from legacy manager if available
    const ppiManager = resolve('PPIManagerInstance');
    if (ppiManager && typeof ppiManager.getPPIs === 'function') {
      return ppiManager.getPPIs();
    }
    
    return this.ppis;
  }
  
  /**
   * Export PPIs to JSON
   * @returns {string} - JSON string
   */
  exportToJSON() {
    return JSON.stringify(this.getPPIs(), null, 2);
  }
  
  /**
   * Import PPIs from JSON
   * @param {string} json - JSON string
   * @returns {boolean} - Success status
   */
  importFromJSON(json) {
    try {
      const ppis = JSON.parse(json);
      if (Array.isArray(ppis)) {
        this.ppis = ppis;
        this.eventBus.publish('ppi.imported', { ppis });
        
        // Update legacy manager if available
        const ppiManager = resolve('PPIManagerInstance');
        if (ppiManager && typeof ppiManager.importPPIs === 'function') {
          ppiManager.importPPIs(ppis);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PPIs] Failed to import PPIs from JSON:', error);
      return false;
    }
  }
}

/**
 * Legacy function for backward compatibility
 */
async function loadPPIComponents() {
  console.log('[PPIs] loadPPIComponents called');
  console.warn('[PPIs] Using legacy loadPPIComponents function. Consider migrating to the modular architecture.');
  
  try {
    // Ensure window is available
    if (typeof window === 'undefined') {
      console.warn('[PPIs] Window not available, skipping legacy initialization');
      return;
    }
    
    // Get PPIManager from ServiceRegistry
    const registry = getServiceRegistry();
    const PPIManager = registry && registry.get ? registry.get('PPIManager') : null;
    if (!PPIManager) {
      console.warn('[PPIs] PPIManager not available in ServiceRegistry');
      return;
    }
    
    console.log('[PPIs] Creating PPIManager instance...');
    const ppiManagerInstance = new PPIManager();
    
    // Register in service registry
    if (registry) {
      registry.register('PPIManagerInstance', ppiManagerInstance);
    }
    
    console.log('[PPIs] PPIManager instance created:', ppiManagerInstance);
  } catch (error) {
    console.error('[PPIs] Error initializing legacy PPIManager:', error);
  }
}

/**
 * Initialize the PPIs module
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - PPIs module instance
 */
export async function initialize(options = {}) {
  const ppiManager = new PPIModuleManager(options);
  await ppiManager.initialize();
  
  // Register function in ServiceRegistry
  const registry = getServiceRegistry();
  if (registry) {
    registry.register('loadPPIComponents', loadPPIComponents, { 
      description: 'Carga UI de PPI' 
    });
  }
  
  return {
    manager: ppiManager,
    
    // Public API
    addPPI: ppiManager.addPPI,
    updatePPI: ppiManager.updatePPI,
    removePPI: ppiManager.removePPI,
    getPPIs: ppiManager.getPPIs,
    exportToJSON: ppiManager.exportToJSON,
    importFromJSON: ppiManager.importFromJSON,
    
    // Legacy support
    loadPPIComponents
  };
}

// Legacy export
export { loadPPIComponents };

/**
 * Module exports
 */
export default {
  initialize
};
