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

// Interceptar errores de getCTM como último recurso
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('getCTM')) {
    console.warn('🛡️ Intercepted getCTM error, applying emergency cleanup...');
    event.preventDefault();
    
    // Ejecutar limpieza de emergencia
    try {
      if (typeof window.forceCleanupListeners === 'function') {
        window.forceCleanupListeners();
      }
    } catch (cleanupError) {
      console.error('Error during emergency cleanup:', cleanupError);
    }
    
    return false; // Prevenir que el error se propague
  }
});

// Variables para la navegación entre pantallas
let welcomeScreen = null;
let modelerContainer = null;
let isModelerInitialized = false;
let isModelerSystemInitialized = false; // Flag separado para el sistema de modeler
let isProcessingFile = false; // Flag para evitar procesamiento múltiple de archivos
let fileHandlersSetup = false; // Flag para evitar setup múltiple de handlers
let appInitialized = false; // Flag para evitar inicialización múltiple de la app
let isOpenButtonClicked = false; // Flag para evitar múltiples clicks del botón abrir
let eventListenersRegistered = false; // Flag para evitar registrar listeners múltiples veces
let lastOpenButtonClick = 0; // Timestamp del último click del botón abrir

// Función para resetear todos los flags (útil para debugging)
window.resetAppFlags = function() {
  console.log('Resetting all app flags...');
  appInitialized = false;
  fileHandlersSetup = false;
  isProcessingFile = false;
  isOpenButtonClicked = false;
  eventListenersRegistered = false;
  lastOpenButtonClick = 0;
  isModelerInitialized = false;
  isModelerSystemInitialized = false;
  console.log('All flags reset');
};

