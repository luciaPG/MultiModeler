// Architecture Adapter - Connects the new monolithic modular architecture to existing code
import { getEventBus } from './event-bus.js';
import MultiNotationModelerCore from '../core/MultiNotationModelerCore.js';

/**
 * This adapter provides a bridge between the existing app.js and the new architecture.
 * It initializes the architecture components and connects them to the existing UI.
 */
export class ArchitectureAdapter {
  constructor(options = {}) {
    this.options = options;
    this.initialized = false;
    this.eventBus = getEventBus();
    this.core = null;
  }

  /**
   * Initialize the new architecture
   * @returns {Promise} Initialization result
   */
  async initialize() {
    if (this.initialized) return { success: true };

    try {
      console.log('[ArchitectureAdapter] Initializing new architecture');

      // Get references to existing components
      const modeler = window.modeler || this.options.modeler;
      const panelManager = window.panelManager || this.options.panelManager;

      if (!modeler) {
        throw new Error('No modeler found. Make sure the modeler is initialized first.');
      }

      if (!panelManager) {
        throw new Error('No panel manager found. Make sure the panel manager is initialized first.');
      }

      // Create the core component with existing components
      this.core = new MultiNotationModelerCore({
        eventBus: this.eventBus,
        panelManager: panelManager,
        bpmnModeler: modeler
      });

      // Initialize the core component
      await this.core.initialize();

      // Make core available globally for development/debugging
      window.mnmCore = this.core;

      // Connect event bus to existing events
      this.connectEvents();

      this.initialized = true;
      console.log('[ArchitectureAdapter] New architecture initialized successfully');

      return { success: true };
    } catch (error) {
      console.error('[ArchitectureAdapter] Initialization failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Connect the event bus to existing events
   * @private
   */
  connectEvents() {
    // Example: Connect BPMN selection events to EventBus
    if (window.modeler && window.modeler.get('eventBus')) {
      const bpmnEventBus = window.modeler.get('eventBus');

      // Selection changed events
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

      // Element changes
      bpmnEventBus.on(['element.changed', 'elements.changed'], (e) => {
        this.eventBus.publish('bpmn.element.changed', {
          element: e.element || e.elements,
          elements: e.elements
        });
        
        this.eventBus.publish('model.changed', { source: 'bpmn' });
      });

      console.log('[ArchitectureAdapter] Connected to existing events');
    }

    // Connect existing RASCI events
    if (window.forceReloadMatrix) {
      const originalReloadMatrix = window.forceReloadMatrix;
      window.forceReloadMatrix = (...args) => {
        originalReloadMatrix(...args);
        this.eventBus.publish('rasci.matrix.changed', { source: 'rasci' });
      };
    }

    // Connect existing PPI events
    if (window.ppiManagerInstance) {
      const originalRefreshPPIList = window.ppiManagerInstance.refreshPPIList;
      window.ppiManagerInstance.refreshPPIList = (...args) => {
        originalRefreshPPIList.apply(window.ppiManagerInstance, args);
        this.eventBus.publish('ppi.list.changed', { source: 'ppi' });
      };
    }
  }

  /**
   * Get the core component
   * @returns {MultiNotationModelerCore} Core component
   */
  getCore() {
    return this.core;
  }

  /**
   * Get the event bus
   * @returns {EventBus} Event bus
   */
  getEventBus() {
    return this.eventBus;
  }
}

// Create singleton instance
let instance = null;

/**
 * Get the architecture adapter instance
 * @returns {ArchitectureAdapter} Architecture adapter instance
 */
export function getArchitectureAdapter(options = {}) {
  if (!instance) {
    instance = new ArchitectureAdapter(options);
  }
  return instance;
}

// Add initialization function that can be called from existing code
export async function initializeArchitecture() {
  const adapter = getArchitectureAdapter();
  return adapter.initialize();
}

// Expose to global scope for easy integration
window.initializeArchitecture = initializeArchitecture;
