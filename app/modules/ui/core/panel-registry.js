// Panel Registry - Static configuration for MultiNotation Modeler panels
// This registry provides a central place to define all available panels and their factories

import { initRasciPanel } from '../../rasci/core/main.js';

/**
 * Create a PPI panel
 * @returns {Object} Panel implementation with mount, update, unmount methods
 */
function createPpiPanel() {
  return {
    /**
     * Mount the PPI panel
     * @param {Object} ctx - Context with eventBus, store, etc.
     * @returns {HTMLElement} The mounted panel element
     */
    mount: (ctx) => {
      // Create a container for the PPI panel
      const panel = document.createElement('div');
      panel.id = 'ppi-panel';
      panel.className = 'panel';
      panel.setAttribute('data-panel-type', 'ppi');
      
      // Load the panel HTML content
      fetch('panels/ppi-panel.html')
        .then(response => response.text())
        .then(html => {
          // First, inject the HTML content
          panel.innerHTML = html;
          console.log('[Panel Registry] PPI panel HTML content injected');
          console.log('[Panel Registry] HTML content length:', html.length);
          console.log('[Panel Registry] Panel element after injection:', panel);
          
          // Verificar inmediatamente si el ppi-list existe
          const ppiListElement = document.getElementById('ppi-list');

          
          // Define loadScript function first
          function loadScript(src) {
            return new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = src;
              script.type = 'module';
              script.onload = () => {
                console.log(`[Panel Registry] Script loaded: ${src}`);
                resolve();
              };
              script.onerror = (error) => {
                console.error(`[Panel Registry] Error loading script ${src}:`, error);
                reject(error);
              };
              document.head.appendChild(script);
            });
          }
          
          // Give the browser time to render the HTML before initializing PPI functionality
          setTimeout(() => {
            // Now that HTML is injected, initialize PPI functionality
            const serviceRegistry = getServiceRegistry();
            const ppiManagerInstance = serviceRegistry?.get('PPIManagerInstance');
            
            if (ppiManagerInstance && typeof ppiManagerInstance.refreshPPIList === 'function') {
              ppiManagerInstance.refreshPPIList();
            } else {
              // Load PPI components in the correct order
              const loadScripts = async () => {
                try {
                  // First, load core components
                  await loadScript('./modules/ppis/ppi-core.js');
                  await loadScript('./modules/ppis/ppi-ui.js');
                  await loadScript('./modules/ppis/ppi-manager.js');
                  
                  // Finally, load the main index
                  await loadScript('./modules/ppis/index.js');
                  
                  const sr = getServiceRegistry?.();
                  const loadPPIComponents = sr?.get('loadPPIComponents');
                  if (loadPPIComponents) {
                    loadPPIComponents();
                    
                    // Wait for components to initialize before refreshing
                    setTimeout(() => {
                      const serviceRegistry = getServiceRegistry();
                      const ppiManagerInstance = serviceRegistry?.get('PPIManagerInstance');
                      if (ppiManagerInstance && typeof ppiManagerInstance.refreshPPIList === 'function') {
                        ppiManagerInstance.refreshPPIList();
                      }
                    }, 500);
                  }
                } catch (error) {
                  console.error('[Panel Registry] Error loading PPI scripts:', error);
                }
              };
              
              loadScripts();
            }
          }, 100); // 100ms delay to ensure DOM is rendered
          
          // Subscribe to relevant events from the event bus
          if (ctx.eventBus) {
            ctx.eventBus.subscribe('bpmn.element.selected', (event) => {
              const serviceRegistry = getServiceRegistry();
              const ppiManagerInstance = serviceRegistry?.get('PPIManagerInstance');
              if (ppiManagerInstance && typeof ppiManagerInstance.handleElementSelected === 'function') {
                ppiManagerInstance.handleElementSelected(event.element);
              }
            });
            
            ctx.eventBus.subscribe('model.changed', () => {
              const serviceRegistry = getServiceRegistry();
              const ppiManagerInstance = serviceRegistry?.get('PPIManagerInstance');
              if (ppiManagerInstance && typeof ppiManagerInstance.refreshPPIList === 'function') {
                ppiManagerInstance.refreshPPIList();
              }
            });
          }
        })
        .catch(err => {
          panel.innerHTML = `
            <div class="panel-header">
              <div class="panel-title">PPI Panel (Error)</div>
            </div>
            <div class="panel-content">
              <div class="panel-error">Failed to load PPI panel</div>
            </div>
          `;
          console.error('Error loading PPI panel:', err);
        });
      
      return panel;
    },
    
    /**
     * Update the panel based on events
     * @param {Object} evt - The event that triggered the update
     */
    update: (evt) => {
      const serviceRegistry = getServiceRegistry();
      const ppiManagerInstance = serviceRegistry?.get('PPIManagerInstance');
      if (evt.event === 'bpmn.element.selected' && ppiManagerInstance) {
        // Handle element selection for PPI panel
        if (typeof ppiManagerInstance.handleElementSelected === 'function') {
          ppiManagerInstance.handleElementSelected(evt.data.element);
        }
      }
      
      if (evt.event === 'model.changed' && ppiManagerInstance) {
        // Refresh PPI list when model changes
        if (typeof ppiManagerInstance.refreshPPIList === 'function') {
          ppiManagerInstance.refreshPPIList();
        }
      }
    },
    
    /**
     * Clean up when panel is unmounted
     */
    unmount: () => {
      // Clean up any resources or event listeners
    }
  };
}

