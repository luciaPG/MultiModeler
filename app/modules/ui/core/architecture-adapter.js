// Architecture Adapter - Connects the new monolithic modular architecture to existing code
import { getEventBus } from './event-bus.js';
import MultiNotationModelerCore from '../core/MultiNotationModelerCore.js';
import { getServiceRegistry } from './ServiceRegistry.js';

// Bootstrap SR
const serviceRegistry = (typeof getServiceRegistry === 'function') ? getServiceRegistry() : undefined;
const eventBusInstance = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('EventBus') : undefined;
const rasciAdapterInstance = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('RASCIAdapter') : undefined;
const validatorInstance = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('RASCIUIValidator') : undefined;
const bpmnModelerInstance = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('BPMNModeler') : (rasciAdapterInstance && rasciAdapterInstance.getBpmnModeler ? rasciAdapterInstance.getBpmnModeler() : undefined);

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

      // Get references from service registry or options
      const modeler = this.options.modeler || (serviceRegistry && serviceRegistry.get ? serviceRegistry.get('BpmnModeler') : undefined);
      const panelManager = this.options.panelManager || (serviceRegistry && serviceRegistry.get ? serviceRegistry.get('PanelManagerInstance') : undefined);

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

      // Register core in service registry
      if (serviceRegistry) {
        serviceRegistry.register('MnmCore', this.core);
      }
      
      // Debug exposure only in development
      // registerDebug('mnmCore', this.core); // Removed: debug-registry deleted

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
    const modeler = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('BPMNModeler') : this.options.modeler;
    if (modeler && modeler.get && modeler.get('eventBus')) {
      const bpmnEventBus = modeler.get('eventBus');

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

    // Connect existing RASCI events via service registry
    const forceReloadMatrix = serviceRegistry && serviceRegistry.getFunction ? serviceRegistry.getFunction('forceReloadMatrix') : undefined;
    if (forceReloadMatrix) {
      // Wrap the function to publish events
      serviceRegistry.registerFunction('forceReloadMatrix', (...args) => {
        forceReloadMatrix(...args);
        this.eventBus.publish('rasci.matrix.changed', { source: 'rasci' });
      });
    }

    // Connect existing PPI events
    const ppiManager = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('PPIManagerInstance') : undefined;
    if (ppiManager && ppiManager.refreshPPIList) {
      const originalRefreshPPIList = ppiManager.refreshPPIList;
      ppiManager.refreshPPIList = (...args) => {
        originalRefreshPPIList.apply(ppiManager, args);
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

// Register in service registry instead of window
const sr = getServiceRegistry();
if (sr) {
  sr.register('ArchitectureInitializer', initializeArchitecture, { description: 'Connect BPMN to EventBus' });
}

// Expose in debug for development
// registerDebug('ArchitectureInitializer', initializeArchitecture); // Removed: debug-registry deleted
