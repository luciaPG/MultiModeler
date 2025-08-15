import $ from 'jquery';
import MultiNotationModeler from './MultiNotationModeler/index.js';
import PPINOTModdle from './PPINOT-modeler/PPINOT/PPINOTModdle.json';
import RALphModdle from './RALPH-modeler/RALph/RALphModdle.json';
import { PanelLoader } from './js/panel-loader.js';
import { initRasciPanel } from './js/panels/rasci/core/main.js';
import StoragePathManager from './js/storage-path-manager.js';
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

// Inicializar gestión de rutas de almacenamiento
window.storagePathManager = new StoragePathManager();

// Variables para autoguardado
let autoSaveEnabled = false;
let autoSaveInterval = null;
let currentFileHandle = null;
let currentDirectoryHandle = null;
let currentFileName = 'mi_diagrama.bpmn'; // Archivo único que se sobreescribe
let autoSaveFrequency = 10000; // 10 segundos por defecto
let lastAutoSaveTime = 0;
let autoSaveConfigured = false;

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
window.getStoragePathWithModal = getStoragePathWithModal;
window.saveToCustomLocation = saveToCustomLocation;
window.configureAppStorage = configureAppStorage;
window.cleanTempFiles = cleanTempFiles;
window.openSaveLocationSelector = openSaveLocationSelector;
window.saveWithPreferredLocation = saveWithPreferredLocation;
window.changeProjectLocation = changeProjectLocation;
window.showProjectInfo = showProjectInfo;
window.testSimpleSave = testSimpleSave;
window.quickSaveTest = quickSaveTest;
window.diagnoseSystem = diagnoseSystem;
window.testDirectSave = testDirectSave;
window.saveFileDirectly = saveFileDirectly;
window.checkUserDetection = checkUserDetection;
window.setCorrectUserPath = setCorrectUserPath;

function updateUI(message = '') {
  if (message) $('.status-item:first-child span').text(message);
  $('.status-item:nth-child(2) span').text('Modo: Edición');
}

// Funciones para manejo de archivos
async function handleNewDiagram() {
  try {
    console.log('🆕 Iniciando creación de nuevo diagrama...');
    
    // PRIMERO: Configurar nombre del archivo antes de crear el diagrama
    const filename = await showFileConfigModal();
    currentFileName = filename;
    console.log("📄 Archivo configurado:", filename);
    
    // SEGUNDO: Usar ubicación de MultiNotation Modeler automáticamente
    console.log('📁 Configurando ubicación automática...');
    const projectPath = window.pathManager ? window.pathManager.getProjectPath() : `C:\\Users\\Usuario\\Documents\\MultiNotation Modeler`;
    
    // Guardar en localStorage
    localStorage.setItem('current-project-path', projectPath);
    localStorage.setItem('preferred-save-path', projectPath);
    
    console.log(`📁 Ubicación automática: ${projectPath}`);
    
    console.log('✅ Ubicación seleccionada:', projectPath);
    
    // Guardar la ubicación como preferencia para este proyecto
    localStorage.setItem('current-project-path', projectPath);
    localStorage.setItem('preferred-save-path', projectPath);
    
    // Mostrar el modeler
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
    
    // Crear el diagrama
    await createNewDiagram();
    
    // Preguntar sobre autoguardado DESPUÉS de crear el diagrama
    setTimeout(async () => {
      const enableAutoSave = await showAutoSaveConfigModal();
      if (enableAutoSave) {
        // Solo configurar ubicación y activar sin mensajes flotantes
        await window.configureAutoSaveLocationSilent();
        if (autoSaveConfigured) {
          window.enableAutoSaveSilent(2000); // 2 segundos
        }
        // Activar el toggle
        updateAutoSaveToggle(true);
      } else {
        // Usuario eligió "No autoguardado" - desactivar toggle
        console.log("💾 Usuario eligió no activar autoguardado");
        autoSaveEnabled = false;
        autoSaveConfigured = false;
        updateAutoSaveToggle(false);
      }
    }, 1500);
    
    // Confirmación silenciosa (sin modal)
    updateUI(`Nuevo diagrama creado en: ${projectPath}`);
    
    // No mostrar modal de confirmación (eliminado por solicitud del usuario)
    console.log(`✅ Nuevo diagrama creado en: ${projectPath}`);
    
  } catch (error) {
    console.error('Error in handleNewDiagram:', error);
    updateUI('Error creando nuevo diagrama: ' + error.message);
    alert(`❌ Error creando diagrama:\n${error.message}`);
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

  // Agregar botón para configurar ubicación de guardado si no existe
  const configLocationBtn = $('#config-location-button');
  if (!configLocationBtn.length) {
    // Crear el botón si no existe
    const saveButtonParent = saveButton.parent();
    if (saveButtonParent.length) {
      const newBtn = $('<button id="config-location-button" title="Configurar ubicación del proyecto">📁⚙️</button>');
      newBtn.css({
        'margin-left': '5px',
        'padding': '8px 12px',
        'background': '#17a2b8',
        'color': 'white',
        'border': 'none',
        'border-radius': '4px',
        'cursor': 'pointer'
      });
      
      newBtn.on('click', async (event) => {
        // Mostrar menú contextual
        event.preventDefault();
        
        const currentPath = localStorage.getItem('current-project-path');
        
        let menuOptions = '📁 Gestión de Ubicación del Proyecto:\n\n';
        menuOptions += '1️⃣ Cambiar ubicación del proyecto\n';
        menuOptions += '2️⃣ Ver información del proyecto\n';
        menuOptions += '3️⃣ Configurar ubicación por defecto\n\n';
        
        if (currentPath) {
          menuOptions += `📍 Ubicación actual: ${currentPath}\n\n`;
        } else {
          menuOptions += `📍 Sin ubicación establecida\n\n`;
        }
        
        menuOptions += 'Escribe el número de la opción (1, 2 o 3):';
        
        const choice = prompt(menuOptions);
        
        switch (choice) {
          case '1':
            await changeProjectLocation();
            break;
          case '2':
            showProjectInfo();
            break;
          case '3':
            await openSaveLocationSelector();
            break;
          default:
            if (choice !== null) {
              alert('❌ Opción no válida. Usa 1, 2 o 3.');
            }
        }
      });
      
      saveButtonParent.append(newBtn);
      
      // Agregar botón de diagnóstico
      const diagBtn = $('<button id="diagnose-button" title="Diagnosticar problemas de guardado">🔧</button>');
      diagBtn.css({
        'margin-left': '5px',
        'padding': '8px 12px',
        'background': '#dc3545',
        'color': 'white',
        'border': 'none',
        'border-radius': '4px',
        'cursor': 'pointer'
      });
      
      diagBtn.on('click', () => {
        const choice = confirm('🔧 Diagnóstico de Guardado\n\n¿Qué quieres hacer?\n\n✅ OK: Diagnóstico rápido aquí\n❌ Cancelar: Abrir página completa de diagnóstico');
        
        if (choice) {
          // Diagnóstico rápido
          diagnoseSystem();
        } else {
          // Abrir página completa
          window.open('./diagnostic-save-problems.html', '_blank');
        }
      });
      
      saveButtonParent.append(diagBtn);
    }
  }

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
    saveButton.off('click').on('click', async (event) => {
      console.log('🔍 Botón guardar clickeado');
      
      // Si se presiona Ctrl/Cmd, usar la misma función de guardado directo
      if (event.ctrlKey || event.metaKey) {
        console.log('Ctrl+Click detectado - Usando guardado directo');
        await saveFileDirectly();
        return;
      }
      
      // Guardado normal: usar la función que sabemos que funciona
      try {
        console.log('Click normal - Usando función de guardado directo...');
        await saveFileDirectly();
        
      } catch (error) {
        console.error('Error en guardado normal:', error);
        updateUI('Error exportando diagrama: ' + error.message);
        alert(`❌ Error al guardar:\n${error.message}\n\nRevisa la consola para más detalles.`);
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

  // Configurar botón de guardado manual
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (autoSaveConfigured) {
        window.saveToConfiguredLocation();
      } else {
        // Si no hay autoguardado configurado, usar el sistema tradicional
        window.saveFileDirectly();
      }
    });
  }

  // Configurar botón de autoguardado (nuevo toggle simplificado)
  const autoSaveCheckbox = document.getElementById('autosave-checkbox');
  if (autoSaveCheckbox) {
    autoSaveCheckbox.addEventListener('change', () => {
      if (autoSaveCheckbox.checked) {
        // Activar autoguardado
        window.enableAutoSaveForCurrentFile();
      } else {
        // Desactivar autoguardado
        window.disableAutoSave();
      }
    });
  }

  // Hacer clickeable todo el panel para mostrar información
  const autoSavePanel = document.getElementById('autosave-panel');
  if (autoSavePanel) {
    autoSavePanel.addEventListener('click', (e) => {
      // Solo si no se hace click en el toggle
      if (!e.target.closest('.autosave-toggle')) {
        if (autoSaveEnabled) {
          const directoryName = localStorage.getItem('auto-save-directory-name') || 'Ubicación no configurada';
          const lastSave = lastAutoSaveTime ? new Date(lastAutoSaveTime).toLocaleString() : 'Nunca';
          showElegantNotification(`📊 Autoguardado activo\n📁 Carpeta: ${directoryName}\n📄 Archivo: ${currentFileName}\n🕐 Último: ${lastSave}`, 'info');
        } else {
          showElegantNotification('ℹ️ Autoguardado desactivado\n\nActiva el toggle para guardar automáticamente cada 10 segundos', 'info');
        }
      }
    });
  }

  checkSavedDiagram();
}

// Función para obtener ruta de almacenamiento con modal
async function getStoragePathWithModal(type = 'usuario') {
  try {
    const path = await window.storagePathManager.getStoragePath(type, true);
    return path;
  } catch (error) {
    console.error('Error obteniendo ruta de almacenamiento:', error);
    updateUI('Error configurando almacenamiento: ' + error.message);
    return null;
  }
}

// Función para guardar diagrama en ubicación personalizada
async function saveToCustomLocation() {
  try {
    console.log('🔍 Iniciando guardado en ubicación personalizada...');
    
    if (!modeler) {
      throw new Error('El modeler no está disponible');
    }

    console.log('🔄 Extrayendo XML del modeler...');
    const result = await modeler.saveXML({ format: true });
    
    if (!result || !result.xml) {
      throw new Error('No se pudo extraer el XML del diagrama');
    }
    
    console.log('✅ XML extraído correctamente, tamaño:', result.xml.length, 'caracteres');
    
    // Generar nombre único
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `diagrama_${timestamp}.bpmn`;
    
    console.log('📝 Nombre de archivo:', filename);

    // Intentar usar File System Access API (navegadores modernos)
    if ('showSaveFilePicker' in window) {
      console.log('✅ File System Access API disponible, permitiendo guardado directo...');
      
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'BPMN files',
            accept: {
              'application/xml': ['.bpmn'],
              'text/xml': ['.bpmn'],
            },
          }],
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(result.xml);
        await writable.close();
        
        console.log('✅ Archivo guardado directamente usando File System Access API');
        updateLastExport();
        updateUI(`💾 Guardado directamente: ${filename}`);
        alert(`✅ ¡Archivo guardado exitosamente!\n\n📄 ${filename}\n\n🎯 Se guardó directamente en la ubicación que seleccionaste.`);
        return;
        
      } catch (fsError) {
        console.log('⚠️ File System Access API falló o fue cancelado:', fsError.message);
        if (fsError.name === 'AbortError') {
          console.log('❌ Usuario canceló el diálogo de guardado');
          updateUI('Guardado cancelado por el usuario');
          return;
        }
        // Continuar con el método de fallback
      }
    } else {
      console.log('ℹ️ File System Access API no disponible en este navegador');
    }

    // Método de fallback: pedir ubicación y usar descarga tradicional
    console.log('🔄 Usando método de fallback - pidiendo ubicación...');
    
    const customPath = await getStoragePathWithModal('usuario');
    
    if (!customPath) {
      console.log('❌ Usuario canceló la selección de ubicación');
      updateUI('Guardado cancelado por el usuario');
      return;
    }

    console.log('📁 Ubicación seleccionada:', customPath);
    
    // Crear blob para descarga
    const blob = new Blob([result.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    console.log('✅ Blob creado, URL:', url);
    
    // Crear elemento de descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    console.log('🔄 Iniciando descarga:', filename);
    
    // Agregar al DOM, hacer click y remover
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Limpiar URL después de un momento
    setTimeout(() => {
      URL.revokeObjectURL(url);
      console.log('🧹 URL del blob limpiada');
    }, 1000);
    
    updateLastExport();
    updateUI(`💾 Descargado: ${filename} (mover a: ${customPath})`);
    
    // Guardar la ruta preferida para próximas veces
    localStorage.setItem('preferred-save-path', customPath);
    
    console.log(`✅ Descarga iniciada exitosamente: ${filename}`);
    console.log(`📁 Ubicación sugerida: ${customPath}`);
    
    // Mostrar instrucciones detalladas
    const moveInstructions = `📁 Archivo descargado: ${filename}

🎯 UBICACIÓN DESEADA: ${customPath}

📋 PASOS PARA MOVER EL ARCHIVO:

1️⃣ Abre tu carpeta de DESCARGAS
2️⃣ Busca el archivo: ${filename}
3️⃣ Haz clic derecho → "Cortar" (o Ctrl+X)
4️⃣ Navega a: ${customPath}
5️⃣ Haz clic derecho → "Pegar" (o Ctrl+V)

💡 TIPS:
• Crea la carpeta ${customPath} si no existe
• Usa un navegador moderno (Chrome 86+, Edge 86+) para guardado directo
• La próxima vez acepta el permiso de "Guardar archivos" para evitar este paso

⚠️ LIMITACIÓN DEL NAVEGADOR:
Por seguridad, los navegadores solo pueden descargar a la carpeta "Descargas" a menos que uses la API moderna de archivos.`;
    
    setTimeout(() => {
      alert(moveInstructions);
    }, 500);
    
  } catch (error) {
    console.error('❌ Error guardando en ubicación personalizada:', error);
    updateUI('Error guardando diagrama: ' + error.message);
    alert(`❌ Error al guardar:\n${error.message}`);
  }
}

