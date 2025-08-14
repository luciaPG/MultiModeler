// === app.js ===
// MultiModeler - Aplicación principal - Versión limpia

import $ from 'jquery';
import MultiNotationModeler from './MultiNotationModeler/index.js';
import PPINOTModdle from './PPINOT-modeler/PPINOT/PPINOTModdle.json';
import RALphModdle from './RALPH-modeler/RALph/RALphModdle.json';
import { PanelLoader } from './js/panel-loader.js';
import { initRasciPanel } from './js/panels/rasci/core/main.js';
import './js/panel-manager.js';
import './js/import-export-manager.js';
import './js/storage-manager.js';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';

// Importar funciones RASCI
import { forceReloadMatrix, renderMatrix, detectRalphRolesFromCanvas } from './js/panels/rasci/core/matrix-manager.js';

// Hacer funciones RASCI disponibles globalmente
window.forceReloadMatrix = forceReloadMatrix;
window.renderMatrix = renderMatrix;
window.detectRalphRolesFromCanvas = detectRalphRolesFromCanvas;

// Variables globales
window.rasciRoles = [];
window.rasciTasks = [];
window.rasciMatrixData = {};
window.initRasciPanel = initRasciPanel;

// Sistema de bloqueo para evitar condiciones de carrera
window.rasciStateLock = {
  isLocked: false,
  lockTimeout: null,
  lock: function(timeoutMs = 5000) {
    if (this.isLocked) {
      return false;
    }
    this.isLocked = true;
    this.lockTimeout = setTimeout(() => {
      this.unlock();
    }, timeoutMs);
    return true;
  },
  unlock: function() {
    this.isLocked = false;
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
  }
};

// Variables para la navegación entre pantallas
let welcomeScreen = null;
let modelerContainer = null;
let isModelerInitialized = false;

// Funciones de navegación entre pantallas
window.showWelcomeScreen = function() {
  if (welcomeScreen) {
    welcomeScreen.classList.remove('hidden');
  }
  if (modelerContainer) {
    modelerContainer.classList.remove('show');
  }
};

function showModeler() {
  if (welcomeScreen) {
    welcomeScreen.classList.add('hidden');
  }
  if (modelerContainer) {
    modelerContainer.classList.add('show');
  }
  
  if (!isModelerInitialized) {
    initializeModelerSystem();
    isModelerInitialized = true;
  }
}

function initializeModelerSystem() {
  const panelContainer = document.getElementById('panel-container');
  if (!panelContainer) return;

  const panelLoader = new PanelLoader();
  window.panelLoader = panelLoader;

  const panelManager = new window.PanelManager();
  window.panelManager = panelManager;
  panelManager.setPanelLoader(panelLoader);

  panelManager.applyConfiguration();
  panelContainer.classList.add('layout-4');

  setTimeout(() => {
    if (typeof window.forceReloadMatrix !== 'function') {
      window.forceReloadMatrix = function() {
        const rasciPanel = document.querySelector('#rasci-panel');
        if (rasciPanel && typeof window.renderMatrix === 'function') {
          window.renderMatrix(rasciPanel, [], null);
        }
      };
    }
  }, 500);

  setTimeout(() => {
    // El modeler se inicializará automáticamente
  }, 300);
}

function loadBpmnState() {
  if (!modeler) {
    setTimeout(loadBpmnState, 500);
    return;
  }
  createNewDiagram();
}

function validateAndSanitizeWaypoints(waypoints) {
  if (!waypoints || !Array.isArray(waypoints)) return [];
  const valid = waypoints.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
  const unique = valid.filter((p, i, arr) => i === 0 || p.x !== arr[i-1].x || p.y !== arr[i-1].y);
  return unique.length >= 2 ? unique : [];
}

let modeler = null;
const container = $('.panel:first-child');
const body = $('body');

