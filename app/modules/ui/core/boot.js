// BPMN Boot Module - Responsible for mounting all panels during BPMN initialization
// Adapted for the current project structure
import { PANEL_REGISTRY } from './panel-registry.js';

/**
 * Boot the UI with all panels
 * @param {Object} ctx - Context containing eventBus, panelManager, store
 */
export function bootUI(ctx) {
  const { eventBus, panelManager } = ctx;
  
  // Skip panel mounting if panelManager is not available
  if (!panelManager || typeof panelManager.attach !== 'function') {
    console.log('[BPMN Boot] Panel manager not available, skipping panel mounting');
    return;
  }
  
  // Check if PANEL_REGISTRY exists
  if (!PANEL_REGISTRY || !Array.isArray(PANEL_REGISTRY) || PANEL_REGISTRY.length === 0) {
    console.log('[BPMN Boot] No panels registered, skipping panel mounting');
    return;
  }
  
  // Mount all registered panels
  PANEL_REGISTRY.forEach(({ id, region, factory }) => {
    try {
      // Create panel instance using factory function
      const panel = factory();
      
      // Mount the panel with context
      const el = panel.mount(ctx);
      
      // Attach panel to the UI via panel manager
      panelManager.attach(id, el, { region });
      
      // Subscribe to events for panel updates
      if (eventBus) {
        eventBus.subscribe('*', (evt) => {
          if (panel && typeof panel.update === 'function') {
            panel.update(evt);
          }
        });
      }
      
      // Optimización: Log eliminado para mejorar rendimiento
      // console.log(`[BPMN Boot] Panel ${id} mounted successfully`);
    } catch (error) {
      console.error(`[BPMN Boot] Failed to mount panel ${id}:`, error);
    }
  });
  
  // Additional UI setup specific to BPMN
  setupBpmnEventHandlers(ctx);
}

/**
 * Setup BPMN-specific event handlers
 * @param {Object} ctx - Context containing eventBus and other services
 */
function setupBpmnEventHandlers(ctx) {
  const { eventBus, modeler } = ctx;
  
  if (!modeler || !eventBus) return;
  
  // Connect BPMN-JS events to our EventBus
  try {
    const bpmnEventBus = modeler.get('eventBus');
    
    if (bpmnEventBus && typeof bpmnEventBus.on === 'function') {
      // Selection changed events
      bpmnEventBus.on('selection.changed', (e) => {
        const selection = e.newSelection || [];
        
        if (selection.length > 0) {
          // Publish element selected event
          eventBus.publish('bpmn.element.selected', { 
            element: selection[0],
            selection: selection
          });
        } else {
          // Publish canvas selected event when nothing is selected
          eventBus.publish('bpmn.canvas.selected', {});
        }
      });
      
      // Element changes
      bpmnEventBus.on(['element.changed', 'elements.changed'], (e) => {
        eventBus.publish('bpmn.element.changed', {
          element: e.element || e.elements,
          elements: e.elements
        });
        
        // Also publish a general model changed event
        eventBus.publish('model.changed', { source: 'bpmn' });
      });
      
      // Shape added
      bpmnEventBus.on('shape.added', (e) => {
        eventBus.publish('bpmn.shape.added', {
          element: e.element,
          parent: e.parent
        });
      });
      
      // Connection added
      bpmnEventBus.on('connection.added', (e) => {
        eventBus.publish('bpmn.connection.added', {
          element: e.element,
          parent: e.parent
        });
      });
      
      // Optimización: Log eliminado para mejorar rendimiento
      // console.log('[BPMN Boot] BPMN event handlers set up successfully');
    }
  } catch (error) {
    console.error('[BPMN Boot] Failed to set up BPMN event handlers:', error);
  }
}

/**
 * Initialize BPMN modeler with all required components
 * @param {Object} options - Initialization options
 * @returns {Object} - Initialized BPMN modeler
 */
export function initBpmnModeler(options) {
  const { eventBus, panelManager, store } = options;
  
  // This is where we would initialize the BPMN modeler
  // For now, we'll just return the modeler passed in options
  const modeler = options.modeler;
  
  if (!modeler) {
    throw new Error('BPMN Modeler instance is required');
  }
  
  // Boot the UI with all panels
  bootUI({
    eventBus,
    panelManager,
    store,
    modeler
  });
  
  return modeler;
}