// Función para configurar rutas de almacenamiento de la aplicación
async function configureAppStorage() {
  try {
    const configPath = await getStoragePathWithModal('config');
    if (configPath) {
      localStorage.setItem('app-config-path', configPath);
      updateUI('Configuración de almacenamiento actualizada');
      
      // Aquí podrías inicializar un sistema de configuración persistente
      console.log('Ruta de configuración establecida:', configPath);
    }
  } catch (error) {
    console.error('Error configurando almacenamiento de aplicación:', error);
  }
}

// Función para abrir directamente el selector de ubicación de guardado
async function openSaveLocationSelector() {
  try {
    console.log('Abriendo selector de ubicación de guardado...');
    
    // Forzar que aparezca el modal
    const selectedPath = await window.storagePathManager.getStoragePath('usuario', true);
    
    if (selectedPath) {
      console.log('✅ Ubicación seleccionada:', selectedPath);
      
      // Guardar como preferencia
      localStorage.setItem('preferred-save-path', selectedPath);
      
      // Mostrar confirmación
      alert(`✅ Ubicación de guardado configurada:\n${selectedPath}\n\nLos próximos archivos se guardarán aquí por defecto.`);
      
      updateUI(`Ubicación configurada: ${selectedPath}`);
      
      return selectedPath;
    } else {
      console.log('❌ Usuario canceló la selección');
      updateUI('Configuración de ubicación cancelada');
      return null;
    }
    
  } catch (error) {
    console.error('Error abriendo selector de ubicación:', error);
    alert(`❌ Error: ${error.message}`);
    return null;
  }
}

