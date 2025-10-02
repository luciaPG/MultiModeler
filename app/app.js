/**
 * VisualPPINOT App
 * Main application entry point that initializes the modular monolith architecture.
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
import { setupUIElements as setupUIElementsCore } from './core/ui.js';
import {
  openDiagramHandler as openDiagramHandlerCore,
  downloadProjectHandler as downloadProjectHandlerCore,
  exportBpmnDirect as exportBpmnDirectCore,
} from './core/handlers.js';
import { initModeler as initModelerCore } from './core/modeler.js';
import { openFile as openFileCore } from './core/files.js';
import {
  cleanGhostTasksOnStartup,
  startGhostTaskCleaner,
} from './modules/rasci/core/matrix-manager.js';
import { registerProjectInfoService } from './services/project-info.js';
import StorageManager from './modules/ui/managers/storage-manager.js';
import rasciAdapter from './modules/rasci/RASCIAdapter.js';
import PPINOTModdle from './modules/multinotationModeler/notations/ppinot/PPINOTModdle.json';
import RALphModdle from './modules/multinotationModeler/notations/ralph/RALphModdle.json';

// CSS
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';

/* -------------------------
 * Estado global
 * ------------------------- */
let modeler = null;
let app = null;
let modelerContainer = null;
let appInitialized = false;
let isModelerInitialized = false;
let isOpenButtonClicked = false;
let _initializing = false;
let loadingTimeout = null;

/* -------------------------
 * Registro de módulos
 * ------------------------- */
function registerModules() {
  const registry = getServiceRegistry();
  if (!registry) return;

  registry.register('MultiNotationModeler', MultiNotationModeler);
  registry.register('PPINOTModdle', PPINOTModdle);
  registry.register('RALphModdle', RALphModdle);

  try {
    const storageManager = new StorageManager({ namespace: 'multinotation' });
    registry.register('StorageManager', storageManager, {
      description: 'StorageManager real',
    });
  } catch (e) {
    console.warn('No se pudo registrar StorageManager:', e?.message);
  }

  try {
    registry.register('RASCIAdapter', rasciAdapter, {
      description: 'Adaptador RASCI real',
    });
  } catch (e) {
    console.warn('No se pudo registrar RASCIAdapter:', e?.message);
  }
}

/* -------------------------
 * Loading helpers
 * ------------------------- */
function startLoadingTimeout() {
  loadingTimeout = setTimeout(() => {
    if (!appInitialized) {
      appInitialized = true;
      clearLoadingTimeout();
      hideLoadingScreen();
    }
  }, 1000);
}

function clearLoadingTimeout() {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
}

function hideLoadingScreen() {
  document.getElementById('app-loading-screen')?.remove();
}

/* -------------------------
 * Inicialización principal
 * ------------------------- */
async function initializeApp() {
  if (_initializing) return;
  _initializing = true;

  if (isAppReallyWorking()) return;
  if (appInitialized && !isAppReallyWorking()) resetApp();

  try {
    if (!document.getElementById('modeler-container')) {
      throw new Error('Contenedor no encontrado');
    }

    startLoadingTimeout();
    initializeCommunicationSystem();
    registerModules();

    setupUIElementsCore({
      onNewDiagram: () => initModeler(),
      onContinue: () => continueWithLocalStorage(),
    });

    modelerContainer = document.getElementById('modeler-container');
    modeler = new MultiNotationModeler({
      container: modelerContainer,
      moddleExtensions: { PPINOT: PPINOTModdle, RALph: RALphModdle },
    });
    window.modeler = modeler;

    registerModelerInRegistry(modeler);
    await initAppModular();

    setupEventHandlers();
    exposeAPIs();

    appInitialized = true;
    _initializing = false;
    clearLoadingTimeout();

    await initLocalStorageSystem();
  } catch (error) {
    showErrorMessage(`Error al inicializar la aplicación: ${error.message}`);
  } finally {
    _initializing = false;
  }
}

/* -------------------------
 * Funciones auxiliares
 * ------------------------- */
function resetApp() {
  const container = document.getElementById('modeler-container');
  if (!container || container.children.length === 0) {
    appInitialized = false;
    modeler = null;
    app = null;
    window.modeler = null;
    document.getElementById('app-loading-screen')?.remove();
  }
}

function isAppReallyWorking() {
  if (!appInitialized || !modeler || !app) return false;

  const container = document.getElementById('modeler-container');
  if (!container || container.children.length === 0) return false;

  try {
    return modeler.get('canvas') && modeler.get('elementRegistry');
  } catch {
    return false;
  }
}