// Función para diagnosticar el estado del modeler
window.diagnoseModeler = function() {
  console.log('=== MODELER DIAGNOSIS ===');
  
  if (!window.modeler) {
    console.log('❌ No modeler instance found');
    return;
  }
  
  console.log('✅ Modeler instance exists');
  
  try {
    const canvas = window.modeler.get('canvas');
    console.log('Canvas service:', canvas ? '✅ Available' : '❌ Missing');
    
    const modeling = window.modeler.get('modeling');
    console.log('Modeling service:', modeling ? '✅ Available' : '❌ Missing');
    
    const elementFactory = window.modeler.get('elementFactory');
    console.log('ElementFactory service:', elementFactory ? '✅ Available' : '❌ Missing');
    
    const create = window.modeler.get('create');
    console.log('Create service:', create ? '✅ Available' : '❌ Missing');
    
    const selection = window.modeler.get('selection');
    console.log('Selection service:', selection ? '✅ Available' : '❌ Missing');
    
    const contextPad = window.modeler.get('contextPad');
    console.log('ContextPad service:', contextPad ? '✅ Available' : '❌ Missing');
    
    const palette = window.modeler.get('palette');
    console.log('Palette service:', palette ? '✅ Available' : '❌ Missing');
    
    const moveCanvas = window.modeler.get('moveCanvas');
    console.log('MoveCanvas service:', moveCanvas ? '✅ Available' : '❌ Missing');
    
    if (canvas) {
      const rootElement = canvas.getRootElement();
      console.log('Root element:', rootElement ? '✅ Available' : '❌ Missing');
      
      const canvasContainer = canvas.getContainer();
      const svg = canvasContainer && canvasContainer.querySelector('svg');
      console.log('SVG element:', svg ? '✅ Available' : '❌ Missing');
      console.log('SVG getCTM function:', (svg && typeof svg.getCTM === 'function') ? '✅ Available' : '❌ Missing');
      
      if (svg) {
        console.log('SVG position info:');
        try {
          const ctm = svg.getCTM();
          console.log('  CTM available:', !!ctm);
        } catch (ctmError) {
          console.log('  ❌ CTM Error:', ctmError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
  
  console.log('=== END DIAGNOSIS ===');
};

// Función para forzar limpieza de listeners problemáticos
window.forceCleanupListeners = function() {
  console.log('🧹 Forcing cleanup of problematic listeners...');
  
  try {
    // Clonar el documento para eliminar TODOS los listeners
    const events = ['mousemove', 'mouseup', 'mousedown', 'wheel', 'scroll', 'dragstart', 'dragend'];
    
    // Crear un conjunto de handlers falsos para remover
    const dummyHandler = function() {};
    
    events.forEach(eventType => {
      // Intentar remover listeners tanto en capture como en bubble phase
      for (let i = 0; i < 10; i++) { // Múltiples intentos
        document.removeEventListener(eventType, dummyHandler, true);
        document.removeEventListener(eventType, dummyHandler, false);
      }
    });
    
    // Limpiar específicamente los listeners que causan getCTM error
    const moveHandlers = document.querySelectorAll('[data-move-handler]');
    moveHandlers.forEach(element => {
      element.removeAttribute('data-move-handler');
    });
    
    // Forzar limpieza del canvas completamente
    cleanupCanvasCompletely();
    
    // También limpiar el window de listeners relacionados
    const windowEvents = ['resize', 'blur', 'focus'];
    windowEvents.forEach(eventType => {
      for (let i = 0; i < 5; i++) {
        window.removeEventListener(eventType, dummyHandler, true);
        window.removeEventListener(eventType, dummyHandler, false);
      }
    });
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Error during forced cleanup:', error);
  }
};

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
    // Inicializar el modeler automáticamente, pero solo si no está ya inicializado
    if (!isModelerInitialized && !window.modeler) {
      try {
        // Esperar a que todos los paneles estén completamente cargados
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Auto-initializing modeler...');
        await initializeModeler();
      } catch (error) {
        console.error('Error auto-initializing modeler:', error);
      }
    } else {
      console.log('Skipping auto-initialization - modeler already exists or initialized');
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

let modeler = null;
const container = $('.panel:first-child');
const body = $('body');

async function initializeModeler() {
  try {
    console.log('initializeModeler called - Current state:', {
      modelerExists: !!window.modeler,
      isInitialized: isModelerInitialized
    });
    
    const canvasElement = document.getElementById('js-canvas');
    if (!canvasElement) {
      console.error('Canvas element not found, waiting for DOM...');
      // Esperar a que el DOM esté listo y reintentar
      return new Promise((resolve, reject) => {
        let retryCount = 0;
        const maxRetries = 10;
        
        const retryInterval = setInterval(() => {
          const retryCanvas = document.getElementById('js-canvas');
          retryCount++;
          
          if (retryCanvas) {
            clearInterval(retryInterval);
            console.log('Canvas found after', retryCount, 'retries');
            // Recurrir a la función pero con el canvas ya disponible
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
          console.log('Modeler already functional and initialized, skipping destruction');
          return Promise.resolve(window.modeler);
        } else {
          console.log('Destroying previous modeler... (initialized:', isModelerInitialized, ')');
          
          // Deshabilitar MoveCanvas específicamente antes de limpiar
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
          console.log('Creating new MultiNotationModeler...');
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
          isModelerInitialized = true; // Marcar como inicializado
          console.log('Modeler created successfully');
          
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
              console.log('Canvas SVG is ready');
              resolve(modeler);
            } else {
              console.log('Waiting for SVG to be ready...');
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
    console.log('handleNewDiagram called');
    showModeler();
    
    // Esperar a que el DOM se actualice después de mostrar el modeler
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Asegurar que el modeler esté inicializado y esperar a que esté listo
    let modelerReady = false;
    let attempts = 0;
    const maxAttempts = 15;
    
    while (!modelerReady && attempts < maxAttempts) {
      // Verificar si el canvas existe en el DOM
      const canvasElement = document.getElementById('js-canvas');
      if (!canvasElement) {
        console.log('Canvas element not found, waiting... (attempt', attempts + 1, ')');
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
        continue;
      }
      
      if (!window.modeler) {
        console.log('Initializing modeler... (attempt', attempts + 1, ')');
        try {
          await initializeModeler();
          // Esperar un poco más para asegurar que el DOM esté listo
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
              console.log('Modeler exists but canvas/SVG not accessible, reinitializing...');
              isModelerInitialized = false;
              await initializeModeler();
              await new Promise(resolve => setTimeout(resolve, 800));
            } else {
              console.log('Modeler already functional, continuing...');
            }
          } catch (error) {
            console.log('Modeler exists but not functional, reinitializing...');
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
            // Verificar también que el SVG esté disponible y funcional
            const svg = canvasContainer.querySelector('svg');
            if (svg && typeof svg.getCTM === 'function') {
              modelerReady = true;
              console.log('Modeler and SVG are ready for new diagram!');
            } else {
              console.log('SVG not ready yet, waiting...');
              await new Promise(resolve => setTimeout(resolve, 400));
            }
          } else {
            console.log('Canvas not fully ready yet, waiting...');
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        } catch (e) {
          console.log('Modeler not fully ready yet, waiting...');
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
    
    console.log('Creating new diagram...');
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
    console.log('Disabling MoveCanvas completely...');
    
    if (!window.modeler) {
      return;
    }
    
    const moveCanvas = window.modeler.get('moveCanvas');
    if (moveCanvas) {
      // Deshabilitar el MoveCanvas completamente
      if (typeof moveCanvas.setEnabled === 'function') {
        moveCanvas.setEnabled(false);
      }
      
      // Remover handlers específicos del documento
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
      
      // Limpiar cualquier handler llamado handleMove
      const handleMove = moveCanvas.handleMove;
      if (handleMove) {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mousemove', handleMove, true);
      }
      
      // Limpiar el estado interno del MoveCanvas
      if (moveCanvas._dragContext) {
        moveCanvas._dragContext = null;
      }
      
      if (moveCanvas._active) {
        moveCanvas._active = false;
      }
      
      console.log('MoveCanvas disabled successfully');
    }
    
  } catch (error) {
    console.warn('Error disabling MoveCanvas:', error);
  }
}

// Función para limpiar completamente el canvas y evitar errores getCTM
function cleanupCanvasCompletely() {
  try {
    console.log('Cleaning up canvas completely...');
    
    const canvasElement = document.getElementById('js-canvas');
    if (!canvasElement) {
      return;
    }
    
    // Remover todos los event listeners del elemento canvas
    const newCanvasElement = canvasElement.cloneNode(false);
    newCanvasElement.id = 'js-canvas';
    
    // Mantener las clases y estilos
    newCanvasElement.className = canvasElement.className;
    newCanvasElement.style.cssText = canvasElement.style.cssText;
    
    // Reemplazar el elemento completamente
    canvasElement.parentNode.replaceChild(newCanvasElement, canvasElement);
    
    console.log('Canvas cleanup completed');
    return true;
  } catch (error) {
    console.error('Error during canvas cleanup:', error);
    return false;
  }
}

// Función para habilitar herramientas de edición después de importar
function enableEditingTools() {
  try {
    console.log('Enabling editing tools...');
    
    if (!window.modeler) {
      console.warn('No modeler available');
      return false;
    }
    
    const canvas = window.modeler.get('canvas');
    const rootElement = canvas.getRootElement();
    
    if (rootElement) {
      // Seleccionar el elemento root para activar las herramientas
      const selection = window.modeler.get('selection');
      if (selection) {
        selection.select([]);
        console.log('Selection service activated');
      }
      
      // Verificar que las herramientas de creación estén disponibles
      const create = window.modeler.get('create');
      const elementFactory = window.modeler.get('elementFactory');
      const modeling = window.modeler.get('modeling');
      
      if (create && elementFactory && modeling) {
        console.log('All editing tools are available');
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
    console.log('Reactivating editing services...');
    
    if (!window.modeler) {
      console.warn('No modeler available for reactivating services');
      return false;
    }
    
    // Obtener servicios principales
    const canvas = window.modeler.get('canvas');
    const eventBus = window.modeler.get('eventBus');
    const contextPad = window.modeler.get('contextPad');
    const palette = window.modeler.get('palette');
    
    // Verificar que los servicios estén disponibles
    if (!canvas || !eventBus) {
      console.warn('Essential services not available');
      return false;
    }
    
    // Forzar actualización del canvas
    canvas.zoom('fit-viewport');
    
    // Forzar la activación de event listeners del canvas
    const canvasContainer = canvas.getContainer();
    if (canvasContainer) {
      // Disparar un evento para reactivar los listeners
      const mouseEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 0
      });
      canvasContainer.dispatchEvent(mouseEvent);
    }
    
    // Reactivar context pad si está disponible
    if (contextPad) {
      contextPad.open();
      setTimeout(() => contextPad.close(), 100); // Abrirlo y cerrarlo para reactivarlo
    }
    
    // Reactivar palette si está disponible
    if (palette) {
      try {
        palette.close();
        palette.open();
      } catch (paletteError) {
        console.warn('Error reactivating palette:', paletteError);
      }
    }
    
    console.log('Editing services reactivated successfully');
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
    console.log('File handlers already setup, skipping... (fileHandlersSetup:', fileHandlersSetup, ', eventListenersRegistered:', eventListenersRegistered, ')');
    return;
  }
  
  console.log('Setting up file handlers...');
  
  // Limpiar listeners existentes primero
  cleanupEventListeners();
  
  const fileInput = document.getElementById('file-input');
  if (!fileInput) {
    return;
  }

  fileHandlersSetup = true; // Marcar como configurado

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
      
      // Verificar tanto el flag como el timestamp
      if (isOpenButtonClicked || (now - lastOpenButtonClick < 3000)) {
        console.log('Open button clicked too recently, ignoring...');
        return;
      }
      
      isOpenButtonClicked = true;
      lastOpenButtonClick = now;
      
      // Timeout más largo para evitar clicks múltiples
      setTimeout(() => {
        isOpenButtonClicked = false;
      }, 3000); // 3 segundos en lugar de 1
      
      // Prevenir clicks adicionales por el event bubbling
      setTimeout(() => {
        cleanFileInput.click();
      }, 100); // Pequeño delay para evitar problemas de timing
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

  // Agregar event listener UNA SOLA VEZ al input limpio
  cleanFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      // Resetear el flag si no hay archivo seleccionado
      isProcessingFile = false;
      return;
    }
    
    // Prevenir procesamiento múltiple
    if (isProcessingFile) {
      console.log('Already processing a file, ignoring...');
      // Limpiar el input para evitar que se quede "seleccionado"
      event.target.value = '';
      return;
    }
    
    isProcessingFile = true;
    console.log('Starting file processing for:', file.name);

    try {
      console.log('File selected:', file.name);
      const content = await file.text();
      console.log('File content read, length:', content.length);
      
      // Mostrar el modeler primero y esperar a que esté completamente renderizado
      showModeler();
      
      // Esperar a que el DOM se actualice después de mostrar el modeler
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Asegurar que el modeler esté inicializado y esperar a que esté listo
      let modelerReady = false;
      let attempts = 0;
      const maxAttempts = 15;
      
      while (!modelerReady && attempts < maxAttempts) {
        // Verificar si el canvas existe en el DOM
        const canvasElement = document.getElementById('js-canvas');
        if (!canvasElement) {
          console.log('Canvas element not found, waiting... (attempt', attempts + 1, ')');
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
          continue;
        }
        
        if (!window.modeler) {
          console.log('Modeler not initialized, initializing... (attempt', attempts + 1, ')');
          try {
            await initializeModeler();
            // Esperar un poco más para asegurar que el DOM esté listo
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
              console.log('Modeler exists but canvas/SVG not accessible, reinitializing...');
              // Resetear el flag antes de reinicializar
              isModelerInitialized = false;
              await initializeModeler();
              await new Promise(resolve => setTimeout(resolve, 800));
            } else {
              console.log('Modeler already functional, continuing...');
            }
          } catch (error) {
            console.log('Modeler exists but not functional, reinitializing...');
            isModelerInitialized = false;
            await initializeModeler();
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
        
        // Verificar si el modeler está realmente listo
        if (window.modeler && typeof window.modeler.importXML === 'function') {
          try {
            // Intentar acceder al canvas para verificar que está completamente inicializado
            const canvas = window.modeler.get('canvas');
            const canvasContainer = canvas && canvas.getContainer();
            
            if (canvas && canvasContainer) {
              // Verificar también que el SVG esté disponible y funcional
              const svg = canvasContainer.querySelector('svg');
              if (svg && typeof svg.getCTM === 'function') {
                
                // Verificar que no hay listeners residuales que puedan causar problemas
                try {
                  const moveCanvas = window.modeler.get('moveCanvas');
                  if (moveCanvas && moveCanvas._eventBus) {
                    // Asegurar que los listeners estén correctamente configurados
                    console.log('MoveCanvas service is properly configured');
                  }
                } catch (moveCanvasError) {
                  console.warn('MoveCanvas service check failed:', moveCanvasError);
                }
                
                modelerReady = true;
                console.log('Modeler and SVG are ready!');
              } else {
                console.log('SVG not ready yet, waiting...');
                await new Promise(resolve => setTimeout(resolve, 400));
              }
            } else {
              console.log('Canvas not fully ready yet, waiting...');
              await new Promise(resolve => setTimeout(resolve, 400));
            }
          } catch (e) {
            console.log('Modeler not fully ready yet, waiting...');
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
        console.log('Detected .mmproject file, extracting BPMN...');
        try {
          const projectData = JSON.parse(content);
          if (projectData.bpmn && projectData.bpmn.trim()) {
            console.log('Found BPMN data in project, importing...');
            await window.modeler.importXML(projectData.bpmn);
            
            // Reactivar servicios de edición después de la importación
            setTimeout(() => {
              reactivateEditingServices();
              enableEditingTools();
            }, 500);
            
            updateUI('Proyecto importado.');
          } else {
            console.log('No BPMN data found in project, creating new diagram...');
            await createNewDiagram();
            updateUI('Proyecto sin diagrama BPMN - nuevo diagrama creado.');
          }
        } catch (parseError) {
          console.error('Error parsing .mmproject file:', parseError);
          throw new Error('Archivo .mmproject no válido');
        }
      } else if (fileExtension === 'bpmn' || fileExtension === 'xml') {
        console.log('Importing XML/BPMN...');
        await window.modeler.importXML(content);
        
        // Reactivar servicios de edición después de la importación
        setTimeout(() => {
          reactivateEditingServices();
          enableEditingTools();
        }, 500);
        
        updateUI('Diagrama importado.');
      } else {
        throw new Error('Tipo de archivo no soportado. Use .bpmn, .xml o .mmproject');
      }

      // Después de importar, asegurar que el canvas esté funcional
      console.log('Ensuring canvas is functional after import...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar que el canvas sigue siendo interactivo
      try {
        const canvas = window.modeler.get('canvas');
        const eventBus = window.modeler.get('eventBus');
        
        if (canvas && eventBus) {
          // Verificar que el SVG sigue siendo funcional antes de operar
          const canvasContainer = canvas.getContainer();
          const svg = canvasContainer.querySelector('svg');
          
          if (svg && typeof svg.getCTM === 'function') {
            // Forzar un re-render para asegurar que el canvas está activo
            canvas.zoom('fit-viewport');
            
            // Asegurar que los servicios necesarios para edición estén disponibles
            try {
              const modeling = window.modeler.get('modeling');
              const elementFactory = window.modeler.get('elementFactory');
              const create = window.modeler.get('create');
              const palette = window.modeler.get('palette');
              
              if (modeling && elementFactory && create && palette) {
                console.log('All editing services available');
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
            
            console.log('Canvas verified as functional');
          } else {
            console.warn('SVG not functional after import, skipping zoom operation');
          }
        }
      } catch (canvasError) {
        console.warn('Canvas verification failed:', canvasError);
      }
      
      event.target.value = ''; // Limpiar el input para permitir seleccionar el mismo archivo otra vez
      console.log('File imported successfully');
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
  // Evitar inicialización múltiple
  if (appInitialized) {
    console.log('App already initialized, skipping...');
    return;
  }
  
  console.log('Initializing app...');
  appInitialized = true;
  
  appInitialized = true;
  console.log('Initializing app...');
  
  welcomeScreen = document.getElementById('welcome-screen');
  modelerContainer = document.getElementById('modeler-container');
  
  if (!welcomeScreen || !modelerContainer) {
    console.error('Required DOM elements not found');
    appInitialized = false; // Reset para permitir reintento
    return;
  }

  setupFileHandlers();

  // Botones de la pantalla de bienvenida
  const newDiagramBtn = document.getElementById('new-diagram-btn');
  const openDiagramBtn = document.getElementById('open-diagram-btn');
  
  // Botones del header
  const newBtn = document.getElementById('new-btn');
  const openBtn = document.getElementById('open-btn');
  const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');

  if (newDiagramBtn) {
    newDiagramBtn.addEventListener('click', () => {
      console.log('New diagram button clicked!');
      handleNewDiagram();
    });
  }

  if (openDiagramBtn) {
    openDiagramBtn.addEventListener('click', () => {
      console.log('Open diagram button clicked!');
      const fileInput = document.getElementById('file-input');
      if (fileInput) {
        fileInput.click();
      }
    });
  }

  if (newBtn) {
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
