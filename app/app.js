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
import { initializeCommunicationSystem } from './modules/ui/core/CommunicationSystem.js';
import { getServiceRegistry } from './modules/ui/core/ServiceRegistry.js';
import { resolve } from './services/global-access.js';

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

// Inicialización principal de la aplicación
async function initializeApp() {
  if (appInitialized) return;
  
  try {
    console.log('Inicializando aplicación VisualPPINOT...');
    console.log('[DEBUG] Estado inicial:', {
      appInitialized,
      modeler,
      welcomeScreen: !!welcomeScreen,
      modelerContainer: !!modelerContainer
    });
    
    // Initialize communication system first
    console.log('[DEBUG] Inicializando sistema de comunicación...');
    initializeCommunicationSystem();
    console.log('[DEBUG] Sistema de comunicación inicializado');
    
    // Register modules in service registry
    console.log('[DEBUG] Registrando módulos...');
    registerModules();
    console.log('[DEBUG] Módulos registrados');
    
    // Configurar elementos UI
    console.log('[DEBUG] Configurando elementos UI...');
    setupUIElements();
    console.log('[DEBUG] Elementos UI configurados');
    
    // Configurar modeler primero para que esté disponible durante la inicialización
    console.log('[DEBUG] Inicializando modeler...');
    modeler = new MultiNotationModeler({
      container: modelerContainer,
      // El bindTo ya no es necesario en versiones recientes de bpmn-js
      moddleExtensions: {
        // Add moddle extensions directly here
        PPINOT: PPINOTModdle,
        RALph: RALphModdle
      }
    });
    console.log('[DEBUG] Modeler creado:', modeler);
    
    // Register BpmnModeler in service registry (following bpmn-js patterns)
    const serviceRegistry = getServiceRegistry();
    if (serviceRegistry) {
      serviceRegistry.register('BpmnModeler', modeler);
    }
  
    
    // Inicializar aplicación modular
    app = await initializeApplication({
      container: document.getElementById('modeler-container'),
      bpmnModeler: modeler // Pasar el modeler a la aplicación
    });
    
    // Actualizar las extensiones del modeler con las proporcionadas por la app
    if (app.multinotationModeler) {
      // Añadir extensiones de moddle si están disponibles
      if (app.multinotationModeler.ppinot) {
        modeler.get('moddle').registerPackage({ ppinot: app.multinotationModeler.ppinot });
        const sr = getServiceRegistry();
        if (sr) {
          sr.register('PPINOTModdle', app.multinotationModeler.ppinot);
        }
      }
      if (app.multinotationModeler.ralph) {
        modeler.get('moddle').registerPackage({ ralph: app.multinotationModeler.ralph });
        const sr = getServiceRegistry();
        if (sr) {
          sr.register('RALphModdle', app.multinotationModeler.ralph);
        }
      }
    }
    
    // Notificar al core que el modelador está disponible (por si acaso no lo detectó antes)
    if (app.core && app.core.eventBus) {
      app.core.eventBus.publish('bpmn.modeler.created', { modeler: modeler });
    }
    
    // Register panel loader in service registry
    const sr = getServiceRegistry();
    if (sr) {
      sr.register('PanelLoader', new PanelLoader());
    }
    
    // Registrar paneles disponibles en el panel manager
    if (app.core && app.core.panelManager) {
      app.core.panelManager.loadPanels = async function() {
        // No-op para compatibilidad
        console.log('[App] Panel loading is now handled by the panel-loader');
      };
    }
    
    // Configurar manejadores de eventos
    setupEventHandlers();
    
    // Exponer APIs necesarias para elementos legacy
    exposeAPIs();
    
    appInitialized = true;
    console.log('Aplicación VisualPPINOT inicializada correctamente.');
    
    // Inicializar sistema de autoguardado si está habilitado
    if (autoSaveEnabled && !autoSaveInterval) {
      // Iniciar autoguardado (se implementará más tarde)
      console.log('Auto-guardado activado pero no implementado');
    }
    
  } catch (error) {
    console.error('Error inicializando la aplicación:', error);
    showErrorMessage('Error al inicializar la aplicación: ' + error.message);
  }
}

