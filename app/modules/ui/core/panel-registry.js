// Panel Registry - Static configuration for MultiNotation Modeler panels
// This registry provides a central place to define all available panels and their factories

import { initRasciPanel } from '../../rasci/core/main.js';
import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';

/**
 * Create a PPI panel
 * @returns {Object} Panel implementation with mount, update, unmount methods
 */
function createPpiPanel() {
  let panel = null; // 👉 ahora accesible en mount/update/unmount

  return {
    mount: () => {
      // Evitar duplicados: si ya existe un panel PPI, eliminarlo antes de recrear
      const existing = document.getElementById('ppi-panel');
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      panel = document.createElement('div');
      panel.id = 'ppi-panel';
      panel.className = 'panel';
      panel.setAttribute('data-panel-type', 'ppi');

      fetch('panels/ppi-panel.html')
        .then(response => response.text())
        .then(html => {
          panel.innerHTML = html;

          // ⚡️ Insertar en el contenedor de paneles si existe, si no al body
          const container = document.getElementById('panel-container') || document.body;
          container.appendChild(panel);

          // 🔧 Reenganchar PPI Manager
          if (typeof getServiceRegistry === 'function') {
            const serviceRegistry = getServiceRegistry();
            const ppiManagerInstance = serviceRegistry && serviceRegistry.get('PPIManagerInstance');

            if (ppiManagerInstance && typeof ppiManagerInstance.refreshPPIList === 'function') {
              setTimeout(() => {
                try {
                  ppiManagerInstance.refreshPPIList();
                } catch (err) {
                  console.warn('[Panel Registry] ⚠️ Error en refreshPPIList:', err);
                }
              }, 200);
            }
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

    update: (evt) => {
      if (typeof getServiceRegistry === 'function') {
        const serviceRegistry = getServiceRegistry();
        const ppiManagerInstance = serviceRegistry && serviceRegistry.get('PPIManagerInstance');

        if (evt.event === 'bpmn.element.selected' && ppiManagerInstance) {
          if (typeof ppiManagerInstance.handleElementSelected === 'function') {
            ppiManagerInstance.handleElementSelected(evt.data.element);
          }
        }

        if (evt.event === 'model.changed' && ppiManagerInstance) {
          if (typeof ppiManagerInstance.refreshPPIList === 'function') {
            ppiManagerInstance.refreshPPIList();
          }
        }
      }
    },

    unmount: () => {
      if (panel) {
        panel.classList.add('hidden'); // 👉 solo ocultamos
      }
    }
  };
}

/**
 * Create a RASCI panel
 * @returns {Object} Panel implementation with mount, update, unmount methods
 */
function createRasciPanel() {
  let panel = null;

  return {
    mount: (ctx) => {
      // Evitar duplicados: si ya existe un panel RASCI, eliminarlo antes de recrear
      const existing = document.getElementById('rasci-panel');
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      panel = document.createElement('div');
      panel.id = 'rasci-panel';
      panel.className = 'panel';
      panel.setAttribute('data-panel-type', 'rasci');

      fetch('panels/rasci-panel.html')
        .then(response => response.text())
        .then(html => {
          panel.innerHTML = html;

          // ⚡️ Insertar en el contenedor de paneles si existe, si no al body
          const container = document.getElementById('panel-container') || document.body;
          container.appendChild(panel);

          if (typeof initRasciPanel === 'function') {
            initRasciPanel(panel);
          }

          if (ctx.eventBus) {
            ctx.eventBus.subscribe('bpmn.element.selected', (event) => {
              if (typeof getServiceRegistry === 'function') {
                const sr = getServiceRegistry();
                if (sr && sr.get('EventBus')) {
                  sr.get('EventBus').publish('rasci.element.selected', { element: event.element });
                }
              }
            });

            ctx.eventBus.subscribe('model.changed', () => {
              if (typeof getServiceRegistry === 'function') {
                const sr = getServiceRegistry();
                if (sr && sr.get('EventBus')) {
                  sr.get('EventBus').publish('rasci.matrix.reload');
                }
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

    update: (evt) => {
      if (typeof getServiceRegistry === 'function') {
        const sr = getServiceRegistry();
        if (evt.event === 'bpmn.element.selected') {
          sr && sr.get('EventBus') && sr.get('EventBus').publish('rasci.element.selected', { element: evt.data.element });
        }

        if (evt.event === 'model.changed') {
          sr && sr.get('EventBus') && sr.get('EventBus').publish('rasci.matrix.reload');
        }
      }
    },

    unmount: () => {
      if (panel) {
        panel.classList.add('hidden');
      }
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
    region: 'right',
    factory: createRasciPanel
  }
];