async function continueWithLocalStorage() {
  const registry = getServiceRegistry();
  const manager = registry?.get('LocalStorageIntegration');
  if (!manager) return initModeler();

  const restored = await manager.loadProject();
  if (restored) {
    try {
      manager.markRestored?.();
      await resolve('PanelManagerInstance')?.applyConfiguration?.();
    } catch {
      console.warn('No se pudo aplicar configuración de paneles guardada');
    }
  } else {
    await initModeler();
  }
}

/* -------------------------
 * Inicialización modular
 * ------------------------- */
function registerModelerInRegistry(modeler) {
  getServiceRegistry()?.register('BpmnModeler', modeler);
}

async function initAppModular() {
  if (app) return;

  try {
    const initPromise = initializeApplication({
      container: document.getElementById('modeler-container'),
      bpmnModeler: modeler,
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(new Error('Timeout inicializando aplicación modular')),
        2000
      )
    );
    app = await Promise.race([initPromise, timeoutPromise]);
    if (!app) throw new Error('Aplicación modular retornó null');
  } catch (error) {
    app = { multinotationModeler: null, core: null };
    throw new Error(`Error al inicializar aplicación modular: ${error.message}`);
  }
}

async function initLocalStorageSystem() {
  try {
    const registry = getServiceRegistry();
    const localStorageIntegration = registry.get('LocalStorageIntegration');
    if (localStorageIntegration) {
      await localStorageIntegration.migrateFromOldSystem();
    } else {
      console.warn('LocalStorageIntegration no disponible');
    }
  } catch (error) {
    console.warn('Error inicializando LocalStorage:', error);
  }
}

/* -------------------------
 * Manejadores
 * ------------------------- */
async function downloadProjectHandler() {
  try {
    await downloadProjectHandlerCore();
  } catch (e) {
    showErrorMessage(`Error al descargar proyecto: ${e.message}`);
  }
}

async function openDiagramHandler() {
  if (isOpenButtonClicked) return;
  isOpenButtonClicked = true;

  try {
    await openDiagramHandlerCore({
      modeler,
      setModelerInitialized: (v) => (isModelerInitialized = !!v),
    });
  } catch (e) {
    if (e?.message !== 'Operación cancelada') {
      showErrorMessage(`Error al abrir diagrama: ${e.message}`);
    }
  } finally {
    isOpenButtonClicked = false;
  }
}

/* -------------------------
 * Modeler
 * ------------------------- */
function setupEventHandlers() {
  if (!modeler) return;

  modeler.on('elements.changed', () => {
    const lsMgr = getServiceRegistry()?.get('LocalStorageIntegration');
    const inCooldown = lsMgr?._postRestoreCooldownUntil > Date.now();
    if (!inCooldown) app?.core?.eventBus?.publish('model.changed', { source: 'bpmn' });
  });

  modeler.on('selection.changed', (e) => {
    if (e.newSelection?.length) {
      app?.core?.eventBus?.publish('bpmn.element.selected', {
        element: e.newSelection[0],
      });
    }
  });
}

async function initModeler() {
  if (!modeler) return showErrorMessage('Modeler no encontrado');

  const panelManager = resolve('PanelManagerInstance');
  if (panelManager) await panelManager.applyConfiguration();
  await initModelerCore(modeler);
  isModelerInitialized = true;
}

/* -------------------------
 * API exposure
 * ------------------------- */
function exposeAPIs() {
  const sr = getServiceRegistry();
  if (!sr) return;

  sr.register('App', app);

  if (app.rasci) {
    ['forceReloadMatrix', 'renderMatrix', 'detectRalphRolesFromCanvas', 'initRasciPanel'].forEach(
      (fn) => sr.registerFunction(fn, app.rasci[fn])
    );
  }

  if (app.ppis) sr.registerFunction('loadPPIComponents', app.ppis.loadPPIComponents);
}

/* -------------------------
 * Helpers
 * ------------------------- */
function showErrorMessage(message) {
  console.error(message);
}

/* -------------------------
 * Bootstrapping
 * ------------------------- */
$(document).ready(() => initializeApp());

/* -------------------------
 * Global exposures (LEGACY, pero no es legacy necesito que esto funcione de tora forma)
 * ------------------------- */
window.openFile = openFileCore;
window.initModeler = initModeler;
window.downloadProjectHandler = downloadProjectHandler;
window.openDiagramHandler = openDiagramHandler;
window.getServiceRegistry = getServiceRegistry;
window.modeler = modeler;
window.modelerManager = modelerManager;

export async function exportBpmnDirect(projectName) {
  return exportBpmnDirectCore(projectName);
}