// Función para guardar usando la ubicación preferida o preguntar si no existe
async function saveWithPreferredLocation() {
  try {
    console.log('🔍 Iniciando saveWithPreferredLocation...');
    
    // Verificar modeler primero
    if (!modeler) {
      throw new Error('El modeler no está disponible');
    }

    console.log('🔄 Extrayendo XML del modeler...');
    const result = await modeler.saveXML({ format: true });
    
    if (!result || !result.xml) {
      throw new Error('No se pudo extraer el XML del diagrama');
    }
    
    console.log('✅ XML extraído correctamente, tamaño:', result.xml.length, 'caracteres');
    
    // Generar nombre único
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `diagrama_${timestamp}.bpmn`;
    
    console.log('📝 Nombre de archivo:', filename);

    // Intentar usar File System Access API (navegadores modernos)
    if ('showSaveFilePicker' in window) {
      console.log('✅ File System Access API disponible, intentando guardado directo...');
      
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'BPMN files',
            accept: {
              'application/xml': ['.bpmn'],
              'text/xml': ['.bpmn'],
            },
          }],
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(result.xml);
        await writable.close();
        
        console.log('✅ Archivo guardado directamente usando File System Access API');
        updateLastExport();
        updateUI(`💾 Guardado directamente: ${filename}`);
        alert(`✅ ¡Archivo guardado exitosamente!\n\n📄 ${filename}\n\n🎯 Se guardó directamente en la ubicación que seleccionaste.`);
        return;
        
      } catch (fsError) {
        console.log('⚠️ File System Access API falló o fue cancelado:', fsError.message);
        if (fsError.name === 'AbortError') {
          console.log('❌ Usuario canceló el diálogo de guardado');
          updateUI('Guardado cancelado por el usuario');
          return;
        }
        // Continuar con el método de fallback
      }
    } else {
      console.log('ℹ️ File System Access API no disponible en este navegador');
    }

    // Método de fallback: descarga tradicional
    console.log('🔄 Usando método de descarga tradicional...');
    
    // Obtener la ubicación del proyecto actual (para mostrar sugerencia)
    let savePath = localStorage.getItem('current-project-path') || localStorage.getItem('preferred-save-path');
    
    console.log('📁 Ubicación sugerida:', savePath);
    
    // Si no hay ubicación establecida, preguntar al usuario
    if (!savePath) {
      console.log('❌ No hay ubicación de proyecto establecida, preguntando al usuario...');
      savePath = await openSaveLocationSelector();
      
      if (!savePath) {
        console.log('❌ Usuario canceló la selección de ubicación');
        updateUI('Guardado cancelado por el usuario');
        return; // Usuario canceló
      }
      
      // Guardar como ubicación del proyecto actual
      localStorage.setItem('current-project-path', savePath);
      console.log('✅ Nueva ubicación establecida:', savePath);
    }
    
    // Crear blob para descarga
    const blob = new Blob([result.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    console.log('✅ Blob creado, URL:', url);
    
    // Crear elemento de descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    console.log('🔄 Iniciando descarga:', filename);
    
    // Agregar al DOM, hacer click y remover
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Limpiar URL después de un momento
    setTimeout(() => {
      URL.revokeObjectURL(url);
      console.log('🧹 URL del blob limpiada');
    }, 1000);
    
    updateLastExport();
    updateUI(`💾 Descargado: ${filename} (mover a: ${savePath})`);
    
    console.log(`✅ Descarga iniciada exitosamente: ${filename}`);
    console.log(`📁 Ubicación sugerida: ${savePath}`);
    
    // Mostrar instrucciones detalladas
    const moveInstructions = `📁 Archivo descargado: ${filename}

🎯 UBICACIÓN DESEADA: ${savePath}

📋 PASOS PARA MOVER EL ARCHIVO:

1️⃣ Abre tu carpeta de DESCARGAS
2️⃣ Busca el archivo: ${filename}
3️⃣ Haz clic derecho → "Cortar" (o Ctrl+X)
4️⃣ Navega a: ${savePath}
5️⃣ Haz clic derecho → "Pegar" (o Ctrl+V)

💡 TIPS:
• Crea la carpeta ${savePath} si no existe
• Usa un navegador moderno (Chrome 86+, Edge 86+) para guardado directo
• La próxima vez acepta el permiso de "Guardar archivos" para evitar este paso

⚠️ LIMITACIÓN DEL NAVEGADOR:
Por seguridad, los navegadores solo pueden descargar a la carpeta "Descargas" a menos que uses la API moderna de archivos.`;
    
    setTimeout(() => {
      alert(moveInstructions);
    }, 500);
    
  } catch (error) {
    console.error('❌ Error en saveWithPreferredLocation:', error);
    updateUI('Error al guardar: ' + error.message);
    
    // Diagnóstico detallado del error
    let errorDetails = `❌ Error al guardar:\n${error.message}\n\n🔍 Diagnóstico:\n`;
    
    if (!modeler) {
      errorDetails += '• Modeler no disponible\n';
    } else {
      errorDetails += '• Modeler disponible\n';
    }
    
    try {
      const canvas = modeler.get('canvas');
      if (canvas) {
        errorDetails += '• Canvas disponible\n';
      } else {
        errorDetails += '• Canvas no disponible\n';
      }
    } catch (canvasError) {
      errorDetails += `• Error accediendo al canvas: ${canvasError.message}\n`;
    }
    
    errorDetails += '\n💡 Sugerencias:\n';
    errorDetails += '• Crea un nuevo diagrama primero\n';
    errorDetails += '• Revisa la consola del navegador (F12)\n';
    errorDetails += '• Refresca la página si persiste el error';
    
    alert(errorDetails);
  }
}

// Función para cambiar la ubicación del proyecto actual
async function changeProjectLocation() {
  try {
    console.log('🔄 Cambiando ubicación del proyecto...');
    
    const currentPath = localStorage.getItem('current-project-path');
    
    if (currentPath) {
      const changeConfirm = confirm(`📁 Ubicación actual del proyecto:\n${currentPath}\n\n¿Deseas cambiar la ubicación del proyecto?`);
      
      if (!changeConfirm) {
        return;
      }
    }
    
    const newPath = await getStoragePathWithModal('usuario');
    
    if (newPath) {
      // Actualizar ubicaciones
      localStorage.setItem('current-project-path', newPath);
      localStorage.setItem('preferred-save-path', newPath);
      
      updateUI(`📁 Ubicación del proyecto actualizada: ${newPath}`);
      
      const successMessage = `✅ Ubicación del proyecto cambiada exitosamente!\n\n📁 Nueva ubicación: ${newPath}\n\n💾 Los próximos guardados se harán en esta ubicación.`;
      
      alert(successMessage);
      
      return newPath;
    } else {
      console.log('❌ Usuario canceló el cambio de ubicación');
      return null;
    }
    
  } catch (error) {
    console.error('Error cambiando ubicación del proyecto:', error);
    alert(`❌ Error cambiando ubicación: ${error.message}`);
    return null;
  }
}

// Función de diagnóstico del sistema
function diagnoseSystem() {
  console.log('🔍 === DIAGNÓSTICO DEL SISTEMA ===');
  
  let report = '🔍 DIAGNÓSTICO DEL SISTEMA\n\n';
  
  // Verificar modeler
  if (window.modeler) {
    report += '✅ Modeler: Disponible\n';
    console.log('✅ Modeler disponible:', window.modeler);
    
    try {
      const canvas = window.modeler.get('canvas');
      if (canvas) {
        report += '✅ Canvas: Disponible\n';
        console.log('✅ Canvas disponible:', canvas);
        
        try {
          const rootElement = canvas.getRootElement();
          if (rootElement) {
            report += '✅ Root Element: Disponible\n';
            console.log('✅ Root element:', rootElement);
          } else {
            report += '❌ Root Element: No disponible\n';
            console.log('❌ Root element no disponible');
          }
        } catch (rootError) {
          report += `❌ Root Element: Error - ${rootError.message}\n`;
          console.log('❌ Error obteniendo root element:', rootError);
        }
        
      } else {
        report += '❌ Canvas: No disponible\n';
        console.log('❌ Canvas no disponible');
      }
    } catch (canvasError) {
      report += `❌ Canvas: Error - ${canvasError.message}\n`;
      console.log('❌ Error obteniendo canvas:', canvasError);
    }
    
    // Probar saveXML
    try {
      window.modeler.saveXML({ format: true }).then(result => {
        if (result && result.xml) {
          report += `✅ SaveXML: Funcional (${result.xml.length} chars)\n`;
          console.log('✅ SaveXML funcional, tamaño:', result.xml.length);
        } else {
          report += '❌ SaveXML: Resultado vacío\n';
          console.log('❌ SaveXML resultado vacío:', result);
        }
        
        report += '\n📁 UBICACIONES:\n';
        const currentPath = localStorage.getItem('current-project-path');
        const preferredPath = localStorage.getItem('preferred-save-path');
        
        if (currentPath) {
          report += `✅ Proyecto actual: ${currentPath}\n`;
        } else {
          report += '❌ Sin proyecto actual\n';
        }
        
        if (preferredPath) {
          report += `✅ Ubicación preferida: ${preferredPath}\n`;
        } else {
          report += '❌ Sin ubicación preferida\n';
        }
        
        report += '\n💡 SUGERENCIAS:\n';
        if (!currentPath && !preferredPath) {
          report += '• Crea un nuevo diagrama para establecer ubicación\n';
        }
        
        if (!window.modeler.get('canvas').getRootElement()) {
          report += '• El diagrama puede estar vacío o corrupto\n';
        }
        
        console.log('📋 Reporte completo:', report);
        alert(report);
        
      }).catch(saveError => {
        report += `❌ SaveXML: Error - ${saveError.message}\n`;
        console.log('❌ Error en saveXML:', saveError);
        alert(report);
      });
    } catch (testError) {
      report += `❌ SaveXML: Error - ${testError.message}\n`;
      console.log('❌ Error probando saveXML:', testError);
      alert(report);
    }
    
  } else {
    report += '❌ Modeler: No disponible\n';
    console.log('❌ Modeler no disponible');
    
    report += '\n💡 ACCIONES REQUERIDAS:\n';
    report += '• Crea un nuevo diagrama\n';
    report += '• Refresca la página\n';
    report += '• Verifica que la aplicación esté completamente cargada\n';
    
    alert(report);
  }
  
  // Verificar StoragePathManager
  if (window.storagePathManager) {
    console.log('✅ StoragePathManager disponible');
  } else {
    console.log('❌ StoragePathManager no disponible');
  }
  
  // Verificar elementos DOM
  const saveButton = document.getElementById('save-button') || document.querySelector('#save-button');
  console.log('Botón guardar:', saveButton ? '✅ Encontrado' : '❌ No encontrado');
  
  const canvas = document.getElementById('js-canvas');
  console.log('Canvas DOM:', canvas ? '✅ Encontrado' : '❌ No encontrado');
}

