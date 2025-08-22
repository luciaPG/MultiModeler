// MultiNotationModelerCore - Core integration component for MultiNotation Modeler
// Adapted for the current project structure
import { getEventBus } from './event-bus.js';
import { bootUI } from './boot.js';

/**
 * MultiNotationModelerCore provides the central coordination 
 * for the monolithic modular architecture
 */
export class MultiNotationModelerCore {
  /**
   * Create a new MultiNotationModelerCore
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus || getEventBus();
    this.panelManager = options.panelManager;
    this.store = options.store;
    
    // Reference to the underlying modelers
    this.bpmnModeler = options.bpmnModeler || window.modeler;
    this.ppinotModeler = null;
    this.ralphModeler = null;
    
    // State management
    this.initialized = false;
  }
  
  /**
   * Initialize the MultiNotationModelerCore
   * @returns {Promise} - Resolves when initialization is complete
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // If no BPMN modeler is provided, wait for it to be available globally
      if (!this.bpmnModeler) {
        this.bpmnModeler = await this._waitForBpmnModeler();
      }
      
      // Initialize PPINOT and RALPH modelers
      this._initializeAuxiliaryModelers();
      
      // Setup event listeners for synchronization between notations
      this._setupEventListeners();
      
      // Boot the UI with panels
      bootUI({
        eventBus: this.eventBus,
        panelManager: this.panelManager,
        store: this.store,
        modeler: this.bpmnModeler
      });
      
      this.initialized = true;
      console.log('[MultiNotationModelerCore] Initialized successfully');
      
      // Publish initialization complete event
      this.eventBus.publish('core.initialized', { 
        core: this,
        modeler: this.bpmnModeler
      });
      
      return this;
    } catch (error) {
      console.error('[MultiNotationModelerCore] Initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Wait for the global BPMN modeler to be available
   * @returns {Promise} - Resolves with the BPMN modeler
   * @private
   */
  _waitForBpmnModeler() {
    return new Promise((resolve, reject) => {
      const checkModeler = () => {
        if (window.modeler) {
          resolve(window.modeler);
        } else {
          setTimeout(checkModeler, 100);
        }
      };
      
      checkModeler();
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Timeout waiting for BPMN modeler to be available'));
      }, 10000);
    });
  }
  
  /**
   * Initialize PPINOT and RALPH modelers
   * @private
   */
  _initializeAuxiliaryModelers() {
    // In the current structure, these are part of the MultiNotationModeler
    // We'll just use references to the global modeler
    this.ppinotModeler = this.bpmnModeler;
    this.ralphModeler = this.bpmnModeler;
  }
  
  /**
   * Setup event listeners for synchronization between notations
   * @private
   */
  _setupEventListeners() {
    // Get the BPMN event bus
    try {
      const bpmnEventBus = this.bpmnModeler.get('eventBus');
      
      if (bpmnEventBus && typeof bpmnEventBus.on === 'function') {
        // Listen for BPMN changes
        bpmnEventBus.on(['element.changed', 'elements.changed'], (e) => {
          // Publish to our EventBus
          this.eventBus.publish('bpmn.element.changed', {
            element: e.element || e.elements,
            elements: e.elements
          });
          
          // Also publish a general model changed event
          this.eventBus.publish('model.changed', { source: 'bpmn' });
        });
        
        // Selection events for panel synchronization
        bpmnEventBus.on('selection.changed', (e) => {
          const selection = e.newSelection || [];
          
          if (selection.length > 0) {
            this.eventBus.publish('bpmn.element.selected', { 
              element: selection[0],
              selection: selection
            });
          } else {
            this.eventBus.publish('bpmn.canvas.selected', {});
          }
        });
        
        console.log('[MultiNotationModelerCore] Event listeners set up successfully');
      }
    } catch (error) {
      console.error('[MultiNotationModelerCore] Failed to set up event listeners:', error);
    }
  }
  
  /**
   * Get the core event bus
   * @returns {EventBus} - The core event bus
   */
  getEventBus() {
    return this.eventBus;
  }
  
  /**
   * Get the panel manager
   * @returns {PanelManager} - The panel manager
   */
  getPanelManager() {
    return this.panelManager;
  }
  
  /**
   * Get the BPMN modeler
   * @returns {Object} - The BPMN modeler
   */
  getBpmnModeler() {
    return this.bpmnModeler;
  }
}
