// BPMN Boot Module - Responsible for mounting all panels during BPMN initialization

/**
 * Create BPMN panel
 * @returns {Object} Panel with mount, update, unmount methods
 */
function createBpmnPanel() {
  return {
    mount: (ctx) => {
      const panel = document.createElement('div');
      panel.id = 'bpmn-panel';
      panel.className = 'panel';
      panel.setAttribute('data-panel-type', 'bpmn');
      
      // Create canvas for the BPMN modeler
      const canvas = document.createElement('div');
      canvas.id = 'js-canvas';
      canvas.className = 'canvas';
      panel.appendChild(canvas);
      
      return panel;
    },
    update: () => {},
    unmount: () => {}
  };
}

/**
 * Create PPI panel
 * @returns {Object} Panel with mount, update, unmount methods
 */
function createPpiPanel() {
  return {
    mount: (ctx) => {
      const panel = document.createElement('div');
      panel.id = 'ppi-panel';
      panel.className = 'panel';
      panel.setAttribute('data-panel-type', 'ppi');
      
      // Load panel content
      fetch('panels/ppi-panel.html')
        .then(response => response.text())
        .then(html => {
          panel.innerHTML = html;
        })
        .catch(error => {
          console.error('Error loading PPI panel:', error);
          panel.innerHTML = '<div class="panel-error">Failed to load PPI panel</div>';
        });
      
      return panel;
    },
    update: () => {},
    unmount: () => {}
  };
}

/**
 * Create RASCI panel
 * @returns {Object} Panel with mount, update, unmount methods
 */
function createRasciPanel() {
  return {
    mount: (ctx) => {
      const panel = document.createElement('div');
      panel.id = 'rasci-panel';
      panel.className = 'panel';
      panel.setAttribute('data-panel-type', 'rasci');
      
      // Load panel content
      fetch('panels/rasci-panel.html')
        .then(response => response.text())
        .then(html => {
          panel.innerHTML = html;
          if (typeof window.initRasciPanel === 'function') {
            window.initRasciPanel(panel, ctx);
          }
        })
        .catch(error => {
          console.error('Error loading RASCI panel:', error);
          panel.innerHTML = '<div class="panel-error">Failed to load RASCI panel</div>';
        });
      
      return panel;
    },
    update: () => {},
    unmount: () => {}
  };
}

/**
 * Boot the UI with all panels
 * @param {Object} ctx - Context containing eventBus, panelManager, store
 */
export function bootUI(ctx) {
  const { eventBus, panelManager } = ctx;
  
  // Define panels directly instead of using PANEL_REGISTRY
  const panels = [
    { id: 'bpmn', region: 'main', factory: createBpmnPanel },
    { id: 'ppi', region: 'right', factory: createPpiPanel },
    { id: 'rasci', region: 'right', factory: createRasciPanel }
  ];
  
  // Mount all defined panels
  panels.forEach(({ id, region, factory }) => {
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
      
      console.log(`[BPMN Boot] Panel ${id} mounted successfully`);
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
      
      console.log('[BPMN Boot] BPMN event handlers set up successfully');
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
  const { container, eventBus, panelManager, store } = options;
  
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