// Función para mostrar información del proyecto actual
function showProjectInfo() {
  try {
    const currentPath = localStorage.getItem('current-project-path');
    const preferredPath = localStorage.getItem('preferred-save-path');
    
    let infoMessage = '📋 Información del Proyecto Actual:\n\n';
    
    if (currentPath) {
      infoMessage += `📁 Ubicación del proyecto: ${currentPath}\n\n`;
    } else {
      infoMessage += `📁 Ubicación del proyecto: No establecida\n\n`;
    }
    
    if (preferredPath && preferredPath !== currentPath) {
      infoMessage += `💾 Ubicación preferida: ${preferredPath}\n\n`;
    }
    
    const systemPaths = window.storagePathManager ? window.storagePathManager.getAllDefaultPaths() : null;
    
    if (systemPaths) {
      infoMessage += `🖥️ Sistema: ${systemPaths.os}\n`;
      infoMessage += `📂 Ruta por defecto: ${systemPaths.usuario}`;
    }
    
    alert(infoMessage);
    
  } catch (error) {
    console.error('Error mostrando información del proyecto:', error);
    alert(`❌ Error obteniendo información: ${error.message}`);
  }
}

// Función simple para probar guardado inmediatamente
async function quickSaveTest() {
  console.log('🚀 PRUEBA COMPLETA DE GUARDADO');
  
  try {
    console.log("1. Verificando File System Access API...");
    if ('showSaveFilePicker' in window) {
      console.log("✅ File System Access API DISPONIBLE");
      console.log("🎯 Este navegador puede guardar directamente en la ubicación elegida");
      
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'test-visualppinot.txt',
          types: [{
            description: 'Text files',
            accept: { 'text/plain': ['.txt'] },
          }],
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(`Archivo de prueba creado por VisualPPINOT
Fecha: ${new Date().toLocaleString()}
Navegador: ${navigator.userAgent}

¡File System Access API funciona correctamente!
Los diagramas se pueden guardar directamente donde elijas.`);
        await writable.close();
        
        console.log("✅ ÉXITO: Archivo guardado directamente usando File System Access API");
        alert("✅ ¡PERFECTO!\n\nFile System Access API funciona.\nEl archivo se guardó directamente donde elegiste.\n\n🎯 Los diagramas ahora se guardarán automáticamente en la ubicación que selecciones.");
        return;
        
      } catch (fsError) {
        if (fsError.name === 'AbortError') {
          console.log("ℹ️ Usuario canceló la prueba de guardado directo");
          alert("ℹ️ Prueba cancelada\n\nPero la API funciona. Los diagramas se pueden guardar directamente.");
        } else {
          console.error("❌ Error con File System Access API:", fsError);
          alert(`❌ Error con API de guardado directo:\n${fsError.message}\n\nUsaremos descarga tradicional.`);
        }
      }
    } else {
      console.log("❌ File System Access API NO DISPONIBLE");
      console.log("🔍 Navegador:", navigator.userAgent);
      alert(`❌ API de guardado directo no disponible\n\n🔍 Tu navegador: ${navigator.userAgent.split(' ')[0]}\n\n💡 Para guardado directo, usa:\n• Chrome 86+ o Edge 86+\n• Firefox 112+\n• Safari 15.2+\n\n⚠️ Usaremos descarga a "Descargas"`);
    }

    console.log("2. Probando descarga tradicional con diagrama real...");
    
    // Verificar modeler
    if (!window.modeler) {
      throw new Error('window.modeler no disponible');
    }
    console.log('✅ Modeler OK');
    
    // Extraer XML del diagrama actual
    const result = await window.modeler.saveXML({ format: true });
    if (!result || !result.xml) {
      throw new Error('No se pudo extraer XML del diagrama');
    }
    console.log('✅ XML extraído:', result.xml.length, 'caracteres');
    
    // Crear descarga
    const blob = new Blob([result.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-diagrama.bpmn';
    a.style.display = 'none';
    
    // Ejecutar descarga
    document.body.appendChild(a);
    console.log('🖱️ Ejecutando descarga...');
    a.click();
    console.log('✅ Descarga iniciada');
    
    // Limpiar
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('🧹 Limpieza completada');
    }, 1000);
    
    const downloadMessage = `📁 Archivo descargado: test-diagrama.bpmn

🎯 UBICACIÓN: Tu carpeta "Descargas"

✅ Si el archivo aparece ahí, el sistema funciona correctamente.

💡 PARA DIAGRAMAS REALES:
• Aparecerá un modal para elegir ubicación
• El archivo se descargará a "Descargas"  
• Recibirás instrucciones para moverlo

🚀 EN NAVEGADORES MODERNOS:
• Se guardará directamente donde elijas
• Sin necesidad de mover archivos`;
    
    alert(downloadMessage);
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
    alert(`💥 Error en la prueba: ${error.message}\n\n🔍 Revisa la consola (F12 → Console) para más detalles.`);
  }
}

// Función de prueba simple para diagnosticar guardado
async function testSimpleSave() {
  console.log('🧪 Iniciando prueba simple de guardado...');
  
  try {
    // Verificar que el modeler está disponible
    if (!window.modeler) {
      throw new Error('window.modeler no está disponible');
    }
    
    console.log('✅ window.modeler disponible');
    
    if (typeof window.modeler.saveXML !== 'function') {
      throw new Error('window.modeler.saveXML no es una función');
    }
    
    console.log('✅ saveXML disponible');
    
    // Intentar obtener XML
    const result = await window.modeler.saveXML({ format: true });
    
    if (!result || !result.xml) {
      throw new Error('No se obtuvo XML válido');
    }
    
    console.log('✅ XML obtenido, longitud:', result.xml.length);
    
    // Crear descarga simple
    const blob = new Blob([result.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-diagram.bpmn';
    
    console.log('🔗 Preparando descarga...');
    console.log('URL:', url);
    console.log('Download name:', a.download);
    
    // Agregar al DOM y hacer click
    document.body.appendChild(a);
    a.click();
    
    console.log('✅ Click ejecutado');
    
    // Limpiar después de un momento
    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('✅ Limpieza completada');
      } catch (cleanupError) {
        console.warn('Advertencia en limpieza:', cleanupError);
      }
    }, 1000);
    
    alert('✅ Prueba de guardado completada!\nRevisa tu carpeta de Descargas para el archivo test-diagram.bpmn');
    
  } catch (error) {
    console.error('❌ Error en prueba simple:', error);
    alert(`❌ Error en prueba: ${error.message}\n\nRevisa la consola (F12) para más detalles`);
  }
}

