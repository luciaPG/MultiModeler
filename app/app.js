/**
 * VisualPPINOT App
 * 
 * Main application entry point that initializes the modular monolith architecture.
 */

import $ from 'jquery';
import { initializeApplication, MultiNotationModeler } from './modules/index.js';
import { PanelLoader } from './modules/ui/components/panel-loader.js';
import modelerManager from './modules/ui/managers/modeler-manager.js';
import './modules/ui/managers/panel-manager.js';
import './modules/ui/managers/cookie-autosave-manager.js';
import './modules/ui/managers/localstorage-autosave-manager.js';
import './modules/ui/managers/ppinot-storage-manager.js';
import './modules/ui/managers/ppinot-coordination-manager.js';
import './modules/ui/managers/import-export-manager.js';
import { initializeCommunicationSystem } from './modules/ui/core/CommunicationSystem.js';
import { getServiceRegistry } from './modules/ui/core/ServiceRegistry.js';
import { resolve } from './services/global-access.js';
import { cleanGhostTasksOnStartup, startGhostTaskCleaner } from './modules/rasci/core/matrix-manager.js';

// Import required JSON files for moddle extensions
import PPINOTModdle from './modules/multinotationModeler/notations/ppinot/PPINOTModdle.json';
import RALphModdle from './modules/multinotationModeler/notations/ralph/RALphModdle.json';

// Register required modules in service registry instead of window
const registerModules = () => {
  const registry = getServiceRegistry();
  if (registry) {
    registry.register('MultiNotationModeler', MultiNotationModeler);
    registry.register('PPINOTModdle', PPINOTModdle);
    registry.register('RALphModdle', RALphModdle);
  }
};

// Call registerModules immediately
registerModules();

// Clean ghost tasks on startup
cleanGhostTasksOnStartup();

// Start periodic ghost task cleaner
startGhostTaskCleaner();

// Import CSS
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';

// Variables para autoguardado
let autoSaveEnabled = false;
let autoSaveInterval = null;
// let currentFileHandle = null; // reservado para uso futuro
// let currentDirectoryHandle = null; // reservado para uso futuro
let currentFileName = 'mi_diagrama.bpmn'; // Archivo único que se sobreescribe

let modeler = null;
let app = null;
let modelerContainer = null;
let welcomeScreen = null;
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
    cookieManager: false,
    panelManager: false
  },
  isReady: false,
  onReadyCallbacks: [],
  isInitializing: false
};

// Función para verificar si todos los módulos están listos
function checkAllModulesReady() {
  const allReady = Object.values(loadingState.modules).every(ready => ready);
  if (allReady && !loadingState.isReady) {
    loadingState.isReady = true;
    console.log('🚀 Todos los módulos están listos, inicializando aplicación...');
    
    // Ejecutar callbacks de ready
    loadingState.onReadyCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error en callback de ready:', error);
      }
    });
    loadingState.onReadyCallbacks = [];
  }
  return allReady;
}

// Timeout de seguridad para evitar cargas infinitas
let loadingTimeout = null;
function startLoadingTimeout() {
  // Timeout ultra-corto para experiencia de usuario óptima
  const timeoutMs = 1000; // 1 segundo máximo
  
  loadingTimeout = setTimeout(() => {
    console.warn('⚠️ Timeout de carga alcanzado, forzando finalización...');
        // Forzando finalización...
    
    // Forzar finalización inmediata
    if (!appInitialized) {
      appInitialized = true;
      clearLoadingTimeout();
      hideLoadingScreen();
      console.log('✅ Aplicación forzada a inicializar por timeout.');
    }
  }, timeoutMs);
}

function clearLoadingTimeout() {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
}

// Función para resetear el estado de carga
function resetLoadingState() {
  loadingState.isReady = false;
  loadingState.isInitializing = false;
  loadingState.onReadyCallbacks = [];
  
  // Resetear todos los módulos
  Object.keys(loadingState.modules).forEach(module => {
    loadingState.modules[module] = false;
  });
  
  clearLoadingTimeout();
}

// Función para marcar un módulo como listo
function markModuleReady(moduleName) {
  if (loadingState.modules.hasOwnProperty(moduleName)) {
    loadingState.modules[moduleName] = true;
    
    // Solo mostrar log en primera carga para evitar spam
    if (!appInitialized) {
      console.log(`✅ Módulo ${moduleName} listo`);
    }
    
    checkAllModulesReady();
  }
}