function initializeModeler() {
  try {
    const canvasElement = document.getElementById('js-canvas');
    if (!canvasElement) {
      return;
    }
    
    const rect = canvasElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      canvasElement.style.width = '100%';
      canvasElement.style.height = '100%';
      canvasElement.style.minHeight = '400px';
    }
    
    if (window.modeler && typeof window.modeler.destroy === 'function') {
      try {
        window.modeler.destroy();
      } catch (e) {
        // Silent error handling
      }
    }
    
    requestAnimationFrame(() => {
      try {
        modeler = new MultiNotationModeler({
          container: '#js-canvas',
          moddleExtensions: {
            PPINOT: PPINOTModdle,
            RALph: RALphModdle
          }
        });
        window.bpmnModeler = modeler;

        const eventBus = modeler.get('eventBus');
        if (eventBus) {
          eventBus.on(['connection.create', 'bendpoint.move.end'], event => {
            const wp = event && event.context && event.context.connection && event.context.connection.waypoints;
            if (wp) event.context.connection.waypoints = validateAndSanitizeWaypoints(wp);
          });
        }
        
        window.modeler = modeler;
        
        if (window.ppiManager && window.BpmnIntegration) {
          window.bpmnIntegration = new window.BpmnIntegration(window.ppiManager, modeler);
        }
      } catch (error) {
        // Silent error handling
      }
    });
  } catch (error) {
    // Silent error handling
  }
}

async function createNewDiagram() {
  try {
    if (typeof modeler.clear === 'function') await modeler.clear();
    await modeler.createDiagram();

    setTimeout(() => {
      if (typeof window.reloadRasciState === 'function') {
        window.reloadRasciState();
      }
    }, 1000);

    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');

    elementRegistry.forEach(element => {
      if (element.type === 'bpmn:StartEvent') {
        modeling.moveShape(element, { x: 100, y: 5 });
        return;
      }
    });

    container.removeClass('with-error').addClass('with-diagram');
    body.addClass('shown');
    updateUI('Nuevo diagrama creado.');
  } catch (err) {
    container.removeClass('with-diagram').addClass('with-error');
    container.find('.error pre').text(err.message);
  }
}

function isModelerHealthy() {
  if (!window.modeler) return false;
  
  try {
    const canvas = window.modeler.get('canvas');
    const canvasElement = document.getElementById('js-canvas');
    
    return canvas && canvasElement && canvasElement.parentNode;
  } catch (e) {
    return false;
  }
}

// Hacer las funciones globales
window.initializeModeler = initializeModeler;
window.createNewDiagram = createNewDiagram;
window.isModelerHealthy = isModelerHealthy;
window.loadBpmnState = loadBpmnState;

function updateUI(message = '') {
  if (message) $('.status-item:first-child span').text(message);
  $('.status-item:nth-child(2) span').text('Modo: Edición');
}

// Funciones para manejo de archivos
async function handleNewDiagram() {
  try {
    showModeler();
    await createNewDiagram();
    updateUI('Nuevo diagrama creado.');
  } catch (error) {
    updateUI('Error creando nuevo diagrama');
  }
}

function updateLastExport() {
  const now = new Date();
  const formatted = now.toLocaleString();
  if ($('.status-item').length >= 3) {
    $('.status-item:nth-child(3) span').text(`Último: ${formatted}`);
  }
}

function setupFileHandlers() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.bpmn,.xml,.json';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  const newButton = $('#new-button');
  const openButton = $('#open-button');
  const saveButton = $('#save-button');

  if (newButton.length) {
    newButton.off('click').on('click', handleNewDiagram);
  }

  if (openButton.length) {
    openButton.off('click').on('click', () => {
      fileInput.click();
    });
  }

  if (saveButton.length) {
    saveButton.off('click').on('click', async () => {
      try {
        const result = await modeler.saveXML({ format: true });
        const blob = new Blob([result.xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.bpmn';
        a.click();
        URL.revokeObjectURL(url);
        updateLastExport();
        updateUI('Diagrama exportado.');
      } catch (error) {
        updateUI('Error exportando diagrama');
      }
    });
  }

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const content = await file.text();
      await modeler.importXML(content);
      showModeler();
      updateUI('Diagrama importado.');
    } catch (error) {
      updateUI('Error importando diagrama');
    }
  });
}

function checkSavedDiagram() {
  // Función simplificada sin localStorage
}

function initializeApp() {
  welcomeScreen = document.getElementById('welcome-screen');
  modelerContainer = document.getElementById('modeler-container');
  
  if (!welcomeScreen || !modelerContainer) {
    return;
  }

  setupFileHandlers();

  const newProjectBtn = document.getElementById('new-project-btn');
  const continueBtn = document.getElementById('continue-btn');
  const openProjectBtn = document.getElementById('open-project-btn');

  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', handleNewDiagram);
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      showModeler();
      loadBpmnState();
    });
  }

  if (openProjectBtn) {
    openProjectBtn.addEventListener('click', () => {
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.click();
      }
    });
  }

  checkSavedDiagram();
}

// Función de inicialización global
function init() {
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}

init();
