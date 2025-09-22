/**
 * VisualPPINOT App
 *
 * Main application entry point that initializes the modular monolith architecture.
 *
 * File outline:
 * - Imports & registrations
 * - Global state & loading helpers
 * - App initialization (initializeApp)
 * - UI setup & events
 * - Download/Open handlers
 * - Modeler events & API exposure
 * - Modeler initialization (initModeler)
 * - File operations & error helpers
 * - Global exposures
 */

import $ from 'jquery';
import { initializeApplication, MultiNotationModeler } from './modules/index.js';
import { PanelLoader } from './modules/ui/components/panel-loader.js';
import modelerManager from './modules/ui/managers/modeler-manager.js';
import './modules/ui/managers/panel-manager.js';
import './services/autosave-manager.js';
import './services/local-storage-integration.js';
import './modules/ui/managers/import-export/ImportExportManager.js';
import { initializeCommunicationSystem } from './modules/ui/core/CommunicationSystem.js';
import { getServiceRegistry } from './modules/ui/core/ServiceRegistry.js';
import { resolve } from './services/global-access.js';
// Extracted core modules
import { setupUIElements as setupUIElementsCore } from './core/ui.js';
import { openDiagramHandler as openDiagramHandlerCore, downloadProjectHandler as downloadProjectHandlerCore, exportBpmnDirect as exportBpmnDirectCore } from './core/handlers.js';
import { initModeler as initModelerCore } from './core/modeler.js';
import { openFile as openFileCore } from './core/files.js';
import { cleanGhostTasksOnStartup, startGhostTaskCleaner } from './modules/rasci/core/matrix-manager.js';
import { registerProjectInfoService } from './services/project-info.js';

// Import required JSON files for moddle extensions
import PPINOTModdle from './modules/multinotationModeler/notations/ppinot/PPINOTModdle.json';
import RALphModdle from './modules/multinotationModeler/notations/ralph/RALphModdle.json';


/**
 * Register core modules in the ServiceRegistry for decoupled access.
 */
const registerModules = () => {
  const registry = getServiceRegistry();
  if (registry) {
    registry.register('MultiNotationModeler', MultiNotationModeler);
    registry.register('PPINOTModdle', PPINOTModdle);
    registry.register('RALphModdle', RALphModdle);
  }
};


registerModules();
  // Register project info service
  registerProjectInfoService();

cleanGhostTasksOnStartup();


startGhostTaskCleaner();

// Import CSS
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';


// Removed unused legacy autosave placeholders
// let autoSaveEnabled = false;
// let autoSaveInterval = null;
// let currentFileName = 'mi_diagrama.bpmn';

let modeler = null;
let app = null;
let modelerContainer = null;
// Deprecated: UI managed in core/ui.js
// let welcomeScreen = null;
let isModelerInitialized = false;
// flags no usados eliminados para satisfacer el linter
let appInitialized = false;
let isOpenButtonClicked = false;
let _initializing = false;

// Sistema de sincronización para carga consistente
const loadingState = {
  modules: {
    communicationSystem: false,
    serviceRegistry: false,
    bpmnModeler: false,
    ppinotModule: false,
    ralphModule: false,
    rasciModule: false,
    localStorageManager: false,
    localStorageIntegration: false,
    cookieManager: false,
    panelManager: false
  },
  isReady: false,
  onReadyCallbacks: [],
  isInitializing: false
};


// Removed unused: checkAllModulesReady

// Timeout de seguridad para evitar cargas infinitas
let loadingTimeout = null;
/**
 * Start a short safety timeout to ensure the loading screen is hidden.
 */
function startLoadingTimeout() {
  // Timeout ultra-corto para experiencia de usuario óptima
  const timeoutMs = 1000; // 1 segundo máximo
  
  loadingTimeout = setTimeout(() => {
        // Forzando finalización...
    
    // Forzar finalización inmediata
    if (!appInitialized) {
      appInitialized = true;
      clearLoadingTimeout();
      hideLoadingScreen();
 
    }
  }, timeoutMs);
}

/**
 * Clear the pending loading timeout if present.
 */
function clearLoadingTimeout() {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
}


/**
 * Hide the loading screen immediately.
 */
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('app-loading-screen');
  if (loadingScreen) {
    // Ocultar inmediatamente sin transición
    loadingScreen.remove();
  console.log('✅ Pantalla de carga ocultada')
  }
}

/**
 * Update loading message in the minimal loader.
 * @param {string} message
 */