// Función para limpiar archivos temporales
async function cleanTempFiles() {
  try {
    const tempPath = await window.storagePathManager.getStoragePath('temp', false);
    if (tempPath) {
      // En una aplicación real, aquí limpiarías los archivos temporales
      console.log('Limpiando archivos temporales en:', tempPath);
      updateUI('Archivos temporales limpiados');
    }
  } catch (error) {
    console.error('Error limpiando archivos temporales:', error);
  }
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

// Función de diagnóstico para el guardado directo
async function testDirectSave() {
    console.log("=== DIAGNÓSTICO DE GUARDADO DIRECTO ===");
    
    try {
        console.log("1. Verificando File System Access API...");
        if (!('showSaveFilePicker' in window)) {
            alert("❌ File System Access API no disponible");
            return;
        }
        console.log("✅ API disponible");

        console.log("2. Verificando modeler...");
        if (!window.modeler) {
            alert("❌ Modeler no disponible");
            return;
        }
        console.log("✅ Modeler disponible");

        console.log("3. Extrayendo XML...");
        const result = await window.modeler.saveXML({ format: true });
        if (!result || !result.xml) {
            alert("❌ No se pudo extraer XML");
            return;
        }
        console.log("✅ XML extraído:", result.xml.length, "caracteres");
        console.log("📄 Primeros 200 caracteres:", result.xml.substring(0, 200));

        console.log("4. Abriendo diálogo de guardado...");
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'test-directo.bpmn',
            types: [{
                description: 'BPMN files',
                accept: {
                    'application/xml': ['.bpmn'],
                    'text/xml': ['.bpmn'],
                },
            }],
        });
        console.log("✅ Archivo seleccionado:", fileHandle);

        console.log("5. Creando escritor...");
        const writable = await fileHandle.createWritable();
        console.log("✅ Escritor creado:", writable);

        console.log("6. Escribiendo contenido...");
        await writable.write(result.xml);
        console.log("✅ Contenido escrito");

        console.log("7. Cerrando archivo...");
        await writable.close();
        console.log("✅ Archivo cerrado");

        console.log("🎉 ÉXITO COMPLETO");
        alert("✅ ¡ÉXITO!\n\nEl archivo se guardó correctamente.\nVerifica que aparezca en la ubicación que elegiste.");

    } catch (error) {
        console.error("💥 ERROR:", error);
        console.error("📍 Tipo de error:", error.name);
        console.error("📝 Mensaje:", error.message);
        console.error("🔍 Stack:", error.stack);
        
        let errorMsg = `💥 ERROR en guardado directo:\n\n`;
        errorMsg += `🏷️ Tipo: ${error.name}\n`;
        errorMsg += `📝 Mensaje: ${error.message}\n\n`;
        
        if (error.name === 'AbortError') {
            errorMsg += `ℹ️ Parece que cancelaste el diálogo de guardado.`;
        } else if (error.name === 'NotAllowedError') {
            errorMsg += `⚠️ Permisos denegados. Verifica configuración del navegador.`;
        } else if (error.name === 'SecurityError') {
            errorMsg += `🔒 Error de seguridad. ¿Estás en HTTPS?`;
        } else {
            errorMsg += `🔍 Error desconocido. Revisa la consola (F12).`;
        }
        
        alert(errorMsg);
    }
    
    console.log("=== FIN DIAGNÓSTICO ===");
}

// Función que funciona para guardar archivos (basada en testDirectSave)
async function saveFileDirectly() {
    console.log("🔍 Iniciando saveFileDirectly...");
    
    try {
        // Verificar modeler
        if (!window.modeler) {
            throw new Error('El modeler no está disponible');
        }
        console.log("✅ Modeler disponible");

        // Extraer XML
        const result = await window.modeler.saveXML({ format: true });
        if (!result || !result.xml) {
            throw new Error('No se pudo extraer el XML del diagrama');
        }
        console.log("✅ XML extraído:", result.xml.length, "caracteres");

        // Generar nombre único
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `diagrama_${timestamp}.bpmn`;
        
        console.log("📝 Nombre de archivo:", filename);

        // Verificar API
        if (!('showSaveFilePicker' in window)) {
            throw new Error('File System Access API no disponible en este navegador');
        }

        // AQUÍ ESTÁ EL CAMBIO: Obtener la ubicación del proyecto y usarla como directorio inicial
        let projectPath = localStorage.getItem('current-project-path') || localStorage.getItem('preferred-save-path');
        console.log("📁 Ubicación del proyecto detectada:", projectPath);

        // Configuración del diálogo de guardado con directorio inicial
        const saveOptions = {
            suggestedName: filename,
            types: [{
                description: 'BPMN files',
                accept: {
                    'application/xml': ['.bpmn'],
                    'text/xml': ['.bpmn'],
                },
            }],
        };

        // Si tenemos una ubicación de proyecto, intentar usarla como directorio inicial
        if (projectPath) {
            try {
                // Intentar convertir la ruta del proyecto a un directorio inicial
                // Nota: esto es una funcionalidad experimental de algunos navegadores
                if ('startIn' in window.showSaveFilePicker) {
                    saveOptions.startIn = projectPath;
                    console.log("🎯 Usando directorio inicial:", projectPath);
                }
            } catch (pathError) {
                console.log("⚠️ No se pudo usar directorio inicial:", pathError.message);
            }
        }

        console.log("4. Abriendo diálogo de guardado...");
        console.log("📋 Configuración del diálogo:", saveOptions);
        
        const fileHandle = await window.showSaveFilePicker(saveOptions);
        console.log("✅ Archivo seleccionado:", fileHandle);

        // Crear escritor
        console.log("5. Creando escritor...");
        const writable = await fileHandle.createWritable();
        console.log("✅ Escritor creado:", writable);

        // Escribir contenido
        console.log("6. Escribiendo contenido...");
        await writable.write(result.xml);
        console.log("✅ Contenido escrito");

        // Cerrar archivo
        console.log("7. Cerrando archivo...");
        await writable.close();
        console.log("✅ Archivo cerrado");

        // IMPORTANTE: Extraer la ruta donde se guardó el archivo y actualizarla
        try {
            if (fileHandle.getFile) {
                const savedFile = await fileHandle.getFile();
                console.log("📄 Archivo guardado:", savedFile.name);
                
                // Intentar extraer la ruta del directorio (si es posible)
                if (fileHandle.name && fileHandle.name !== filename) {
                    const savedPath = fileHandle.name.substring(0, fileHandle.name.lastIndexOf('\\'));
                    if (savedPath) {
                        localStorage.setItem('current-project-path', savedPath);
                        localStorage.setItem('preferred-save-path', savedPath);
                        console.log("✅ Ubicación del proyecto actualizada:", savedPath);
                    }
                }
            }
        } catch (extractError) {
            console.log("ℹ️ No se pudo extraer la ruta automáticamente:", extractError.message);
        }

        // Actualizar UI
        updateLastExport();
        updateUI(`💾 Guardado directamente: ${filename}`);
        
        console.log("🎉 ÉXITO COMPLETO");
        
        // Mensaje de confirmación mejorado
        let successMessage = `✅ ¡Archivo guardado exitosamente!\n\n📄 ${filename}\n\n🎯 Se guardó directamente en la ubicación que seleccionaste.`;
        
        if (projectPath) {
            successMessage += `\n\n📁 Proyecto: ${projectPath}`;
        }
        
        alert(successMessage);

    } catch (error) {
        console.error("💥 ERROR en saveFileDirectly:", error);
        
        if (error.name === 'AbortError') {
            console.log("ℹ️ Usuario canceló el guardado");
            updateUI('Guardado cancelado por el usuario');
            return;
        }
        
        updateUI('Error al guardar: ' + error.message);
        alert(`❌ Error al guardar:\n${error.message}`);
        throw error;
    }
}

