// MultiNotationModelerCore - Central coordinator for the monolithic modular architecture
// This module orchestrates the interaction between all notations and panels

import { getEventBus } from '../../../js/event-bus.js';
import { bootUI } from '../../../js/boot.js';
import { StorageManager } from '../../../infra/storage-manager.js';
import { initBpmnModeler } from '../../../js/boot.js';

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
    this.registeredModules = {};
    
    // Store BPMN modeler if provided
    if (options.bpmnModeler) {
      this.modelers.bpmn = options.bpmnModeler;
      this.activeModeler = options.bpmnModeler;
    }
    
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
   * Register a module with the core
   * @param {string} name - Module name
   * @param {Object} module - Module implementation
   */
  registerModule(name, module) {
    this.registeredModules[name] = module;
    console.log(`[Core] Module "${name}" registered successfully`);
    
    // Notify that a module was registered
    this.eventBus.publish('core.module.registered', { name, module });
    
    return this;
  }
  
  /**
   * Get a registered module
   * @param {string} name - Module name
   * @returns {Object|null} The registered module or null
   */
  getModule(name) {
    return this.registeredModules[name] || null;
  }
  
  /**
   * Initialize the MultiNotation Modeler
   * @returns {Promise<Object>} Returns the core instance
   */
  async initialize() {
    if (this.initialized) return this;
    
    try {
      // Set up event listeners
      this.setupEventListeners();
      
      try {
        // Initialize BPMN modeler (primary modeler) - but continue even if it fails
        await this.initializeBPMN();
      } catch (bpmnError) {
        console.warn('[Core] BPMN initialization issue, continuing with setup:', bpmnError);
      }
      
      try {
        // Initialize auxiliary notations - but continue even if they fail
        await this.initializeAuxiliaryNotations();
      } catch (auxError) {
        console.warn('[Core] Auxiliary notation initialization issue, continuing:', auxError);
      }
      
      this.initialized = true;
      this.eventBus.publish('core.initialized', { success: true });
      
      // Set up a listener for when the modeler becomes available later
      if (!this.modelers.bpmn) {
        this.eventBus.subscribe('bpmn.modeler.created', (event) => {
          if (event.modeler) {
            this.modelers.bpmn = event.modeler;
            this.activeModeler = event.modeler;
            console.log('[Core] BPMN modeler connected after initialization');
          }
        });
      }
      
      console.log('[Core] MultiNotation Modeler initialized successfully');
      return this;
    } catch (error) {
      console.error('[Core] Failed to initialize MultiNotation Modeler:', error);
      this.eventBus.publish('core.initialized', { success: false, error });
      // Return a partially initialized core instead of throwing
      return this;
    }
  }
  
  /**
   * Initialize the BPMN modeler
   * @returns {Promise<void>}
   */
  async initializeBPMN() {
    try {
      // We'll defer BPMN modeler initialization until it's available
      // If window.modeler is not yet available, we'll just note it and continue
      // The app.js will set it later and we can connect to it through events
      
      if (window.modeler) {
        const bpmnModeler = window.modeler;
        this.modelers.bpmn = bpmnModeler;
        this.activeModeler = bpmnModeler;
        
        // Initialize BPMN modeler with all panels
        try {
          // Create a mock panelManager if one is not provided
          const panelManager = this.panelManager || {
            attach: (id, el, opts) => {
              console.log(`[Mock Panel Manager] Would attach panel ${id}`);
              // No-op implementation
              return true;
            }
          };
          
          initBpmnModeler({
            modeler: bpmnModeler,
            eventBus: this.eventBus,
            panelManager: panelManager,
            store: this.store
          });
          console.log('[Core] BPMN modeler initialized successfully');
        } catch (err) {
          console.warn('[Core] Could not fully initialize BPMN modeler:', err);
        }
      } else {
        console.log('[Core] BPMN modeler not found yet, will connect when available');
        // We'll continue without an error - the modeler will be connected later
      }
      
    } catch (error) {
      console.error('[Core] Failed to initialize BPMN modeler:', error);
      // Don't throw the error, just log it and continue
    }
  }
  
  /**
   * Initialize auxiliary notations (PPINOT, RALPH)
   * @returns {Promise<void>}
   */
  async initializeAuxiliaryNotations() {
    try {
      // Initialize from registered modules
      const ppinotModule = this.getModule('ppinot');
      if (ppinotModule && typeof ppinotModule.initialize === 'function') {
        this.auxiliaryNotations.ppinot = await ppinotModule.initialize({
          core: this,
          eventBus: this.eventBus
        });
      } else {
        // Fallback to default initialization
        this.auxiliaryNotations.ppinot = {
          type: 'ppinot',
          elements: [],
          syncWithBPMN: (bpmnElements) => {
            this.eventBus.publish('ppinot.synchronized', { elements: this.auxiliaryNotations.ppinot.elements });
          }
        };
      }
      
      // Initialize RALPH
      const ralphModule = this.getModule('ralph');
      if (ralphModule && typeof ralphModule.initialize === 'function') {
        this.auxiliaryNotations.ralph = await ralphModule.initialize({
          core: this,
          eventBus: this.eventBus
        });
      } else {
        // Fallback to default initialization
        this.auxiliaryNotations.ralph = {
          type: 'ralph',
          roles: [],
          syncWithRASCI: (rasciMatrix) => {
            this.eventBus.publish('ralph.synchronized', { roles: this.auxiliaryNotations.ralph.roles });
          }
        };
      }
      
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
