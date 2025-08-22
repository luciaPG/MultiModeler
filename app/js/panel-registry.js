// Panel Registry - Static configuration for MultiNotation Modeler panels
// This registry provides a central place to define all available panels and their factories

import { initRasciPanel } from './panels/rasci/core/main.js';

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
          panel.innerHTML = html;
          
          // Initialize PPI functionality
          if (window.ppiManagerInstance && typeof window.ppiManagerInstance.refreshPPIList === 'function') {
            window.ppiManagerInstance.refreshPPIList();
          } else {
            // Load PPI components if not already loaded
            const script = document.createElement('script');
            script.src = './js/panels/ppi/index.js';
            script.onload = () => {
              if (window.loadPPIComponents) {
                window.loadPPIComponents();
              }
            };
            document.head.appendChild(script);
          }
          
          // Subscribe to relevant events from the event bus
          if (ctx.eventBus) {
            ctx.eventBus.subscribe('bpmn.element.selected', (event) => {
              if (window.ppiManagerInstance && typeof window.ppiManagerInstance.handleElementSelected === 'function') {
                window.ppiManagerInstance.handleElementSelected(event.element);
              }
            });
            
            ctx.eventBus.subscribe('model.changed', (event) => {
              if (window.ppiManagerInstance && typeof window.ppiManagerInstance.refreshPPIList === 'function') {
                window.ppiManagerInstance.refreshPPIList();
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
      if (evt.event === 'bpmn.element.selected' && window.ppiManagerInstance) {
        // Handle element selection for PPI panel
        if (typeof window.ppiManagerInstance.handleElementSelected === 'function') {
          window.ppiManagerInstance.handleElementSelected(evt.data.element);
        }
      }
      
      if (evt.event === 'model.changed' && window.ppiManagerInstance) {
        // Refresh PPI list when model changes
        if (typeof window.ppiManagerInstance.refreshPPIList === 'function') {
          window.ppiManagerInstance.refreshPPIList();
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
              if (typeof window.handleRasciElementSelection === 'function') {
                window.handleRasciElementSelection(event.element);
              }
            });
            
            ctx.eventBus.subscribe('model.changed', (event) => {
              if (typeof window.forceReloadMatrix === 'function') {
                window.forceReloadMatrix();
              }
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
        if (typeof window.handleRasciElementSelection === 'function') {
          window.handleRasciElementSelection(evt.data.element);
        }
      }
      
      if (evt.event === 'model.changed') {
        // Refresh RASCI matrix when model changes
        if (typeof window.forceReloadMatrix === 'function') {
          window.forceReloadMatrix();
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