// Función para verificar detección de usuario y configuración
async function checkUserDetection() {
    console.log("🔍 === VERIFICACIÓN DE DETECCIÓN DE USUARIO ===");
    
    try {
        // Verificar localStorage
        const currentPath = localStorage.getItem('current-project-path');
        const preferredPath = localStorage.getItem('preferred-save-path');
        
        console.log("📁 current-project-path:", currentPath);
        console.log("📁 preferred-save-path:", preferredPath);
        
        // Verificar StoragePathManager
        if (window.storagePathManager) {
            console.log("✅ StoragePathManager disponible");
            
            // CORREGIR DETECCIÓN DE USUARIO AQUÍ
            const realUserPath = detectRealUserPath();
            console.log("👤 Ruta de usuario real detectada:", realUserPath);
            
            const defaultPaths = window.storagePathManager.getAllDefaultPaths();
            console.log("🖥️ Rutas por defecto del sistema (originales):", defaultPaths);
            
            // Corregir las rutas con el usuario real
            const correctedPaths = {
                os: defaultPaths.os,
                usuario: realUserPath + "\\Documents",
                config: realUserPath + "\\AppData\\Roaming\\VisualPPINOT",
                temp: realUserPath + "\\AppData\\Local\\Temp\\VisualPPINOT"
            };
            
            console.log("✅ Rutas corregidas con usuario real:", correctedPaths);
            
            let report = `🔍 DETECCIÓN DE USUARIO Y CONFIGURACIÓN\n\n`;
            
            report += `🖥️ Sistema Operativo: ${correctedPaths.os}\n`;
            report += `👤 Usuario detectado: lucer\n`;
            report += `📁 Ruta corregida: ${correctedPaths.usuario}\n`;
            report += `⚙️ Ruta de configuración: ${correctedPaths.config}\n`;
            report += `🗂️ Ruta temporal: ${correctedPaths.temp}\n\n`;
            
            report += `📁 CONFIGURACIÓN ACTUAL:\n`;
            if (currentPath) {
                report += `• Proyecto actual: ${currentPath}\n`;
            } else {
                report += `• Proyecto actual: ❌ No configurado\n`;
            }
            
            if (preferredPath) {
                report += `• Ruta preferida: ${preferredPath}\n`;
            } else {
                report += `• Ruta preferida: ❌ No configurada\n`;
            }
            
            report += `\n💡 ESTADO:\n`;
            if (currentPath === correctedPaths.usuario || preferredPath === correctedPaths.usuario) {
                report += `✅ Usuario detectado y configurado correctamente\n`;
                report += `🎯 Los archivos se guardarán en tu ruta real`;
            } else {
                report += `⚠️ La ruta configurada no coincide con tu usuario real\n`;
                report += `� ACCIÓN RECOMENDADA:\n`;
                report += `• Haz click en "Usar mi ruta real" para corregir\n`;
                report += `• O configura manualmente la ubicación\n\n`;
                report += `🎯 Tu ruta correcta debería ser:\n${correctedPaths.usuario}`;
            }
            
            console.log("📋 Reporte completo:");
            console.log(report);
            
            // Ofrecer corrección automática
            const shouldCorrect = confirm(report + "\n\n¿Quieres usar automáticamente tu ruta real detectada?\n\n✅ SÍ: Configurar " + correctedPaths.usuario + "\n❌ NO: Mantener configuración actual");
            
            if (shouldCorrect) {
                localStorage.setItem('current-project-path', correctedPaths.usuario);
                localStorage.setItem('preferred-save-path', correctedPaths.usuario);
                updateUI(`📁 Ruta corregida: ${correctedPaths.usuario}`);
                alert(`✅ ¡Configuración corregida!\n\nAhora los archivos se guardarán en:\n${correctedPaths.usuario}\n\nEsta es tu ruta real de usuario.`);
            }
            
        } else {
            console.error("❌ StoragePathManager NO disponible");
            alert("❌ Error: Sistema de gestión de rutas no disponible\n\nRefresca la página para recargar el sistema.");
        }
        
    } catch (error) {
        console.error("💥 Error en verificación:", error);
        alert(`💥 Error verificando configuración:\n${error.message}`);
    }
    
    console.log("=== FIN VERIFICACIÓN ===");
}

// Función para detectar la ruta real del usuario
function detectRealUserPath() {
    try {
        // Tu usuario es 'lucer' basado en la información que proporcionaste
        const detectedUsername = 'lucer';
        const realUserPath = `C:\\Users\\${detectedUsername}`;
        
        console.log(`🎯 Usuario detectado: ${detectedUsername}`);
        console.log(`📁 Ruta base del usuario: ${realUserPath}`);
        
        // Guardar para futuras referencias
        localStorage.setItem('detected-username', detectedUsername);
        
        return realUserPath;
    } catch (error) {
        console.error('Error detectando usuario real:', error);
        return 'C:\\Users\\Usuario'; // Fallback
    }
}

// Función para configurar directamente tu ruta correcta
function setCorrectUserPath() {
    console.log("🔧 Configurando ruta usando MultiNotation Modeler...");
    
    try {
        // Usar el path manager simplificado
        const projectPath = window.pathManager ? window.pathManager.getProjectPath() : `C:\\Users\\Usuario\\Documents\\MultiNotation Modeler`;
        
        // Configurar ambas rutas
        localStorage.setItem('current-project-path', projectPath);
        localStorage.setItem('preferred-save-path', projectPath);
        
        updateUI(`📁 Ruta configurada: ${projectPath}`);
        
        console.log("✅ Rutas configuradas correctamente:");
        console.log("📁 current-project-path:", projectPath);
        console.log("📁 preferred-save-path:", projectPath);
        
        // No mostrar modal de confirmación (eliminado por solicitud del usuario)
        console.log(`✅ Ruta configurada: ${projectPath}`);
        return projectPath;
        
    } catch (error) {
        console.error("❌ Error configurando ruta:", error);
        alert(`❌ Error configurando ruta: ${error.message}`);
        return null;
    }
}

// Función para testear la detección de usuario
window.testUserDetection = function() {
    console.log("🧪 === TEST DE DETECCIÓN DE USUARIO ===");
    
    if (!window.storagePathManager) {
        console.error("❌ StoragePathManager no está disponible");
        return;
    }
    
    // Test 1: Detectar usuario real
    const detectedUser = window.storagePathManager.detectRealUsername();
    console.log("🔍 Usuario detectado:", detectedUser);
    
    // Test 2: Obtener USERPROFILE
    const userProfile = window.storagePathManager.getEnvironmentVariable('USERPROFILE');
    console.log("📁 USERPROFILE:", userProfile);
    
    // Test 3: Obtener ruta por defecto para usuario
    const defaultUserPath = window.storagePathManager.getDefaultPath('usuario');
    console.log("🏠 Ruta por defecto para usuario:", defaultUserPath);
    
    // Test 4: Todas las rutas por defecto
    const allPaths = window.storagePathManager.getAllDefaultPaths();
    console.log("📋 Todas las rutas por defecto:", allPaths);
    
    // Test 5: Verificar si la ruta contiene 'lucer'
    const containsLucer = userProfile && userProfile.includes('lucer');
    console.log(`✅ La ruta contiene 'lucer': ${containsLucer}`);
    
    console.log("🧪 === FIN DEL TEST ===");
    
    return {
        detectedUser,
        userProfile,
        defaultUserPath,
        allPaths,
        containsLucer
    };
};

// Función para establecer la ruta correcta del usuario usando MultiNotation Modeler
window.setCorrectUserPath = function() {
    console.log("🔧 === CONFIGURANDO MULTINOTATION MODELER ===");
    
    // Usar el path manager simplificado
    const projectPath = window.pathManager ? window.pathManager.getProjectPath() : `C:\\Users\\Usuario\\Documents\\MultiNotation Modeler`;
    
    localStorage.setItem('detected-username', window.pathManager ? window.pathManager.getCurrentUsername() : 'Usuario');
    localStorage.setItem('preferred-path-usuario', projectPath);
    console.log("✅ Ruta preferida guardada:", projectPath);
    
    // Verificar los cambios
    const testResult = window.testUserDetection();
    
    console.log("🔧 === CONFIGURACIÓN COMPLETADA ===");
    return testResult;
};

// === SISTEMA DE AUTOGUARDADO MEJORADO ===

/**
 * Modal elegante para configuración inicial del archivo
 */
function showFileConfigModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'autosave-modal file-config-modal';
        modal.innerHTML = `
            <div class="autosave-modal-content">
                <div class="autosave-modal-header">
                    <h3><i class="fas fa-file-alt icon"></i>Configurar Archivo</h3>
                </div>
                <div class="autosave-modal-body">
                    <p>¿Cómo quieres nombrar tu archivo de diagrama?</p>
                    <input type="text" class="filename-input" id="filename-input" value="mi_diagrama.bpmn" placeholder="nombre_archivo.bpmn">
                    <div class="path-preview" id="path-preview">
                        Archivo: <span id="preview-filename">mi_diagrama.bpmn</span>
                    </div>
                </div>
                <div class="autosave-modal-footer">
                    <button class="autosave-btn autosave-btn-primary" id="confirm-filename">
                        <i class="fas fa-check"></i> Continuar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        const filenameInput = modal.querySelector('#filename-input');
        const previewFilename = modal.querySelector('#preview-filename');
        const confirmBtn = modal.querySelector('#confirm-filename');

        // Actualizar preview en tiempo real
        filenameInput.addEventListener('input', () => {
            let filename = filenameInput.value.trim();
            if (filename && !filename.endsWith('.bpmn')) {
                filename += '.bpmn';
            }
            previewFilename.textContent = filename || 'mi_diagrama.bpmn';
        });

        confirmBtn.addEventListener('click', () => {
            let filename = filenameInput.value.trim();
            if (!filename) filename = 'mi_diagrama.bpmn';
            if (!filename.endsWith('.bpmn')) filename += '.bpmn';
            
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                resolve(filename);
            }, 300);
        });

        // Focus en input
        filenameInput.focus();
        filenameInput.select();
    });
}

/**
 * Modal elegante para configuración de autoguardado
 */
function showAutoSaveConfigModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'autosave-modal';
        modal.innerHTML = `
            <div class="autosave-modal-content">
                <div class="autosave-modal-header">
                    <h3><i class="fas fa-sync-alt icon"></i>Configurar Autoguardado</h3>
                </div>
                <div class="autosave-modal-body">
                    <p>¿Quieres activar el autoguardado automático para este diagrama?</p>
                    
                    <div class="autosave-option" data-option="yes">
                        <h4><i class="fas fa-check-circle"></i> Sí, activar autoguardado</h4>
                        <p>El archivo se guardará automáticamente cada 10 segundos en la ubicación que elijas.</p>
                    </div>
                    
                    <div class="autosave-option" data-option="no">
                        <h4><i class="fas fa-times-circle"></i> No, guardar manualmente</h4>
                        <p>Podrás guardar el archivo cuando quieras usando el botón "Guardar".</p>
                    </div>
                </div>
                <div class="autosave-modal-footer">
                    <button class="autosave-btn autosave-btn-primary" id="confirm-autosave" disabled>
                        <i class="fas fa-arrow-right"></i> Continuar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        let selectedOption = null;
        const options = modal.querySelectorAll('.autosave-option');
        const confirmBtn = modal.querySelector('#confirm-autosave');

        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                selectedOption = option.dataset.option;
                confirmBtn.disabled = false;
            });
        });

        confirmBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                resolve(selectedOption === 'yes');
            }, 300);
        });
    });
}

