// MultiNotationModelerCore - Central coordinator for the monolithic modular architecture
// This module orchestrates the interaction between all notations and panels

import { getEventBus } from '../js/event-bus.js';
import { bootUI } from '../modelers/bpmn/boot.js';
import { StorageManager } from '../infra/storage-manager.js';
import { initBpmnModeler } from '../modelers/bpmn/boot.js';

/**
 * MultiNotation Modeler Core
 * Coordinates the integration between BPMN, PPINOT, RALPH, and RASCI
 */
export class MultiNotationModelerCore {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Set up core services
    this.eventBus = options.eventBus || getEventBus();
    this.store = options.store || new StorageManager(options.storage || {});
    this.panelManager = options.panelManager;
    
    // Initialize state
    this.activeModeler = null;
    this.modelers = {};
    this.auxiliaryNotations = {};
    this.initialized = false;
    
    // Reference configuration
    this.config = {
      container: options.container,
      ...options
    };
    
    // Bind methods for event listeners
    this.handleModelChanged = this.handleModelChanged.bind(this);
    this.handleElementSelected = this.handleElementSelected.bind(this);
  }
  
  /**
   * Initialize the MultiNotation Modeler
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize BPMN modeler (primary modeler)
      await this.initializeBPMN();
      
      // Initialize auxiliary notations
      await this.initializeAuxiliaryNotations();
      
      this.initialized = true;
      this.eventBus.publish('core.initialized', { success: true });
      
      console.log('[Core] MultiNotation Modeler initialized successfully');
    } catch (error) {
      console.error('[Core] Failed to initialize MultiNotation Modeler:', error);
      this.eventBus.publish('core.initialized', { success: false, error });
      throw error;
    }
  }
  
  /**
   * Initialize the BPMN modeler
   * @returns {Promise<void>}
   */
  async initializeBPMN() {
    try {
      // Get the existing BPMN modeler instance
      if (!window.modeler) {
        throw new Error('BPMN Modeler not found. Initialize it first.');
      }
      
      const bpmnModeler = window.modeler;
      this.modelers.bpmn = bpmnModeler;
      this.activeModeler = bpmnModeler;
      
      // Initialize BPMN modeler with all panels
      initBpmnModeler({
        modeler: bpmnModeler,
        eventBus: this.eventBus,
        panelManager: this.panelManager,
        store: this.store
      });
      
      console.log('[Core] BPMN modeler initialized successfully');
    } catch (error) {
      console.error('[Core] Failed to initialize BPMN modeler:', error);
      throw error;
    }
  }
  
  /**
   * Initialize auxiliary notations (PPINOT, RALPH)
   * @returns {Promise<void>}
   */
  async initializeAuxiliaryNotations() {
    try {
      // Initialize PPINOT
      this.auxiliaryNotations.ppinot = {
        type: 'ppinot',
        elements: [],
        // Additional PPINOT-specific properties and methods
        syncWithBPMN: (bpmnElements) => {
          // Logic to synchronize PPINOT elements with BPMN
          this.eventBus.publish('ppinot.synchronized', { elements: this.auxiliaryNotations.ppinot.elements });
        }
      };
      
      // Initialize RALPH
      this.auxiliaryNotations.ralph = {
        type: 'ralph',
        roles: [],
        // Additional RALPH-specific properties and methods
        syncWithRASCI: (rasciMatrix) => {
          // Logic to synchronize RALPH with RASCI matrix
          this.eventBus.publish('ralph.synchronized', { roles: this.auxiliaryNotations.ralph.roles });
        }
      };
      
      console.log('[Core] Auxiliary notations initialized successfully');
    } catch (error) {
      console.error('[Core] Failed to initialize auxiliary notations:', error);
      throw error;
    }
  }
  
  /**
   * Set up event listeners for inter-notation communication
   */
  setupEventListeners() {
    // Listen for model changes
    this.eventBus.subscribe('model.changed', this.handleModelChanged);
    
    // Listen for element selection
    this.eventBus.subscribe('bpmn.element.selected', this.handleElementSelected);
    
    // Set up other listeners as needed
  }
  
  /**
   * Handle model changes from any notation
   * @param {Object} event - Event data
   */
  handleModelChanged(event) {
    const { source } = event;
    
    // Synchronize other notations when BPMN changes
    if (source === 'bpmn') {
      // Update PPINOT based on BPMN changes
      if (this.auxiliaryNotations.ppinot) {
        this.auxiliaryNotations.ppinot.syncWithBPMN(this.getBPMNElements());
      }
      
      // Update RALPH based on BPMN changes (if needed)
      if (this.auxiliaryNotations.ralph) {
        // Any RALPH-specific update logic
      }
    }
    
    // Synchronize RALPH with RASCI changes
    if (source === 'rasci' && this.auxiliaryNotations.ralph) {
      this.auxiliaryNotations.ralph.syncWithRASCI(event.matrix);
    }
    
    // Additional synchronization logic can be added here
  }
  
  /**
   * Handle element selection events
   * @param {Object} event - Event data
   */
  handleElementSelected(event) {
    const { element } = event;
    
    // Update panels or other components based on selection
    this.eventBus.publish('selection.changed', { element });
  }
  
  /**
   * Get all BPMN elements from the active modeler
   * @returns {Array} Array of BPMN elements
   */
  getBPMNElements() {
    if (!this.modelers.bpmn) return [];
    
    try {
      const elementRegistry = this.modelers.bpmn.get('elementRegistry');
      return elementRegistry.getAll();
    } catch (error) {
      console.error('[Core] Failed to get BPMN elements:', error);
      return [];
    }
  }
  
  /**
   * Save the current model state
   * @param {Object} options - Save options
   * @returns {Promise<Object>} Result object
   */
  async saveModel(options = {}) {
    try {
      // Get BPMN XML
      const { xml } = await this.modelers.bpmn.saveXML({ format: true });
      
      // Prepare complete model with all notations
      const completeModel = {
        bpmn: xml,
        ppinot: this.auxiliaryNotations.ppinot ? this.auxiliaryNotations.ppinot.elements : [],
        ralph: this.auxiliaryNotations.ralph ? this.auxiliaryNotations.ralph.roles : [],
        rasci: window.rasciMatrixData || {}
      };
      
      // Save using storage manager
      const result = await this.store.save('multiNotationModel', completeModel, options);
      
      if (result.success) {
        this.eventBus.publish('model.saved', { path: result.path });
      }
      
      return result;
    } catch (error) {
      console.error('[Core] Failed to save model:', error);
      this.eventBus.publish('model.saved', { success: false, error });
      return { success: false, error };
    }
  }
  
  /**
   * Load a model
   * @param {Object} options - Load options
   * @returns {Promise<Object>} Result object
   */
  async loadModel(options = {}) {
    try {
      // Load model from storage manager
      const result = await this.store.load('multiNotationModel', options);
      
      if (!result.success) {
        throw new Error('Failed to load model');
      }
      
      const { value } = result;
      
      // Import BPMN XML
      if (value.bpmn) {
        await this.modelers.bpmn.importXML(value.bpmn);
      }
      
      // Import PPINOT elements
      if (value.ppinot && this.auxiliaryNotations.ppinot) {
        this.auxiliaryNotations.ppinot.elements = value.ppinot;
      }
      
      // Import RALPH roles
      if (value.ralph && this.auxiliaryNotations.ralph) {
        this.auxiliaryNotations.ralph.roles = value.ralph;
      }
      
      // Import RASCI matrix
      if (value.rasci) {
        window.rasciMatrixData = value.rasci;
        if (typeof window.forceReloadMatrix === 'function') {
          window.forceReloadMatrix();
        }
      }
      
      this.eventBus.publish('model.loaded', { path: result.path });
      
      return { success: true };
    } catch (error) {
      console.error('[Core] Failed to load model:', error);
      this.eventBus.publish('model.loaded', { success: false, error });
      return { success: false, error };
    }
  }
}
