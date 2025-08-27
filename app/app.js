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
import { initializeCommunicationSystem } from './modules/ui/core/CommunicationSystem.js';

// Import required JSON files for moddle extensions
import PPINOTModdle from './modules/multinotationModeler/notations/ppinot/PPINOTModdle.json';
import RALphModdle from './modules/multinotationModeler/notations/ralph/RALphModdle.json';

// Expose required modules to the global scope for legacy compatibility
window.MultiNotationModeler = MultiNotationModeler;
window.PPINOTModdle = PPINOTModdle;
window.RALphModdle = RALphModdle;

// Import CSS
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';

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
let app = null;
let modelerContainer = null;
let welcomeScreen = null;
let isModelerInitialized = false;
let isModelerSystemInitialized = false;
let isProcessingFile = false;
let fileHandlersSetup = false;
let appInitialized = false;
let isOpenButtonClicked = false;

// Inicialización principal de la aplicación
async function initializeApp() {
  if (appInitialized) return;
  
  try {
    console.log('Inicializando aplicación VisualPPINOT...');
    
    // Configurar elementos UI
    setupUIElements();
    
    // Configurar modeler primero para que esté disponible durante la inicialización
    modeler = new MultiNotationModeler({
      container: modelerContainer,
      // El bindTo ya no es necesario en versiones recientes de bpmn-js
      moddleExtensions: {
        // Add moddle extensions directly here
        PPINOT: PPINOTModdle,
        RALph: RALphModdle
      }
    });
    
    // Make modeler available globally for legacy compatibility
    window.modeler = modeler;
    
    // Inicializar aplicación modular
    app = await initializeApplication({
      container: document.getElementById('modeler-container'),
      bpmnModeler: modeler // Pasar el modeler a la aplicación
    });
    
    // Expose modules globally for compatibility with modeler-manager.js
    window.MultiNotationModeler = MultiNotationModeler;
    
    // Actualizar las extensiones del modeler con las proporcionadas por la app
    if (app.multinotationModeler) {
      // Añadir extensiones de moddle si están disponibles
      if (app.multinotationModeler.ppinot) {
        modeler.get('moddle').registerPackage({ ppinot: app.multinotationModeler.ppinot });
        window.PPINOTModdle = app.multinotationModeler.ppinot;
      }
      if (app.multinotationModeler.ralph) {
        modeler.get('moddle').registerPackage({ ralph: app.multinotationModeler.ralph });
        window.RALphModdle = app.multinotationModeler.ralph;
      }
    }
    
    // Notificar al core que el modelador está disponible (por si acaso no lo detectó antes)
    if (app.core && app.core.eventBus) {
      app.core.eventBus.publish('bpmn.modeler.created', { modeler: modeler });
    }
    
    // Configurar panel loader y otros componentes necesarios
    // Crear instancia global para usar en todo el código
    window.panelLoader = new PanelLoader();
    
    // Registrar paneles disponibles en el panel manager
    if (app.core && app.core.panelManager) {
      app.core.panelManager.loadPanels = async function() {
        // No-op para compatibilidad
        console.log('[App] Panel loading is now handled by the panel-loader');
      };
    }
    
    // Ensure window.panelManager is available
    if (!window.panelManager) {
      console.error('[App] Panel manager not found, creating instance');
      window.panelManager = new window.PanelManager();
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
  // Botón de nuevo diagrama
  $('#new-diagram-btn').on('click', function() {
    console.log('[DEBUG] Botón Nuevo Diagrama clickeado');
    
    try {
      // Preparar UI
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
  $('#open-diagram-btn').on('click', async function() {
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
      
      console.log('[DEBUG] Visibilidad actualizada. Container visible:', modelerContainer.is(':visible'));
      
      // Trigger reflow
      setTimeout(() => {
        console.log('[DEBUG] Ejecutando actualizaciones post-carga...');
        $(window).trigger('resize');
        
        try {
          if (modeler && modeler.get('canvas')) {
            console.log('[DEBUG] Ajustando zoom');
            modeler.get('canvas').zoom('fit-viewport');
          }
        } catch (zoomErr) {
          console.warn('[WARN] Error al ajustar zoom:', zoomErr);
        }
      }, 500);
    } catch (error) {
      if (error.message !== 'Operación cancelada') {
        console.error('[ERROR] Error al abrir el archivo:', error);
        showErrorMessage('Error al abrir el archivo: ' + error.message);
      } else {
        console.log('[DEBUG] Operación cancelada por el usuario');
      }
    } finally {
      console.log('[DEBUG] Finalizando operación de apertura');
      isOpenButtonClicked = false;
    }
  });
  
  // Otros eventos de UI...
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

// Exponer APIs necesarias para componentes legacy
function exposeAPIs() {
  // Hacer disponibles APIs esenciales globalmente para compatibilidad
  window.app = app;
  
  // Ensure the global modules are always available (in case they were cleared)
  if (!window.MultiNotationModeler) {
    window.MultiNotationModeler = MultiNotationModeler;
  }
  
  if (typeof window !== 'undefined') {
    if (!window.PPINOTModdle) {
      window.PPINOTModdle = PPINOTModdle;
    }
    
    if (!window.RALphModdle) {
      window.RALphModdle = RALphModdle;
    }
  }
  
  // Make modeler available globally
  if (typeof window !== 'undefined') {
    window.modeler = modeler;
  }
  
  // Exponer APIs de RASCI desde el módulo
  if (app.rasci && typeof window !== 'undefined') {
    window.forceReloadMatrix = app.rasci.forceReloadMatrix;
    window.renderMatrix = app.rasci.renderMatrix;
    window.detectRalphRolesFromCanvas = app.rasci.detectRalphRolesFromCanvas;
    window.initRasciPanel = app.rasci.initRasciPanel;
  }
  
  // Exponer APIs de PPI desde el módulo
  if (app.ppis && typeof window !== 'undefined') {
    window.loadPPIComponents = app.ppis.loadPPIComponents;
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
    
    // NUEVO: Configurar panel BPMN INMEDIATAMENTE (antes de importar XML)
    console.log('[DEBUG] Configurando panel BPMN inmediatamente...');
    if (window.panelManager) {
      // Configurar paneles activos para incluir solo BPMN
      window.panelManager.activePanels = ['bpmn'];
      window.panelManager.currentLayout = '2v';
      
      // Aplicar configuración de paneles INMEDIATAMENTE
      console.log('[DEBUG] Aplicando configuración de paneles inmediatamente...');
      await window.panelManager.applyConfiguration();
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
      
      // Guardar referencia al archivo actual
      currentFileHandle = fileHandle[0];
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
async function saveFile() {
  // Implementación de guardar archivo...
  if (typeof console !== 'undefined') {
    console.log('Función saveFile no implementada');
  }
}

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