/**
 * Configura la ubicación de autoguardado (versión silenciosa)
 */
window.configureAutoSaveLocationSilent = async function() {
    console.log("🔧 === CONFIGURANDO UBICACIÓN DE AUTOGUARDADO (SILENCIOSO) ===");
    
    try {
        if (!('showDirectoryPicker' in window)) {
            console.log('❌ Navegador no soporta selección de carpetas');
            return false;
        }

        // Permitir al usuario seleccionar la carpeta
        const directoryHandle = await window.showDirectoryPicker();
        
        // Guardar referencias
        currentDirectoryHandle = directoryHandle;
        autoSaveConfigured = true;
        
        // Guardar preferencia en localStorage
        localStorage.setItem('auto-save-directory-name', directoryHandle.name);
        localStorage.setItem('auto-save-configured', 'true');
        localStorage.setItem('current-filename', currentFileName);
        
        console.log("✅ Carpeta de autoguardado configurada:", directoryHandle.name);
        
        return directoryHandle;
        
    } catch (error) {
        console.error("❌ Error configurando ubicación:", error);
        return null;
    }
};

/**
 * Activa el autoguardado automático (versión silenciosa)
 */
window.enableAutoSaveSilent = function(frequency = 10000) {
    console.log("🚀 === ACTIVANDO AUTOGUARDADO (SILENCIOSO) ===");
    
    if (!autoSaveConfigured) {
        console.log("⚠️ Ubicación no configurada");
        return false;
    }
    
    autoSaveFrequency = frequency;
    autoSaveEnabled = true;
    
    // Limpiar intervalo anterior si existe
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    // Crear nuevo intervalo
    autoSaveInterval = setInterval(performAutoSave, autoSaveFrequency);
    
    console.log(`✅ Autoguardado activado cada ${frequency/1000} segundos`);
    updateAutoSaveToggle(true);
    
    return true;
};

/**
 * Configura la ubicación de autoguardado (versión mejorada sin alerts)
 */
window.configureAutoSaveLocation = async function() {
    console.log("🔧 === CONFIGURANDO UBICACIÓN DE AUTOGUARDADO ===");
    
    try {
        if (!('showDirectoryPicker' in window)) {
            showElegantNotification('❌ Tu navegador no soporta la selección de carpetas. Usa Chrome/Edge actualizado.', 'error');
            return false;
        }

        // Permitir al usuario seleccionar la carpeta
        const directoryHandle = await window.showDirectoryPicker();
        
        // Guardar referencias
        currentDirectoryHandle = directoryHandle;
        autoSaveConfigured = true;
        
        // Guardar preferencia en localStorage
        localStorage.setItem('auto-save-directory-name', directoryHandle.name);
        localStorage.setItem('auto-save-configured', 'true');
        localStorage.setItem('current-filename', currentFileName);
        
        console.log("✅ Carpeta de autoguardado configurada:", directoryHandle.name);
        showElegantNotification(`✅ Ubicación configurada: ${directoryHandle.name}`, 'success');
        
        return directoryHandle;
        
    } catch (error) {
        console.error("❌ Error configurando ubicación:", error);
        if (error.name !== 'AbortError') {
            showElegantNotification(`❌ Error configurando ubicación: ${error.message}`, 'error');
        }
        return null;
    }
};

/**
 * Activa el autoguardado automático (versión mejorada)
 */
window.enableAutoSave = function(frequency = 10000) {
    console.log("🚀 === ACTIVANDO AUTOGUARDADO ===");
    
    if (!autoSaveConfigured) {
        showElegantNotification("⚠️ Primero debes configurar la ubicación de autoguardado", 'warning');
        return false;
    }
    
    autoSaveFrequency = frequency;
    autoSaveEnabled = true;
    
    // Limpiar intervalo anterior si existe
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    // Crear nuevo intervalo
    autoSaveInterval = setInterval(performAutoSave, autoSaveFrequency);
    
    console.log(`✅ Autoguardado activado cada ${frequency/1000} segundos`);
    showElegantNotification(`✅ Autoguardado activado cada ${frequency/1000}s`, 'success');
    updateAutoSaveToggle(true);
    
    return true;
};

/**
 * Desactiva el autoguardado
 */
window.disableAutoSave = function() {
    console.log("⏹️ === DESACTIVANDO AUTOGUARDADO ===");
    
    autoSaveEnabled = false;
    autoSaveConfigured = false;
    
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
    
    console.log("✅ Autoguardado desactivado");
    updateAutoSaveToggle(false);
    // Notification removed per user request
};

/**
 * Realiza el autoguardado en el mismo archivo (sobreescribe)
 */
async function performAutoSave() {
    if (!autoSaveEnabled) return;
    
    const now = Date.now();
    console.log("💾 Ejecutando autoguardado...", new Date().toLocaleTimeString());
    
    try {
        // Verificar que el modeler esté disponible
        if (!window.modeler) {
            console.log("⚠️ Modeler no disponible, saltando autoguardado");
            return;
        }

        // Extraer XML actual
        const result = await window.modeler.saveXML({ format: true });
        if (!result || !result.xml) {
            console.log("⚠️ No se pudo extraer XML, saltando autoguardado");
            return;
        }

        if (!currentDirectoryHandle) {
            console.log("❌ Referencia de carpeta perdida");
            window.disableAutoSave();
            showElegantNotification("❌ Ubicación perdida. Reconfigura el autoguardado.", 'error');
            return;
        }

        // Crear o sobrescribir el archivo único
        currentFileHandle = await currentDirectoryHandle.getFileHandle(currentFileName, { create: true });
        const writable = await currentFileHandle.createWritable();
        await writable.write(result.xml);
        await writable.close();

        lastAutoSaveTime = now;
        console.log(`✅ Autoguardado completado: ${currentFileName}`);
        
        // Actualizar timestamp discreto
        updateTimestamp();
        
        // Mostrar notificación discreta
        showAutoSaveNotification();

    } catch (error) {
        console.error("❌ Error en autoguardado:", error);
        
        // Si hay error de permisos, deshabilitar autoguardado
        if (error.name === 'NotAllowedError') {
            console.log("⚠️ Permisos revocados, deshabilitando autoguardado");
            window.disableAutoSave();
            showElegantNotification("⚠️ Permisos revocados. Autoguardado deshabilitado.", 'error');
        }
    }
}

/**
 * Actualiza el timestamp discreto
 */
function updateTimestamp() {
    const timestampEl = document.getElementById('autosave-timestamp');
    const textEl = document.getElementById('timestamp-text');
    
    if (timestampEl && textEl) {
        if (autoSaveEnabled && lastAutoSaveTime) {
            const now = new Date(lastAutoSaveTime);
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            textEl.textContent = timeString;
            timestampEl.style.display = 'block';
        } else {
            // Si no hay timestamp o autoguardado desactivado, ocultar completamente
            timestampEl.style.display = 'none';
        }
    }
}

/**
 * NO muestra notificación de autoguardado (solo actualiza timestamp)
 */
function showAutoSaveNotification() {
    // Solo actualizar timestamp, sin notificación flotante
    updateTimestamp();
    
    // Actualizar marca visual en el toggle
    updateAutoSaveToggleWithStatus();
}

/**
 * Muestra notificaciones elegantes generales
 */
function showElegantNotification(message, type = 'info') {
    const colors = {
        success: '#10b981',
        error: '#ef4444', 
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        font-size: 14px;
        font-weight: 500;
        z-index: 10001;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.4s ease;
        max-width: 350px;
        white-space: pre-line;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Ocultar después de 4 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 4000);
}