function updateLoadingProgress(message) {
  const progressElement = document.getElementById('loading-progress');
  if (progressElement) {
    progressElement.textContent = message;
  }
}

/**
 * Verify the app is properly initialized and running.
 * @returns {boolean}
 */
function isAppReallyWorking() {
  // Verificación rápida para evitar reinicializaciones innecesarias
  if (!appInitialized || !modeler || !app) {
    return false;
  }
  
  // Verificar que el contenedor existe y tiene contenido
  const container = document.getElementById('modeler-container');
  if (!container || container.children.length === 0) {
    return false;
  }
  
  // Verificar que el modeler tiene los servicios básicos
  try {
    const canvas = modeler.get('canvas');
    const elementRegistry = modeler.get('elementRegistry');
    if (!canvas || !elementRegistry) {
      return false;
    }
  } catch (error) {
    console.warn('⚠️ Error verificando servicios del modeler:', error);
    return false;
  }
  
  return true;
}


/**
 * Initialize the application: services, modeler, and UI wiring.
 */
async function initializeApp() {
  if (_initializing) {
    return;
  }
  _initializing = true;
  if (isAppReallyWorking()) {

    return;
  }
  
  // Si está marcado como inicializado pero no funciona, reinicializar
  if (appInitialized && !isAppReallyWorking()) {
   
    
    // Solo reinicializar si realmente es necesario
    const container = document.getElementById('modeler-container');
    if (!container || container.children.length === 0) {
      console.log('🔄 Contenedor vacío, reinicializando...')
      appInitialized = false;
      modeler = null;
      // Actualizar referencia global
      window.modeler = null;
      app = null;
      // Limpiar pantalla de carga existente
      const existingLoader = document.getElementById('app-loading-screen');
      if (existingLoader) {
        existingLoader.remove();
      }
    } else {
      return; 
    }
  }
  
  try {

    
    // Verificar que el DOM está listo
    if (!document.getElementById('modeler-container')) {
      throw new Error('Contenedor no encontrado');
    }
    

    startLoadingTimeout();
    

    initializeCommunicationSystem();
    

    registerModules();
    
    // Configurar elementos UI (delegated to core)
    setupUIElementsCore({
      onNewDiagram: async () => {
        await initModeler();
      },
      onContinue: async () => {
        if (!appInitialized) await initializeApp();
        const registry = getServiceRegistry();
        const manager = registry ? registry.get('LocalStorageIntegration') : null;
        if (manager && typeof manager.loadProject === 'function') {
          const restored = await manager.loadProject();
          if (restored) {
            try { if (typeof manager.markRestored === 'function') manager.markRestored(); } catch (_) { /* no-op */ }
            try {
              const panelManager = resolve('PanelManagerInstance');
              if (panelManager && typeof panelManager.applyConfiguration === 'function') {
                await panelManager.applyConfiguration();
              }
            } catch (e) {
              console.warn('[WARN] No se pudo aplicar la configuración de paneles guardada:', e);
            }
          }
          if (!restored) {
            await initModeler();
          }
        } else {
          await initModeler();
        }
      }
    });
    

    
    // Asegurar que el contenedor existe
    if (!modelerContainer) {
      modelerContainer = document.getElementById('modeler-container');
    }
    
    if (!modelerContainer) {
      throw new Error('Contenedor del modeler no encontrado');
    }
    
    modeler = new MultiNotationModeler({
      container: modelerContainer,
      moddleExtensions: {
        PPINOT: PPINOTModdle,
        RALph: RALphModdle
      }
    });

    window.modeler = modeler;
    

    if (!modeler) {
      throw new Error('Error al crear el modeler BPMN');
    }
    
    if (!modeler.get || !modeler.get('moddle')) {
      throw new Error('Modeler BPMN no tiene los métodos necesarios');
    }
    
  // Register BpmnModeler in service registry (following bpmn-js patterns)
    const serviceRegistry = getServiceRegistry();
    if (serviceRegistry) {
      serviceRegistry.register('BpmnModeler', modeler);
    }

  
    

    const needsModularInit = !app;
    
    if (needsModularInit) {
      if (!appInitialized) updateLoadingProgress('Inicializando aplicación modular...');
        try {
      
        const timeoutMs = appInitialized ? 1000 : 2000; 
        
        const initPromise = initializeApplication({
          container: document.getElementById('modeler-container'),
          bpmnModeler: modeler
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout inicializando aplicación modular')), timeoutMs)
        );
        
        app = await Promise.race([initPromise, timeoutPromise]);
        
        if (!app) {
          throw new Error('Aplicación modular retornó null');
        }
        

        if (app.multiNotationModeler) {
          app.multinotationModeler = {
            ppinot: app.multiNotationModeler,
            ralph: app.multiNotationModeler
          };
          // Compat structure created
        } else {
          // Continue without extra extensions
        }
      
      } catch (error) {
        app = {
          multinotationModeler: null,
          core: null
        };
        // Fix: Error constructor should not receive multiple args
        throw new Error('Error al inicializar aplicación modular, usando fallback rápido: ' + (error && error.message ? error.message : 'desconocido'));
      }
    } else {
      // Already exists; continue
    }
    
    // Actualizar las extensiones del modeler con las proporcionadas por la app
    if (app && app.multinotationModeler && modeler && modeler.get && modeler.get('moddle')) {
      // Añadir extensiones de moddle si están disponibles
      if (app.multinotationModeler.ppinot) {
        // Registro directo en ServiceRegistry (patrón moderno)
        const sr = getServiceRegistry();
        if (sr) {
          sr.register('PPINOTModdle', app.multinotationModeler.ppinot);
          console.log('✅ PPINOT moddle registrado en ServiceRegistry');
        }
        
        // Intentar registro en moddle si está disponible
        try {
          const moddle = modeler.get('moddle');
          if (moddle && moddle.registry && typeof moddle.registry.registerPackage === 'function') {
            moddle.registry.registerPackage('ppinot', app.multinotationModeler.ppinot);
            console.log('✅ PPINOT registrado en moddle.registry');
          } else if (moddle && typeof moddle.registerPackage === 'function') {
            moddle.registerPackage('ppinot', app.multinotationModeler.ppinot);
            console.log('✅ PPINOT registrado en moddle');
          } else {
            console.log('ℹ️ Moddle no soporta registerPackage - usando solo ServiceRegistry');
          }
        } catch (moddleError) {
          console.debug('Registro moddle PPINOT falló (normal):', moddleError.message);
        }
      }
      if (app.multinotationModeler.ralph) {
        // Registro directo en ServiceRegistry (patrón moderno)
        const sr = getServiceRegistry();
        if (sr) {
          sr.register('RALphModdle', app.multinotationModeler.ralph);
          console.log('✅ RALPH moddle registrado en ServiceRegistry');
        }
        
        // Intentar registro en moddle si está disponible
        try {
          const moddle = modeler.get('moddle');
          if (moddle && moddle.registry && typeof moddle.registry.registerPackage === 'function') {
            moddle.registry.registerPackage('ralph', app.multinotationModeler.ralph);
            console.log('✅ RALPH registrado en moddle.registry');
          } else if (moddle && typeof moddle.registerPackage === 'function') {
            moddle.registerPackage('ralph', app.multinotationModeler.ralph);
            console.log('✅ RALPH registrado en moddle');
          } else {
            console.log('ℹ️ Moddle no soporta registerPackage - usando solo ServiceRegistry');
          }
        } catch (moddleError) {
          console.debug('Registro moddle RALPH falló (normal):', moddleError.message);
        }
      }
    } else {
      console.warn('⚠️ Aplicación modular o modeler no disponible, continuando sin extensiones...');
    }
    
    // Notificar al core que el modelador está disponible (por si acaso no lo detectó antes)
    if (app && app.core && app.core.eventBus) {
      app.core.eventBus.publish('bpmn.modeler.created', { modeler: modeler });
    }
    
    // Register panel loader in service registry
    const sr = getServiceRegistry();
    if (sr) {
      sr.register('PanelLoader', new PanelLoader());
    }
    
    // Registrar paneles disponibles en el panel manager
    if (app && app.core && app.core.panelManager) {
      app.core.panelManager.loadPanels = async function() {
        // No-op para compatibilidad
        console.log('[App] Panel loading is now handled by the panel-loader');
      };
    }
    
    // Configurar manejadores de eventos
    setupEventHandlers();
    
    // Módulos ya están listos después de la inicialización modular
    
    // Exponer APIs necesarias para elementos legacy
    exposeAPIs();
    
    // Marcar como inicializado inmediatamente para recargas rápidas
    const wasAlreadyInitialized = appInitialized;
    appInitialized = true;
    _initializing = false; // Limpiar flag de inicialización
    clearLoadingTimeout(); // Limpiar timeout de seguridad
    
    if (!wasAlreadyInitialized) {
      updateLoadingProgress('¡Aplicación lista!');
    } else {
      // En recargas, sin pantalla de carga
    }
    
    console.log('✅ Aplicación VisualPPINOT inicializada correctamente.');
    
    // INICIALIZAR NUEVO SISTEMA DE LOCALSTORAGE
    try {
      console.log('🔄 Inicializando nuevo sistema de LocalStorage...');
      
      const registry = getServiceRegistry();
      
      // El LocalStorageIntegration ya se inicializa automáticamente al importar
      // Solo necesitamos verificar que esté disponible y marcar como listo
      const localStorageIntegration = registry.get('LocalStorageIntegration');
      if (localStorageIntegration) {
        // Intentar migrar datos del sistema anterior si es necesario
        await localStorageIntegration.migrateFromOldSystem();
        
        loadingState.modules.localStorageIntegration = true;
        console.log('✅ Sistema de LocalStorage inicializado correctamente');
      } else {
        console.warn('⚠️ LocalStorageIntegration no disponible');
        loadingState.modules.localStorageIntegration = true; // Marcar como listo para no bloquear
      }
    } catch (error) {
      console.warn('⚠️ Error inicializando sistema de LocalStorage:', error);
      loadingState.modules.localStorageIntegration = true; // Marcar como listo para no bloquear
    }
    
    // DESACTIVADO: Sistema de autoguardado legacy reemplazado por LocalStorageManager
    console.log('ℹ️ Sistema de autoguardado legacy desactivado - usando nuevo LocalStorageManager');
    
  } catch (error) {
    console.error('Error inicializando la aplicación:', error);
    showErrorMessage('Error al inicializar la aplicación: ' + error.message);
  } finally {
    // Limpiar flag de inicialización
    _initializing = false;
  }
}

// UI helpers removed (handled in core/ui.js)

// Download modal moved to ./core/modals.js

// Handler para descargar proyecto
/**
 * Handle project download flow, including naming and format selection.
 */
async function downloadProjectHandler() {
  try {
    await downloadProjectHandlerCore();
  } catch (e) {
    showErrorMessage('Error al descargar proyecto: ' + e.message);
  }
}

// Handler asíncrono para abrir diagrama
/**
 * Handle opening a diagram or project file using modern or legacy pickers.
 */
async function openDiagramHandler() {
  console.log('[DEBUG] Botón Abrir Diagrama clickeado');
  if (isOpenButtonClicked) {
    console.log('[DEBUG] Evitando doble clic en Abrir');
    return; // Evitar doble clic
  }
  isOpenButtonClicked = true;
  try {
    await openDiagramHandlerCore({
      modeler,
      setModelerInitialized: (v) => { isModelerInitialized = !!v; }
    });

  } catch (e) {
    if (e && e.message === 'Operación cancelada') {
      console.log('[DEBUG] Operación cancelada por el usuario');
    } else {
      console.error('[ERROR] Error al abrir diagrama:', e);
      showErrorMessage('Error al abrir diagrama: ' + e.message);
    }
  } finally {
    isOpenButtonClicked = false;
  }
}

// Configurar manejadores de eventos para el modeler
/**
 * Attach BPMN modeler event handlers to broadcast changes.
 */
function setupEventHandlers() {
  if (!modeler) return;
  
  // Eventos para cambios en el diagrama
  modeler.on('elements.changed', function() {
    // No disparar notificaciones durante cooldown post-restauración para evitar recarga de paneles
    try {
      const sr = getServiceRegistry && getServiceRegistry();
      const lsMgr = sr && sr.get('LocalStorageIntegration');
      const inCooldown = lsMgr && lsMgr._postRestoreCooldownUntil && Date.now() < lsMgr._postRestoreCooldownUntil;
      if (inCooldown) return;
    } catch (_) { /* no-op */ }
    // Notificar cambios fuera del cooldown
    if (app && app.core && app.core.eventBus) {
      app.core.eventBus.publish('model.changed', { source: 'bpmn' });
    }
  });
  
  modeler.on('selection.changed', function(e) {
    if (e.newSelection && e.newSelection.length && app && app.core && app.core.eventBus) {
      app.core.eventBus.publish('bpmn.element.selected', { element: e.newSelection[0] });
    }
  });
  
  // Otros manejadores de eventos...
}

// Register APIs in service registry instead of window
/**
 * Register public APIs in the ServiceRegistry for decoupled usage.
 */
function exposeAPIs() {
  const sr = getServiceRegistry();
  if (!sr) return;
  
  // Register app instance
  sr.register('App', app);
  
  // Register RASCI APIs from module
  if (app.rasci) {
    sr.registerFunction('forceReloadMatrix', app.rasci.forceReloadMatrix);
    sr.registerFunction('renderMatrix', app.rasci.renderMatrix);
    sr.registerFunction('detectRalphRolesFromCanvas', app.rasci.detectRalphRolesFromCanvas);
    sr.registerFunction('initRasciPanel', app.rasci.initRasciPanel);
  }
  
  // Register PPI APIs from module
  if (app.ppis) {
    sr.registerFunction('loadPPIComponents', app.ppis.loadPPIComponents);
  }
}

// Inicializar el modeler
/**
 * Initialize a fresh BPMN diagram in the modeler and configure panels.
 */
async function initModeler() {
  console.log('[DEBUG] initModeler llamado, isModelerInitialized=', isModelerInitialized);
  
  try {
    console.log('[DEBUG] Inicializando modeler con nuevo diagrama BPMN...');
    
    // Verificar que el modeler existe
    if (!modeler) {
      console.error('[ERROR] Modeler no encontrado!');
      return;
    }
    
    // Configure BPMN panel through service registry
    console.log('[DEBUG] Configurando panel BPMN inmediatamente...');
    const panelManager = resolve('PanelManagerInstance');
    console.log('[DEBUG] PanelManager obtenido:', panelManager);
    if (panelManager) {
    // Configuración de paneles se realiza en core/modeler
      
      // Aplicar configuración de paneles INMEDIATAMENTE
      console.log('[DEBUG] Aplicando configuración de paneles inmediatamente...');
      await panelManager.applyConfiguration();
      console.log('[DEBUG] Configuración de paneles aplicada');
    } else {
      console.warn('[WARN] PanelManager no encontrado en ServiceRegistry');
    }
    
    // XML inicial gestionado ahora por core/modeler
    
    // Delegate to core version
    await initModelerCore(modeler);
    
    // Marcar como inicializado
    isModelerInitialized = true;
    console.log('[DEBUG] Modeler inicializado correctamente.');
    
    // OPTIMIZADO: Actualización inmediata sin delays
    console.log('[DEBUG] Ejecutando actualizaciones inmediatas...');
    // Evitar forzar resize o ajuste inmediato de zoom para no provocar reflows perceptibles
    
    console.log('[DEBUG] Inicialización completada');
  } catch (error) {
    console.error('[ERROR] Error al inicializar el modeler:', error);
    showErrorMessage('Error al inicializar el modelador: ' + error.message);
  }
}

// Función para abrir un archivo
/**
 * Open a file from disk (project or BPMN) returning typed metadata.
 * @returns {Promise<{ type: 'project'|'bpmn', data: any, content: string, fileName?: string }>}
 */
async function openFile() {
  try {
    return await openFileCore();
  } catch (error) {
    // Si el error es porque el usuario canceló la operación, no mostramos error
    if (error.name === 'AbortError' || error.message === 'Operación cancelada') {
      console.log('Operación cancelada por el usuario.');
      throw new Error('Operación cancelada');
    }
    
    console.error('Error al abrir archivo:', error);
    throw error;
  }
}



// Función para mostrar mensajes de error
/**
 * Log an error message (placeholder for UI surface integration).
 * @param {string} message
 */
function showErrorMessage(message) {

  if (typeof console !== 'undefined') {
    console.error(message);
  }
}

// Inicializar la aplicación cuando el DOM esté listo
if (typeof $ !== 'undefined' && typeof document !== 'undefined') {
  $(document).ready(function() {
    initializeApp();
  });
}

// Función para exportar solo BPMN con nombre personalizado
/**
 * Export current BPMN diagram directly to file, with a sanitized name.
 * @param {string} projectName
 */
// Deprecated: delegated to core/handlers (kept for global exposure only)
export async function exportBpmnDirect(projectName) {
  return exportBpmnDirectCore(projectName);
}

// Exponer funciones necesarias globalmente para los botones del header
window.openFile = openFile;
window.initModeler = initModeler;
window.downloadProjectHandler = downloadProjectHandler;
window.openDiagramHandler = openDiagramHandler;
window.getServiceRegistry = getServiceRegistry;

// Exponer variables necesarias globalmente
window.modeler = modeler;
window.modelerManager = modelerManager;