// Configurar elementos de interfaz de usuario
function setupUIElements() {
  welcomeScreen = $('#welcome-screen');
  modelerContainer = $('#modeler-container');
  
  // Configurar UI inicial
  welcomeScreen.show();
  modelerContainer.hide();
  
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
        // Ocultar botón de continuar si estaba visible y suprimir aviso de borrador
        try {
          $('#continue-diagram-btn').hide();
          const registry = getServiceRegistry();
          const manager = registry ? registry.get('localStorageAutoSaveManager') : null;
          if (manager) {
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

    // Botón de continuar último diagrama
    $('#continue-diagram-btn').on('click', async function() {
      try {
        welcomeScreen.hide();
        modelerContainer.show();
        // Asegurar inicialización base
        if (!appInitialized) {
          await initializeApp();
        }
        // Restaurar desde el autosave manager
        const registry = getServiceRegistry();
        const manager = registry ? registry.get('localStorageAutoSaveManager') : null;
        if (manager && typeof manager.forceRestore === 'function') {
          // Suspender autoguardado durante restauración para evitar errores
          if (typeof manager.suspendAutoSave === 'function') manager.suspendAutoSave();
          const restored = await manager.forceRestore();
          // Intentar restaurar BPMN y PPIs si hay estado cargado
          if (restored) {
            // 1) Restaurar BPMN primero
            try { await manager.restoreBpmnState(); } catch (e) { console.warn('[WARN] Restauración BPMN fallida:', e); }
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
            // 2) Restaurar PPIs cuando el panel ya existe
            try {
              // pequeño delay para asegurar montaje del panel
              await new Promise(r => setTimeout(r, 150));
              manager.restorePPIState();
            } catch (e) {
              console.warn('[WARN] Restauración PPI fallida:', e);
            }
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
          if (typeof window !== 'undefined' && typeof $ !== 'undefined') {
            $(window).trigger('resize');
          }
          try {
            if (modeler && modeler.get('canvas')) {
              const sr = getServiceRegistry && getServiceRegistry();
              const ls = sr && (sr.get('localStorageAutoSaveManager') || sr.get('LocalStorageAutoSaveManager'));
              const hasSavedView = ls && ls.projectState && ls.projectState.bpmn && ls.projectState.bpmn.position;
              const hasRestored = ls && ls.hasRestored;
              // Solo auto-ajustar si NO hay un viewbox/zoom restaurado
              if (!(hasSavedView && hasRestored)) {
                modeler.get('canvas').zoom('fit-viewport');
              }
            }
          } catch (zoomErr) {
            console.warn('[WARN] Error al ajustar zoom tras restauración:', zoomErr);
          }
        }, 500);
      } catch (e) {
        console.error('[ERROR] Error al continuar borrador:', e);
        showErrorMessage('Error al cargar borrador: ' + e.message);
      }
    });

    // ...otros eventos de UI...
  });
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
    const xml = await openFile();
    console.log('[DEBUG] Archivo abierto:', xml ? xml.substring(0, 50) + '...' : 'sin contenido');
    welcomeScreen.hide();
    modelerContainer.show();
    await modeler.importXML(xml);
    modelerManager.setModeler(modeler);
    isModelerInitialized = true;
    console.log('[DEBUG] Diagrama abierto correctamente.');

    // Ajustes de interfaz tras cargar
    setTimeout(() => {
      if (typeof window !== 'undefined' && typeof $ !== 'undefined') {
        $(window).trigger('resize');
      }
      try {
        if (modeler && modeler.get('canvas')) {
          const sr = getServiceRegistry && getServiceRegistry();
          const ls = sr && (sr.get('localStorageAutoSaveManager') || sr.get('LocalStorageAutoSaveManager'));
          const hasSavedView = ls && ls.projectState && ls.projectState.bpmn && ls.projectState.bpmn.position;
          const hasRestored = ls && ls.hasRestored;
          if (!(hasSavedView && hasRestored)) {
            modeler.get('canvas').zoom('fit-viewport');
          }
        }
      } catch (zoomErr) {
        console.warn('[WARN] Error al ajustar zoom:', zoomErr);
      }
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
    // Notificar cambios
    app.core.eventBus.publish('model.changed', { source: 'bpmn' });
  });
  
  modeler.on('selection.changed', function(e) {
    if (e.newSelection && e.newSelection.length) {
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
    if (typeof window !== 'undefined' && typeof $ !== 'undefined') {
      $(window).trigger('resize');
    }
    
    try {
      // Ajustar zoom para ver todo el diagrama INMEDIATAMENTE
      const canvas = modeler.get('canvas');
      if (canvas && typeof canvas.zoom === 'function') {
        console.log('[DEBUG] Ajustando zoom inmediatamente');
        canvas.zoom('fit-viewport');
      }
    } catch (error) {
      console.warn('Error al ajustar zoom:', error);
    }
    
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
        input.accept = '.bpmn,.xml';
        
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
    
    // Actualizar el modelo con el contenido del archivo
    await modeler.importXML(contents);
    modelerManager.setModeler(modeler);
    
    isModelerInitialized = true;
    currentFileName = file.name;
    
    console.log(`Archivo '${currentFileName}' abierto correctamente.`);
    
    return contents;
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