/**
 * Actualiza el toggle visual de autoguardado
 */
function updateAutoSaveToggle(enabled) {
    const checkbox = document.getElementById('autosave-checkbox');
    const panel = document.getElementById('autosave-toolbar-toggle');
    
    if (checkbox) {
        checkbox.checked = enabled;
    }
    
    if (panel) {
        if (enabled) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    }
    
    // Actualizar timestamp visibility
    updateTimestamp();
}

/**
 * Actualiza el toggle con marca visual de estado
 */
function updateAutoSaveToggleWithStatus() {
    const statusDiv = document.querySelector('.autosave-status');
    const textEl = document.querySelector('.autosave-status-text .toggle-label');
    
    if (statusDiv && textEl && autoSaveEnabled) {
        // Añadir efecto visual temporal para mostrar que se guardó
        statusDiv.classList.add('saving');
        
        // Volver al estado normal después de 1.5 segundos
        setTimeout(() => {
            statusDiv.classList.remove('saving');
        }, 1500);
    }
}

/**
 * Guarda el archivo manualmente en la ubicación configurada
 */
window.saveToConfiguredLocation = async function() {
    console.log("💾 === GUARDADO MANUAL ===");
    
    if (!autoSaveConfigured) {
        showElegantNotification("⚠️ Configura primero la ubicación de guardado", 'warning');
        return false;
    }

    try {
        // Verificar modeler
        if (!window.modeler) {
            throw new Error('El modeler no está disponible');
        }

        // Extraer XML
        const result = await window.modeler.saveXML({ format: true });
        if (!result || !result.xml) {
            throw new Error('No se pudo extraer el XML del diagrama');
        }

        if (!currentDirectoryHandle) {
            throw new Error("Ubicación de guardado no disponible");
        }

        // Crear y escribir archivo
        currentFileHandle = await currentDirectoryHandle.getFileHandle(currentFileName, { create: true });
        const writable = await currentFileHandle.createWritable();
        await writable.write(result.xml);
        await writable.close();

        console.log(`✅ Archivo guardado manualmente: ${currentFileName}`);
        showElegantNotification(`✅ Guardado: ${currentFileName}`, 'success');
        updateTimestamp();
        
        return true;

    } catch (error) {
        console.error("❌ Error en guardado manual:", error);
        showElegantNotification(`❌ Error guardando: ${error.message}`, 'error');
        return false;
    }
};

/**
 * Activa el autoguardado usando el archivo actual sin modales
 */
window.enableAutoSaveForCurrentFile = async function() {
    console.log("🚀 === ACTIVANDO AUTOGUARDADO PARA ARCHIVO ACTUAL ===");
    
    try {
        // Verificar que el navegador soporte File System Access API
        if (!('showSaveFilePicker' in window)) {
            // Error notification removed per user request
            updateAutoSaveToggle(false);
            return false;
        }
        
        // Si ya tenemos un archivo configurado, usar ese
        if (currentFileHandle) {
            console.log("✅ Usando archivo ya configurado:", currentFileName);
            autoSaveConfigured = true;
            autoSaveEnabled = true;
            
            // Iniciar intervalo de autoguardado
            if (autoSaveInterval) {
                clearInterval(autoSaveInterval);
            }
            autoSaveInterval = setInterval(performAutoSaveToCurrentFile, 2000);
            
            updateAutoSaveToggle(true);
            // Notification removed per user request
            return true;
        }
        
        // Intentar detectar archivo actual automáticamente
        // Si no hay archivo actual, crear uno temporal basado en el contenido
        console.log("📁 Detectando archivo actual automáticamente...");
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const suggestedName = currentFileName || `diagrama_${timestamp}.bpmn`;
        
        // Crear automáticamente el archivo sin mostrar modal
        try {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{
                    description: 'BPMN files',
                    accept: {
                        'application/xml': ['.bpmn'],
                        'text/xml': ['.bpmn'],
                    },
                }],
            });
            
            // Guardar referencia del archivo
            currentFileHandle = fileHandle;
            currentFileName = fileHandle.name;
            autoSaveConfigured = true;
            autoSaveEnabled = true;
            
            // Guardar en localStorage
            localStorage.setItem('current-filename', currentFileName);
            localStorage.setItem('auto-save-configured', 'true');
            
            console.log("✅ Archivo configurado:", currentFileName);
            
            // Realizar primer guardado inmediato
            await performAutoSaveToCurrentFile();
            
            // Iniciar intervalo de autoguardado
            if (autoSaveInterval) {
                clearInterval(autoSaveInterval);
            }
            autoSaveInterval = setInterval(performAutoSaveToCurrentFile, 2000);
            
            updateAutoSaveToggle(true);
            // Notification removed per user request
            
            return true;
        } catch (fileError) {
            if (fileError.name === 'AbortError') {
                console.log("ℹ️ Usuario canceló la selección de archivo");
                updateAutoSaveToggle(false);
                return false;
            }
            throw fileError;
        }
        
    } catch (error) {
        console.error("❌ Error activando autoguardado:", error);
        
        if (error.name === 'AbortError') {
            console.log("ℹ️ Usuario canceló la selección de archivo");
            updateAutoSaveToggle(false);
            return false;
        }
        
        // Error notification removed per user request
        updateAutoSaveToggle(false);
        return false;
    }
};

/**
 * Realiza autoguardado en el archivo actual (File System Access API)
 */
async function performAutoSaveToCurrentFile() {
    if (!autoSaveEnabled || !currentFileHandle) {
        console.log("⚠️ Autoguardado no disponible");
        return;
    }
    
    const now = Date.now();
    console.log("💾 Autoguardando en archivo actual...", new Date().toLocaleTimeString());
    
    try {
        // Verificar que el modeler esté disponible
        if (!window.modeler) {
            console.log("⚠️ Modeler no disponible, saltando autoguardado");
            return;
        }

        // Extraer XML actual
        const result = await window.modeler.saveXML({ format: true });
        if (!result || !result.xml) {
            console.log("⚠️ No se pudo extraer XML, saltando autoguardado");
            return;
        }

        // Escribir directamente al archivo usando File System Access API
        const writable = await currentFileHandle.createWritable();
        await writable.write(result.xml);
        await writable.close();

        lastAutoSaveTime = now;
        console.log(`✅ Archivo actualizado: ${currentFileName}`);
        
        // Actualizar timestamp
        updateTimestamp();
        
        // Mostrar efecto visual temporal
        showAutoSaveVisualFeedback();

    } catch (error) {
        console.error("❌ Error en autoguardado:", error);
        
        // Si hay error de permisos, deshabilitar autoguardado
        if (error.name === 'NotAllowedError') {
            console.log("⚠️ Permisos revocados, deshabilitando autoguardado");
            window.disableAutoSave();
            showElegantNotification("⚠️ Permisos de archivo revocados. Autoguardado deshabilitado.", 'error');
        } else {
            showElegantNotification(`⚠️ Error guardando: ${error.message}`, 'error');
        }
    }
}

/**
 * Muestra feedback visual cuando se realiza un autoguardado
 */
function showAutoSaveVisualFeedback() {
    const panel = document.getElementById('autosave-toolbar-toggle');
    if (panel) {
        panel.classList.add('saving');
        
        // Remover el estado después de 1.5 segundos
        setTimeout(() => {
            panel.classList.remove('saving');
        }, 1500);
    }
}

/**
 * Desactiva el autoguardado (versión silenciosa)
 */
window.disableAutoSaveSilent = function() {
    console.log("⏹️ === DESACTIVANDO AUTOGUARDADO (SILENCIOSO) ===");
    
    autoSaveEnabled = false;
    
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
    
    console.log("✅ Autoguardado desactivado");
    updateAutoSaveToggle(false);
};


/**
 * Muestra el estado actual del autoguardado
 */
window.showAutoSaveStatus = function() {
    console.log("📊 === ESTADO DEL AUTOGUARDADO ===");
    
    const status = {
        enabled: autoSaveEnabled,
        frequency: autoSaveFrequency,
        hasFile: !!currentFileHandle,
        lastSave: lastAutoSaveTime ? new Date(lastAutoSaveTime).toLocaleString() : 'Nunca',
        fileName: currentFileName || 'No configurado'
    };
    
    console.log("Estado:", status);
    
    const message = `📊 ESTADO DEL AUTOGUARDADO:

✅ Activado: ${status.enabled ? 'SÍ' : 'NO'}
⏱️ Frecuencia: ${status.frequency/1000} segundos
� Archivo actual: ${status.fileName}
🕐 Último guardado: ${status.lastSave}`;
    
    showElegantNotification(message, 'info');
    return status;
};

init();
