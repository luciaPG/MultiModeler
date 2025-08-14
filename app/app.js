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

import { forceReloadMatrix, renderMatrix, detectRalphRolesFromCanvas } from './js/panels/rasci/core/matrix-manager.js';

window.forceReloadMatrix = forceReloadMatrix;
window.renderMatrix = renderMatrix;
window.detectRalphRolesFromCanvas = detectRalphRolesFromCanvas;
window.rasciRoles = [];
window.rasciTasks = [];
window.rasciMatrixData = {};
window.initRasciPanel = initRasciPanel;

let modeler = null;
let modelerContainer = null;
let welcomeScreen = null;
let isModelerInitialized = false;
let isModelerSystemInitialized = false;
let isProcessingFile = false;
let fileHandlersSetup = false;
let appInitialized = false;
let isOpenButtonClicked = false;
let eventListenersRegistered = false;
let lastOpenButtonClick = 0;

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
  
  if (!isModelerSystemInitialized) {
    initializeModelerSystem();
    isModelerSystemInitialized = true;
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

  setTimeout(async () => {
    if (!isModelerInitialized && !window.modeler) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await initializeModeler();
      } catch (error) {
        console.error('Error auto-initializing modeler:', error);
      }
    }
  }, 800);
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

const container = $('.panel:first-child');
const body = $('body');