// Función para esperar a que todos los módulos estén listos
function waitForAllModules(callback) {
  if (loadingState.isReady) {
    callback();
  } else {
    loadingState.onReadyCallbacks.push(callback);
  }
}

// Función para mostrar pantalla de carga
function showLoadingScreen() {
  const loadingHTML = `
    <div id="app-loading-screen" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    ">
      <div style="text-align: center;">
        <div style="
          width: 60px;
          height: 60px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        "></div>
        <h2 style="margin: 0 0 10px; font-size: 24px; font-weight: 300;">VisualPPINOT</h2>
        <p style="margin: 0; font-size: 16px; opacity: 0.8;">Cargando módulos...</p>
        <div id="loading-progress" style="
          margin-top: 20px;
          font-size: 14px;
          opacity: 0.7;
        ">Inicializando sistema...</div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', loadingHTML);
  console.log('✅ Pantalla de carga mostrada');
}

// Función para ocultar pantalla de carga
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('app-loading-screen');
  if (loadingScreen) {
    // Ocultar inmediatamente sin transición
    loadingScreen.remove();
    console.log('✅ Pantalla de carga ocultada');
  }
}

// Función para actualizar progreso de carga
function updateLoadingProgress(message) {
  const progressElement = document.getElementById('loading-progress');
  if (progressElement) {
    progressElement.textContent = message;
  }
}

// Función para verificar si la aplicación está realmente funcionando
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

// Inicialización principal de la aplicación
async function initializeApp() {
  if (_initializing) {
    return;
  }
  _initializing = true;
  // Verificar si realmente está inicializado y funcionando
  if (isAppReallyWorking()) {
    console.log('✅ Aplicación ya inicializada y funcionando, saltando reinicialización...');
    return;
  }
  
  // Si está marcado como inicializado pero no funciona, reinicializar
  if (appInitialized && !isAppReallyWorking()) {
    console.log('🔄 Aplicación marcada como inicializada pero no funciona, reinicializando...');
    
    // Solo reinicializar si realmente es necesario
    const container = document.getElementById('modeler-container');
    if (!container || container.children.length === 0) {
      console.log('🔄 Contenedor vacío, reinicializando...');
      appInitialized = false;
      modeler = null;
      app = null;
      // Limpiar pantalla de carga existente
      const existingLoader = document.getElementById('app-loading-screen');
      if (existingLoader) {
        existingLoader.remove();
      }
    } else {
      console.log('✅ Contenedor tiene contenido, continuando sin reinicialización...');
      return; // No reinicializar si el contenedor tiene contenido
    }
  }
  
  try {
    console.log('🚀 Iniciando carga sincronizada de la aplicación...');
    
    // Inicialización directa sin sistema de sincronización complejo
    
    // NO mostrar pantalla de carga - usar solo welcome screen para evitar parpadeos
    if (!appInitialized) {
      console.log('🚀 Inicializando aplicación (sin pantalla de carga)...');
    } else {
      // En recargas, no mostrar pantalla de carga para mejor rendimiento
      console.log('🔄 Recarga rápida sin pantalla de carga...');
    }
    
    // Verificar que el DOM está listo
    if (!document.getElementById('modeler-container')) {
      console.error('❌ Error: Contenedor del modeler no encontrado en el DOM');
      // Error: Contenedor no encontrado
      return;
    }
    
    // Iniciar timeout de seguridad
    startLoadingTimeout();
    
    // Initialize communication system first
    initializeCommunicationSystem();
    
    // Register modules in service registry
    registerModules();
    
    // Configurar elementos UI
    setupUIElements();
    
    // Configurar modeler primero para que esté disponible durante la inicialización
    
    // Asegurar que el contenedor existe
    if (!modelerContainer) {
      modelerContainer = document.getElementById('modeler-container');
    }
    
    if (!modelerContainer) {
      throw new Error('Contenedor del modeler no encontrado');
    }
    
    modeler = new MultiNotationModeler({
      container: modelerContainer,
      // El bindTo ya no es necesario en versiones recientes de bpmn-js
      moddleExtensions: {
        // Add moddle extensions directly here
        PPINOT: PPINOTModdle,
        RALph: RALphModdle
      }
    });
    
    // Verificar que el modeler se creó correctamente
    if (!modeler) {
      throw new Error('Error al crear el modeler BPMN');
    }
    
    // Verificar que el modeler tiene los métodos necesarios
    if (!modeler.get || !modeler.get('moddle')) {
      throw new Error('Modeler BPMN no tiene los métodos necesarios');
    }
    
    // Register BpmnModeler in service registry (following bpmn-js patterns)
    const serviceRegistry = getServiceRegistry();
    if (serviceRegistry) {
      serviceRegistry.register('BpmnModeler', modeler);
    }
    // Modeler BPMN listo
  
    
    // Inicialización modular inteligente: solo si no existe
    const needsModularInit = !app;
    
    if (needsModularInit) {
      if (!appInitialized) updateLoadingProgress('Inicializando aplicación modular...');
      try {
        // Inicialización con timeout optimizado para recargas
        const timeoutMs = appInitialized ? 1000 : 2000; // Timeout más corto en recargas
        
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
        
        // Crear estructura esperada para compatibilidad
        if (app.multiNotationModeler) {
          app.multinotationModeler = {
            ppinot: app.multiNotationModeler,
            ralph: app.multiNotationModeler
          };
          console.log('✅ Estructura de extensiones creada para compatibilidad');
        } else {
          console.warn('⚠️ Aplicación modular no tiene multiNotationModeler, pero continuando...');
        }
        
        console.log('✅ Aplicación modular inicializada correctamente');
      } catch (error) {
        console.warn('⚠️ Error al inicializar aplicación modular, usando fallback rápido:', error.message);
        // Crear app mock para evitar errores
        app = {
          multinotationModeler: null,
          core: null
        };
        console.log('⚠️ Usando aplicación mock para continuar');
      }
    } else {
      // Aplicación modular ya existe con extensiones
    }
    
    // Actualizar las extensiones del modeler con las proporcionadas por la app
    if (app && app.multinotationModeler && modeler && modeler.get && modeler.get('moddle')) {
      // Añadir extensiones de moddle si están disponibles
      if (app.multinotationModeler.ppinot) {
        const moddle = modeler.get('moddle');
        if (moddle && typeof moddle.registerPackage === 'function') {
          moddle.registerPackage({ ppinot: app.multinotationModeler.ppinot });
        } else {
          console.warn('⚠️ moddle.registerPackage no disponible; omitiendo registro PPINOT');
        }
        const sr = getServiceRegistry();
        if (sr) {
          sr.register('PPINOTModdle', app.multinotationModeler.ppinot);
        }
      }
      if (app.multinotationModeler.ralph) {
        const moddle = modeler.get('moddle');
        if (moddle && typeof moddle.registerPackage === 'function') {
          moddle.registerPackage({ ralph: app.multinotationModeler.ralph });
        } else {
          console.warn('⚠️ moddle.registerPackage no disponible; omitiendo registro RALPH');
        }
        const sr = getServiceRegistry();
        if (sr) {
          sr.register('RALphModdle', app.multinotationModeler.ralph);
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
    
    // Inicializar sistema de autoguardado si está habilitado
    if (autoSaveEnabled && !autoSaveInterval) {
      // Iniciar autoguardado (se implementará más tarde)
      console.log('Auto-guardado activado pero no implementado');
    }
    
  } catch (error) {
    console.error('Error inicializando la aplicación:', error);
    showErrorMessage('Error al inicializar la aplicación: ' + error.message);
  } finally {
    // Limpiar flag de inicialización
    _initializing = false;
  }
}

// Configurar elementos de interfaz de usuario
function setupUIElements() {
  welcomeScreen = $('#welcome-screen');
  modelerContainer = $('#modeler-container');
  
  // Solo mostrar welcome screen en primera carga, no en recargas
  if (!appInitialized) {
    welcomeScreen.show();
    modelerContainer.hide();
  } else {
    // En recargas, mantener el estado actual
    console.log('🔄 Recarga: manteniendo estado actual de UI...');
  }
  
  // Configurar botones y eventos de UI
  setupUIEvents();
}

// Configurar eventos de UI
function setupUIEvents() {
  $(function() {
    // Detectar borrador en localStorage para mostrar botón de continuar
    try {
      const stored = localStorage.getItem('draft:multinotation');
      let shouldShow = false;
      if (stored) {
        const parsed = JSON.parse(stored);
        const savedAt = parsed && parsed.savedAt;
        const value = parsed && parsed.value;
        const notExpired = savedAt && (Date.now() - savedAt <= 3 * 60 * 60 * 1000);
        const hasContent = value && (
          (value.bpmn && value.bpmn.xml && typeof value.bpmn.xml === 'string' && value.bpmn.xml.trim().length > 0) ||
          (value.ppi && Array.isArray(value.ppi.indicators) && value.ppi.indicators.length > 0) ||
          (value.rasci && Array.isArray(value.rasci.roles) && value.rasci.roles.length > 0)
        );
        shouldShow = Boolean(notExpired && hasContent);
      }
      if (shouldShow) {
        $('#continue-diagram-btn').show();
      } else {
        $('#continue-diagram-btn').hide();
      }
    } catch (e) {
      console.warn('[WARN] No se pudo determinar si hay borrador en localStorage:', e);
      $('#continue-diagram-btn').hide();
    }

    // Botón de nuevo diagrama
    $('#new-diagram-btn').on('click', function() {
      console.log('[DEBUG] Botón Nuevo Diagrama clickeado');
      console.log('[DEBUG] Elementos DOM:', {
        welcomeScreen: welcomeScreen,
        modelerContainer: modelerContainer,
        modeler: modeler
      });

      try {
        // Ocultar botón de continuar si estaba visible y resetear localStorage para nuevo diagrama
        try {
          $('#continue-diagram-btn').hide();
          const registry = getServiceRegistry();
          const manager = registry ? registry.get('localStorageAutoSaveManager') : null;
          if (manager) {
            // RESETEAR localStorage para nuevo diagrama
            console.log('🔄 Reseteando localStorage para nuevo diagrama...');
            if (typeof manager.clearProjectState === 'function') {
              manager.clearProjectState();
            }
            if (typeof manager.markRestored === 'function') manager.markRestored();
            if (typeof manager.dismissDraftNotification === 'function') manager.dismissDraftNotification();
          }
        } catch (_) { /* no-op */ }

        // Preparar UI
        console.log('[DEBUG] Ocultando welcome screen y mostrando modeler container');
        welcomeScreen.hide();
        modelerContainer.show();

        // Crear nuevo modelo
        console.log('[DEBUG] Iniciando creación del modelo...');
        initModeler().then(() => {
          console.log('[DEBUG] Modelo creado correctamente');
        }).catch(err => {
          console.error('[ERROR] Error creando el modelo:', err);
          showErrorMessage('Error al crear nuevo modelo: ' + err.message);
        });
      } catch (e) {
        console.error('[ERROR] Error al procesar click en Nuevo Diagrama:', e);
        showErrorMessage('Error al iniciar nuevo diagrama: ' + e.message);
      }
    });

    // Botón de abrir diagrama
    $('#open-diagram-btn').on('click', function() {
      openDiagramHandler();
    });

    // Botón de descargar proyecto
    $('#download-project-btn').on('click', function() {
      downloadProjectHandler();
    });

    // Botón de continuar último diagrama
    $('#continue-diagram-btn').on('click', async function() {
      try {
        welcomeScreen.hide();
        modelerContainer.show();
        // Asegurar inicialización base solo si realmente no está inicializada
        if (!appInitialized) {
          console.log('🔄 Inicializando aplicación para continuar diagrama...');
          await initializeApp();
        } else {
          console.log('✅ Aplicación ya inicializada, continuando con restauración...');
        }
        // Restaurar desde el autosave manager
        const registry = getServiceRegistry();
        const manager = registry ? registry.get('localStorageAutoSaveManager') : null;
        if (manager && typeof manager.forceRestore === 'function') {
          // Suspender autoguardado durante restauración para evitar errores
          if (typeof manager.suspendAutoSave === 'function') manager.suspendAutoSave();
          const restored = await manager.forceRestore();
          // forceRestore ya incluye la restauración de BPMN, no es necesario llamarla de nuevo
          if (restored) {
            // Marcar como restaurado para suprimir futuros avisos
            try { if (typeof manager.markRestored === 'function') manager.markRestored(); } catch (_) { /* no-op */ }
            // Aplicar configuración de paneles guardada
            try {
              const panelManager = resolve('PanelManagerInstance');
              if (panelManager && typeof panelManager.applyConfiguration === 'function') {
                await panelManager.applyConfiguration();
              }
            } catch (e) {
              console.warn('[WARN] No se pudo aplicar la configuración de paneles guardada:', e);
            }
            // 2) Restaurar PPIs cuando el panel ya existe - DESHABILITADO
            // forceRestore ya incluye la restauración de PPIs, no es necesario llamarla de nuevo
            console.log('ℹ️ Restauración PPI manejada por forceRestore');
          }
          if (!restored) {
            console.warn('[WARN] No se pudo restaurar el borrador, creando nuevo diagrama');
            await initModeler();
          }
          // Reanudar autoguardado
          if (typeof manager.resumeAutoSave === 'function') manager.resumeAutoSave();
        } else {
          console.warn('[WARN] Autosave manager no disponible, creando nuevo diagrama');
          await initModeler();
        }
        // Ajustes de interfaz tras restaurar
        setTimeout(() => {
          // Evitar forzar eventos de resize para no provocar reflows perceptibles
          // El zoom/posición se restauran desde LocalStorageAutoSaveManager cuando procede
        }, 500);
      } catch (e) {
        console.error('[ERROR] Error al continuar borrador:', e);
        showErrorMessage('Error al cargar borrador: ' + e.message);
      }
    });

    // ...otros eventos de UI...
  });
}

// Handler para descargar proyecto
async function downloadProjectHandler() {
  try {
    console.log('[DEBUG] Botón Descargar Proyecto clickeado');
    
    const importManager = getServiceRegistry && getServiceRegistry().get('ImportExportManager');
    if (importManager) {
      await importManager.exportProject();
      console.log('[DEBUG] Proyecto descargado correctamente.');
    } else {
      throw new Error('No se pudo acceder al gestor de exportación');
    }
  } catch (e) {
    console.error('[ERROR] Error al descargar proyecto:', e);
    showErrorMessage('Error al descargar proyecto: ' + e.message);
  }
}

// Handler asíncrono para abrir diagrama
async function openDiagramHandler() {
  console.log('[DEBUG] Botón Abrir Diagrama clickeado');
  if (isOpenButtonClicked) {
    console.log('[DEBUG] Evitando doble clic en Abrir');
    return; // Evitar doble clic
  }
  isOpenButtonClicked = true;
  try {
    console.log('[DEBUG] Abriendo archivo...');
    const fileData = await openFile();
    console.log('[DEBUG] Archivo abierto:', fileData.type, fileData.content ? fileData.content.substring(0, 50) + '...' : 'sin contenido');
    
    welcomeScreen.hide();
    modelerContainer.show();
    
    if (fileData.type === 'project') {
      // Es un archivo de proyecto completo
      console.log('[DEBUG] Importando proyecto completo...');
      const importManager = getServiceRegistry && getServiceRegistry().get('ImportExportManager');
      if (importManager) {
        await importManager.importAllProjectData(fileData.data);
        console.log('[DEBUG] Proyecto completo importado correctamente.');
      } else {
        throw new Error('No se pudo acceder al gestor de importación');
      }
    } else if (fileData.type === 'bpmn') {
      // Es un archivo XML BPMN
      console.log('[DEBUG] Importando diagrama BPMN...');
      await modeler.importXML(fileData.content);
      modelerManager.setModeler(modeler);
      isModelerInitialized = true;
      console.log('[DEBUG] Diagrama BPMN abierto correctamente.');
    }

    // Ajustes de interfaz tras cargar
    setTimeout(() => {
      // Evitar forzar eventos de resize para no provocar reflows perceptibles
      // El zoom/posición se restauran desde LocalStorageAutoSaveManager cuando procede
    }, 500);

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
function setupEventHandlers() {
  if (!modeler) return;
  
  // Eventos para cambios en el diagrama
  modeler.on('elements.changed', function() {
    // No disparar notificaciones durante cooldown post-restauración para evitar recarga de paneles
    try {
      const sr = getServiceRegistry && getServiceRegistry();
      const lsMgr = sr && (sr.get('localStorageAutoSaveManager') || sr.get('LocalStorageAutoSaveManager'));
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
      // Configurar paneles activos para incluir solo BPMN
      panelManager.activePanels = ['bpmn'];
      panelManager.currentLayout = '2v';
      
      // Aplicar configuración de paneles INMEDIATAMENTE
      console.log('[DEBUG] Aplicando configuración de paneles inmediatamente...');
      await panelManager.applyConfiguration();
      console.log('[DEBUG] Configuración de paneles aplicada');
    } else {
      console.warn('[WARN] PanelManager no encontrado en ServiceRegistry');
    }
    
    // Crear un diagrama BPMN básico con todos los namespaces necesarios
    const initialXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                 xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                 xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                 xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                 xmlns:ppinot="http://www.isa.us.es/ppinot" 
                 xmlns:ralph="http://www.isa.us.es/ralph"
                 id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
    
    console.log('[DEBUG] Importando XML...');
    
    // Importar el XML 
    await modeler.importXML(initialXml);
    console.log('[DEBUG] XML importado');
    
    // Asegurarnos de que el modeler está registrado correctamente
    modelerManager.setModeler(modeler);
    
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
async function openFile() {
  try {
    let file, contents;
    
    // Comprobar si el navegador soporta la File System Access API
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      // Usar la moderna File System Access API
      const fileHandle = await window.showOpenFilePicker({
        types: [
          {
            description: 'Proyectos MultiModeler',
            accept: {
              'application/json': ['.mmproject'],
            },
          },
          {
            description: 'Diagramas BPMN',
            accept: {
              'application/xml': ['.bpmn', '.xml'],
            },
          },
        ],
        excludeAcceptAllOption: false,
        multiple: false,
      });
      
      if (!fileHandle || !fileHandle[0]) {
        throw new Error('No se seleccionó ningún archivo');
      }
      
      file = await fileHandle[0].getFile();
      contents = await file.text();
      
      // Guardar referencia al archivo actual (opcional)
      // const currentFileHandle = fileHandle[0];
    } else {
      // Usar el método tradicional para navegadores que no soportan File System Access API
      if (typeof document !== 'undefined') {
        // Crear un input file oculto
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mmproject,.bpmn,.xml';
        
        // Promesa para manejar la selección de archivo
        const fileSelected = new Promise((resolve, reject) => {
          input.onchange = (event) => {
            if (event.target.files && event.target.files[0]) {
              resolve(event.target.files[0]);
            } else {
              reject(new Error('No se seleccionó ningún archivo'));
            }
          };
          
          // Si el usuario cancela el diálogo
          input.oncancel = () => reject(new Error('Operación cancelada'));
        });
        
        // Disparar el diálogo de selección de archivo
        input.click();
        
        // Esperar a que el usuario seleccione un archivo
        file = await fileSelected;
        
        // Leer el contenido del archivo
        contents = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Error al leer el archivo'));
          reader.readAsText(file);
        });
      }
    }
    
    if (!contents) {
      throw new Error('No se pudo leer el contenido del archivo');
    }
    
    // Detectar tipo de archivo y devolver objeto con tipo y contenido
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'mmproject') {
      // Es un archivo de proyecto completo
      try {
        const projectData = JSON.parse(contents);
        return {
          type: 'project',
          data: projectData,
          content: contents
        };
      } catch (error) {
        throw new Error('El archivo de proyecto no es válido: ' + error.message);
      }
    } else if (fileExtension === 'bpmn' || fileExtension === 'xml') {
      // Es un archivo XML BPMN
      return {
        type: 'bpmn',
        data: null,
        content: contents
      };
    } else {
      throw new Error('Tipo de archivo no soportado. Use archivos .mmproject, .bpmn o .xml');
    }
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

// Función para guardar un archivo
// async function saveFile() {
//   // Implementación de guardar archivo...
//   if (typeof console !== 'undefined') {
//     console.log('Función saveFile no implementada');
//   }
// }

// Función para mostrar mensajes de error
function showErrorMessage(message) {
  // Implementación de mostrar mensaje de error...
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