/**
 * Create a RASCI panel
 * @returns {Object} Panel implementation with mount, update, unmount methods
 */
function createRasciPanel() {
  return {
    /**
     * Mount the RASCI panel
     * @param {Object} ctx - Context with eventBus, store, etc.
     * @returns {HTMLElement} The mounted panel element
     */
    mount: (ctx) => {
      // Create a container for the RASCI panel
      const panel = document.createElement('div');
      panel.id = 'rasci-panel';
      panel.className = 'panel';
      panel.setAttribute('data-panel-type', 'rasci');
      
      // Load the panel HTML content
      fetch('panels/rasci-panel.html')
        .then(response => response.text())
        .then(html => {
          panel.innerHTML = html;
          
          // Initialize RASCI panel
          if (typeof initRasciPanel === 'function') {
            initRasciPanel(panel);
          }
          
          // Subscribe to relevant events from the event bus
          if (ctx.eventBus) {
            ctx.eventBus.subscribe('bpmn.element.selected', (event) => {
              const sr = getServiceRegistry?.();
              sr?.get('EventBus')?.publish('rasci.element.selected', { element: event.element });
            });
            
            ctx.eventBus.subscribe('model.changed', () => {
              const sr = getServiceRegistry?.();
              sr?.get('EventBus')?.publish('rasci.matrix.reload');
            });
          }
        })
        .catch(err => {
          panel.innerHTML = `
            <div class="panel-header">
              <div class="panel-title">RASCI Panel (Error)</div>
            </div>
            <div class="panel-content">
              <div class="panel-error">Failed to load RASCI panel</div>
            </div>
          `;
          console.error('Error loading RASCI panel:', err);
        });
      
      return panel;
    },
    
    /**
     * Update the panel based on events
     * @param {Object} evt - The event that triggered the update
     */
    update: (evt) => {
      if (evt.event === 'bpmn.element.selected') {
        // Handle element selection for RASCI panel
        const sr = getServiceRegistry?.();
        sr?.get('EventBus')?.publish('rasci.element.selected', { element: evt.data.element });
      }
      
      if (evt.event === 'model.changed') {
        // Refresh RASCI matrix when model changes
        const sr = getServiceRegistry?.();
        sr?.get('EventBus')?.publish('rasci.matrix.reload');
      }
    },
    
    /**
     * Clean up when panel is unmounted
     */
    unmount: () => {
      // Clean up any resources or event listeners
    }
  };
}

/**
 * Static registry of all available panels
 */
export const PANEL_REGISTRY = [
  { 
    id: 'panel-ppi',
    region: 'right',
    factory: createPpiPanel
  },
  {
    id: 'panel-rasci',
    region: 'bottom',
    factory: createRasciPanel
  }
  // Additional panels could be registered here
];