async function initializeModeler() {
  try {
    const canvasElement = document.getElementById('js-canvas');
    if (!canvasElement) {
      console.error('Canvas element not found, waiting for DOM...');
      return new Promise((resolve, reject) => {
        let retryCount = 0;
        const maxRetries = 10;
        
        const retryInterval = setInterval(() => {
          const retryCanvas = document.getElementById('js-canvas');
          retryCount++;
          
          if (retryCanvas) {
            clearInterval(retryInterval);
            initializeModeler().then(resolve).catch(reject);
          } else if (retryCount >= maxRetries) {
            clearInterval(retryInterval);
            reject('Canvas element not found after ' + maxRetries + ' retries');
          }
        }, 300);
      });
    }
    
    // Verificar que el canvas tenga dimensiones válidas
    const rect = canvasElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      canvasElement.style.width = '100%';
      canvasElement.style.height = '100%';
      canvasElement.style.minHeight = '400px';
      
      // Forzar un reflow para asegurar que las dimensiones se apliquen
      canvasElement.offsetHeight;
    }
    
    if (window.modeler && typeof window.modeler.destroy === 'function') {
      // Solo destruir si el modeler no está funcionando correctamente
      try {
        const canvas = window.modeler.get('canvas');
        const canvasContainer = canvas && canvas.getContainer();
        const svg = canvasContainer && canvasContainer.querySelector('svg');
        
        // Si el modeler ya está funcionando Y inicializado, no lo destruyas
        if (canvas && canvasContainer && svg && typeof svg.getCTM === 'function' && isModelerInitialized) {
          return Promise.resolve(window.modeler);
        } else {
          disableMoveCanvas();
          
          // Estrategia más agresiva para limpiar event listeners
          try {
            const eventBus = window.modeler.get('eventBus');
            if (eventBus) {
              // Remover todos los event listeners del eventBus
              eventBus.off();
            }
            
            // Limpiar específicamente los listeners del MoveCanvas que causan el error getCTM
            const moveCanvas = window.modeler.get('moveCanvas');
            if (moveCanvas) {
              // Acceder a los listeners internos del MoveCanvas y limpiarlos
              if (moveCanvas._eventBus) {
                moveCanvas._eventBus.off();
              }
              
              // Limpiar handlers específicos del documento
              const handleMove = moveCanvas.handleMove;
              const handleEnd = moveCanvas.handleEnd;
              
              if (handleMove) {
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mousemove', handleMove, true);
              }
              if (handleEnd) {
                document.removeEventListener('mouseup', handleEnd);
                document.removeEventListener('mouseup', handleEnd, true);
              }
              
              // Si tiene un método de cleanup, llamarlo
              if (typeof moveCanvas.cleanup === 'function') {
                moveCanvas.cleanup();
              }
              if (typeof moveCanvas.deactivate === 'function') {
                moveCanvas.deactivate();
              }
            }
            
            // Limpiar event listeners del canvas y contenedor
            if (canvas && canvasContainer) {
              const svg = canvasContainer.querySelector('svg');
              if (svg) {
                // Clonar y reemplazar el SVG para eliminar todos los listeners
                const newSvg = svg.cloneNode(true);
                svg.parentNode.replaceChild(newSvg, svg);
              }
              
              // También limpiar listeners del contenedor
              const newContainer = canvasContainer.cloneNode(true);
              canvasContainer.parentNode.replaceChild(newContainer, canvasContainer);
            }
            
          } catch (eventError) {
            console.warn('Error cleaning event listeners:', eventError);
          }
          
          // Esperar más tiempo para que se limpien completamente los listeners
          await new Promise(resolve => setTimeout(resolve, 500));
          
          window.modeler.destroy();
          isModelerInitialized = false; // Marcar como no inicializado
        }
      } catch (e) {
        console.warn('Error checking/destroying previous modeler:', e);
        try {
          // Limpieza de emergencia
          disableMoveCanvas();
          
          const eventBus = window.modeler.get && window.modeler.get('eventBus');
          if (eventBus && eventBus.off) {
            eventBus.off();
          }
          
          // Remover todos los event listeners del documento que puedan estar relacionados
          document.removeEventListener('mousemove', function() {});
          
          await new Promise(resolve => setTimeout(resolve, 500));
          window.modeler.destroy();
          isModelerInitialized = false; // Marcar como no inicializado
        } catch (destroyError) {
          console.warn('Error destroying modeler:', destroyError);
          isModelerInitialized = false;
          // Como último recurso, simplemente remover la referencia
          window.modeler = null;
        }
      }
    }
    
    return new Promise((resolve, reject) => {
      // Limpiar completamente el canvas antes de crear un nuevo modeler
      cleanupCanvasCompletely();
      
      // Dar más tiempo para que el DOM esté completamente renderizado
      setTimeout(() => {
        try {
          modeler = new MultiNotationModeler({
            container: '#js-canvas',
            moddleExtensions: {
              PPINOT: PPINOTModdle,
              RALph: RALphModdle
            }
            // Removida configuración keyboard.bindTo deprecated
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
          isModelerInitialized = true;
          
          if (window.ppiManager && window.BpmnIntegration) {
            window.bpmnIntegration = new window.BpmnIntegration(window.ppiManager, modeler);
          }
          
          // Verificar que el canvas SVG esté completamente inicializado
          const canvas = modeler.get('canvas');
          const canvasContainer = canvas.getContainer();
          
          // Esperar a que el SVG esté realmente disponible
          const waitForSVG = () => {
            const svg = canvasContainer.querySelector('svg');
            if (svg && typeof svg.getCTM === 'function') {
              resolve(modeler);
            } else {
              setTimeout(waitForSVG, 100);
            }
          };
          
          // Dar un momento inicial y luego verificar el SVG
          setTimeout(waitForSVG, 300);
        } catch (error) {
          console.error('Error creating modeler:', error);
          reject(error);
        }
      }, 200);
    });
  } catch (error) {
    console.error('Error in initializeModeler:', error);
    return Promise.reject(error);
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
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Asegurar que el modeler esté inicializado y esperar a que esté listo
    let modelerReady = false;
    let attempts = 0;
    const maxAttempts = 15;
    
    while (!modelerReady && attempts < maxAttempts) {
      // Verificar si el canvas existe en el DOM
      const canvasElement = document.getElementById('js-canvas');
      if (!canvasElement) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
        continue;
      }
      
      if (!window.modeler) {
        try {
          await initializeModeler();
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
          console.warn('Error initializing modeler:', error);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        } else {
          // Si el modeler ya existe, verificar que esté funcionando
          try {
            const canvas = window.modeler.get('canvas');
            const canvasContainer = canvas && canvas.getContainer();
            const svg = canvasContainer && canvasContainer.querySelector('svg');
            
            if (!canvas || !svg || typeof svg.getCTM !== 'function') {
              isModelerInitialized = false;
              await initializeModeler();
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          } catch (error) {
            isModelerInitialized = false;
            await initializeModeler();
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }      // Verificar si el modeler está realmente listo
      if (window.modeler && typeof window.modeler.createDiagram === 'function') {
        try {
          // Intentar acceder al canvas para verificar que está completamente inicializado
          const canvas = window.modeler.get('canvas');
          const canvasContainer = canvas && canvas.getContainer();
          
          if (canvas && canvasContainer) {
            const svg = canvasContainer.querySelector('svg');
            if (svg && typeof svg.getCTM === 'function') {
              modelerReady = true;
            } else {
              await new Promise(resolve => setTimeout(resolve, 400));
            }
          } else {
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }
      
      attempts++;
      if (!modelerReady) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    if (!modelerReady) {
      throw new Error('No se pudo inicializar el modeler después de varios intentos');
    }
    
    await createNewDiagram();
    updateUI('Nuevo diagrama creado.');
  } catch (error) {
    console.error('Error in handleNewDiagram:', error);
    updateUI('Error creando nuevo diagrama: ' + error.message);
  }
}

function updateLastExport() {
  const now = new Date();
  const formatted = now.toLocaleString();
  if ($('.status-item').length >= 3) {
    $('.status-item:nth-child(3) span').text(`Último: ${formatted}`);
  }
}

// Función para deshabilitar completamente el MoveCanvas antes de destruir
function disableMoveCanvas() {
  try {
    if (!window.modeler) {
      return;
    }
    
    const moveCanvas = window.modeler.get('moveCanvas');
    if (moveCanvas) {
      if (typeof moveCanvas.setEnabled === 'function') {
        moveCanvas.setEnabled(false);
      }
      
      if (moveCanvas._mouseMoveHandler) {
        document.removeEventListener('mousemove', moveCanvas._mouseMoveHandler);
        document.removeEventListener('mousemove', moveCanvas._mouseMoveHandler, true);
        delete moveCanvas._mouseMoveHandler;
      }
      
      if (moveCanvas._mouseUpHandler) {
        document.removeEventListener('mouseup', moveCanvas._mouseUpHandler);
        document.removeEventListener('mouseup', moveCanvas._mouseUpHandler, true);
        delete moveCanvas._mouseUpHandler;
      }
      
      const handleMove = moveCanvas.handleMove;
      if (handleMove) {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mousemove', handleMove, true);
      }
      
      if (moveCanvas._dragContext) {
        moveCanvas._dragContext = null;
      }
      
      if (moveCanvas._active) {
        moveCanvas._active = false;
      }
    }
    
  } catch (error) {
    console.warn('Error disabling MoveCanvas:', error);
  }
}

// Función para limpiar completamente el canvas y evitar errores getCTM
function cleanupCanvasCompletely() {
  try {
    const canvasElement = document.getElementById('js-canvas');
    if (!canvasElement) {
      return;
    }
    
    const newCanvasElement = canvasElement.cloneNode(false);
    newCanvasElement.id = 'js-canvas';
    
    newCanvasElement.className = canvasElement.className;
    newCanvasElement.style.cssText = canvasElement.style.cssText;
    
    canvasElement.parentNode.replaceChild(newCanvasElement, canvasElement);
    
    return true;
  } catch (error) {
    console.error('Error during canvas cleanup:', error);
    return false;
  }
}

// Función para habilitar herramientas de edición después de importar
function enableEditingTools() {
  try {
    if (!window.modeler) {
      console.warn('No modeler available');
      return false;
    }
    
    const canvas = window.modeler.get('canvas');
    const rootElement = canvas.getRootElement();
    
    if (rootElement) {
      const selection = window.modeler.get('selection');
      if (selection) {
        selection.select([]);
      }
      
      const create = window.modeler.get('create');
      const elementFactory = window.modeler.get('elementFactory');
      const modeling = window.modeler.get('modeling');
      
      if (create && elementFactory && modeling) {
        return true;
      } else {
        console.warn('Some editing tools missing');
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error enabling editing tools:', error);
    return false;
  }
}

// Función para reactivar servicios de edición después de importar
function reactivateEditingServices() {
  try {
    if (!window.modeler) {
      console.warn('No modeler available for reactivating services');
      return false;
    }
    
    const canvas = window.modeler.get('canvas');
    const eventBus = window.modeler.get('eventBus');
    const contextPad = window.modeler.get('contextPad');
    const palette = window.modeler.get('palette');
    
    if (!canvas || !eventBus) {
      console.warn('Essential services not available');
      return false;
    }
    
    canvas.zoom('fit-viewport');
    
    const canvasContainer = canvas.getContainer();
    if (canvasContainer) {
      const mouseEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 0
      });
      canvasContainer.dispatchEvent(mouseEvent);
    }
    
    if (contextPad) {
      contextPad.open();
      setTimeout(() => contextPad.close(), 100);
    }
    
    if (palette) {
      try {
        palette.close();
        palette.open();
      } catch (paletteError) {
        console.warn('Error reactivating palette:', paletteError);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('Error reactivating editing services:', error);
    return false;
  }
}

// Función para limpiar event listeners duplicados
function cleanupEventListeners() {
  const openButton = $('#openButton');
  const newButton = $('#newDiagramButton');
  const openFileInput = $('#openFileInput');

  // Remover completamente todos los event listeners
  if (openButton.length) {
    openButton.off();
  }
  if (newButton.length) {
    newButton.off();
  }
  if (openFileInput.length) {
    openFileInput.off();
  }
  
  // También limpiar el file input si existe
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    // Clonar y reemplazar el elemento para eliminar TODOS los listeners
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
  }
}

function setupFileHandlers() {
  // Evitar setup múltiple
  if (fileHandlersSetup || eventListenersRegistered) {
    return;
  }
  
  cleanupEventListeners();
  
  const fileInput = document.getElementById('file-input');
  if (!fileInput) {
    return;
  }

  fileHandlersSetup = true;

  // Remover event listeners existentes para evitar duplicados
  const clonedInput = fileInput.cloneNode(true);
  fileInput.parentNode.replaceChild(clonedInput, fileInput);
  
  // Usar el input clonado (sin event listeners previos)
  const cleanFileInput = document.getElementById('file-input');

  const newButton = $('#new-button');
  const openButton = $('#open-button');
  const saveButton = $('#save-button');

  if (newButton.length) {
    newButton.off('click').on('click', handleNewDiagram);
  }

  if (openButton.length) {
    openButton.off('click').on('click', () => {
      const now = Date.now();
      
      if (isOpenButtonClicked || (now - lastOpenButtonClick < 3000)) {
        return;
      }
      
      isOpenButtonClicked = true;
      lastOpenButtonClick = now;
      
      setTimeout(() => {
        isOpenButtonClicked = false;
      }, 3000);
      
      setTimeout(() => {
        cleanFileInput.click();
      }, 100);
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

  cleanFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      isProcessingFile = false;
      return;
    }
    
    if (isProcessingFile) {
      event.target.value = '';
      return;
    }
    
    isProcessingFile = true;

    try {
      const content = await file.text();
      
      // Mostrar el modeler primero y esperar a que esté completamente renderizado
      showModeler();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Asegurar que el modeler esté inicializado y esperar a que esté listo
      let modelerReady = false;
      let attempts = 0;
      const maxAttempts = 15;
      
      while (!modelerReady && attempts < maxAttempts) {
        const canvasElement = document.getElementById('js-canvas');
        if (!canvasElement) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
          continue;
        }
        
        if (!window.modeler) {
          try {
            await initializeModeler();
            await new Promise(resolve => setTimeout(resolve, 800));
          } catch (error) {
            console.warn('Error initializing modeler:', error);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          try {
            const canvas = window.modeler.get('canvas');
            const canvasContainer = canvas && canvas.getContainer();
            const svg = canvasContainer && canvasContainer.querySelector('svg');
            
            if (!canvas || !svg || typeof svg.getCTM !== 'function') {
              isModelerInitialized = false;
              await initializeModeler();
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          } catch (error) {
            isModelerInitialized = false;
            await initializeModeler();
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
        
        if (window.modeler && typeof window.modeler.importXML === 'function') {
          try {
            const canvas = window.modeler.get('canvas');
            const canvasContainer = canvas && canvas.getContainer();
            
            if (canvas && canvasContainer) {
              const svg = canvasContainer.querySelector('svg');
              if (svg && typeof svg.getCTM === 'function') {
                
                try {
                  const moveCanvas = window.modeler.get('moveCanvas');
                  if (moveCanvas && moveCanvas._eventBus) {
                    // Service configured properly
                  }
                } catch (moveCanvasError) {
                  console.warn('MoveCanvas service check failed:', moveCanvasError);
                }
                
                modelerReady = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 400));
              }
            } else {
              await new Promise(resolve => setTimeout(resolve, 400));
            }
          } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        }
        
        attempts++;
        if (!modelerReady) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      if (!modelerReady) {
        throw new Error('No se pudo inicializar el modeler después de varios intentos');
      }
      
      // Detectar tipo de archivo y procesar accordingly
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (fileExtension === 'mmproject') {
        try {
          const projectData = JSON.parse(content);
          if (projectData.bpmn && projectData.bpmn.trim()) {
            await window.modeler.importXML(projectData.bpmn);
            
            setTimeout(() => {
              reactivateEditingServices();
              enableEditingTools();
            }, 500);
            
            updateUI('Proyecto importado.');
          } else {
            await createNewDiagram();
            updateUI('Proyecto sin diagrama BPMN - nuevo diagrama creado.');
          }
        } catch (parseError) {
          console.error('Error parsing .mmproject file:', parseError);
          throw new Error('Archivo .mmproject no válido');
        }
      } else if (fileExtension === 'bpmn' || fileExtension === 'xml') {
        await window.modeler.importXML(content);
        
        setTimeout(() => {
          reactivateEditingServices();
          enableEditingTools();
        }, 500);
        
        updateUI('Diagrama importado.');
      } else {
        throw new Error('Tipo de archivo no soportado. Use .bpmn, .xml o .mmproject');
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const canvas = window.modeler.get('canvas');
        const eventBus = window.modeler.get('eventBus');
        
        if (canvas && eventBus) {
          const canvasContainer = canvas.getContainer();
          const svg = canvasContainer.querySelector('svg');
          
          if (svg && typeof svg.getCTM === 'function') {
            canvas.zoom('fit-viewport');
            
            try {
              const modeling = window.modeler.get('modeling');
              const elementFactory = window.modeler.get('elementFactory');
              const create = window.modeler.get('create');
              const palette = window.modeler.get('palette');
              
              if (modeling && elementFactory && create && palette) {
                // All editing services available
              } else {
                console.warn('Some editing services missing:', {
                  modeling: !!modeling,
                  elementFactory: !!elementFactory,
                  create: !!create,
                  palette: !!palette
                });
              }
            } catch (serviceError) {
              console.warn('Error checking editing services:', serviceError);
            }
          } else {
            console.warn('SVG not functional after import, skipping zoom operation');
          }
        }
      } catch (canvasError) {
        console.warn('Canvas verification failed:', canvasError);
      }
      
      event.target.value = '';
    } catch (error) {
      console.error('Error importing file:', error);
      updateUI('Error importando archivo: ' + error.message);
    } finally {
      // Liberar el flag para permitir procesar otro archivo
      isProcessingFile = false;
    }
  }, { once: false }); // Asegurar que no se ejecute solo una vez
  
  // Marcar que los event listeners han sido registrados
  eventListenersRegistered = true;
}

function checkSavedDiagram() {
  // Función simplificada sin localStorage
}

function initializeApp() {
  if (appInitialized) {
    return;
  }
  
  appInitialized = true;
  
  welcomeScreen = document.getElementById('welcome-screen');
  modelerContainer = document.getElementById('modeler-container');
  
  if (!welcomeScreen || !modelerContainer) {
    console.error('Required DOM elements not found');
    appInitialized = false;
    return;
  }

  setupFileHandlers();

  
  // Botones de la pantalla de bienvenida
  const newDiagramBtn = document.getElementById('new-diagram-btn');
  const openDiagramBtn = document.getElementById('open-diagram-btn');
  
  const newBtn = document.getElementById('new-btn');
  const openBtn = document.getElementById('open-btn');
  const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');

  if (newDiagramBtn) {
    newDiagramBtn.addEventListener('click', () => {
      handleNewDiagram();
    });
  }

  if (openDiagramBtn) {
    openDiagramBtn.addEventListener('click', () => {
      const fileInput = document.getElementById('file-input');
      if (fileInput) {
        fileInput.click();
      }
    });
  }  if (newBtn) {
    newBtn.addEventListener('click', handleNewDiagram);
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const fileInput = document.getElementById('file-input');
      if (fileInput) {
        fileInput.click();
      }
    });
  }

  if (backToWelcomeBtn) {
    backToWelcomeBtn.addEventListener('click', () => {
      window.showWelcomeScreen();
    });
  }

  checkSavedDiagram();
}

// Función de inicialización global
function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
  } else {
    // DOM ya está listo, inicializar inmediatamente
    initializeApp();
  }
}

// Limpiar recursos cuando la página se cierre
window.addEventListener('beforeunload', () => {
  if (window.modeler && typeof window.modeler.destroy === 'function') {
    try {
      disableMoveCanvas();
      const eventBus = window.modeler.get('eventBus');
      if (eventBus) {
        eventBus.off();
      }
      window.modeler.destroy();
    } catch (error) {
      console.warn('Error cleaning up on page unload:', error);
    }
  }
});

init();
