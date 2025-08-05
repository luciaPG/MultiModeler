// === app.js limpio ===
// TODO: A TERMINAR EL DESARROLLO - Sistema de guardado automático implementado


import $ from 'jquery';
import MultiNotationModeler from './MultiNotationModeler/index.js';
import BpmnModdle from 'bpmn-moddle';
import PPINOTModdle from './PPINOT-modeler/PPINOT/PPINOTModdle.json';
import RALphModdle from './RALPH-modeler/RALph/RALphModdle.json';
import { PanelLoader } from './js/panel-loader.js';
import { initRasciPanel } from './js/panels/rasci/core/main.js';
// import './js/panel-snap-system.js'; // REMOVIDO - No se necesita desplazamiento de ventanas
import './js/panel-manager.js';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';

// Variables globales
window.rasciRoles = [];
window.rasciTasks = [];
window.rasciMatrixData = {};
window.initRasciPanel = initRasciPanel;

// Variables para el sistema de guardado automático BPMN
let bpmnSaveTimeout = null;
let lastBpmnSaveTime = 0;

// Variables para la navegación entre pantallas
let welcomeScreen = null;
let modelerContainer = null;
let isModelerInitialized = false;

// Funciones de navegación entre pantallas
function showWelcomeScreen() {
  if (welcomeScreen) {
    welcomeScreen.classList.remove('hidden');
  }
  if (modelerContainer) {
    modelerContainer.classList.remove('show');
  }
  // Verificar estado del diagrama guardado cuando se muestra la pantalla de bienvenida
  checkSavedDiagram();
}

function showModeler() {
  if (welcomeScreen) {
    welcomeScreen.classList.add('hidden');
  }
  if (modelerContainer) {
    modelerContainer.classList.add('show');
  }
  
  // Inicializar el modelador si no se ha hecho antes
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

  // Inicializar gestor de paneles
  const panelManager = new PanelManager();
  window.panelManager = panelManager;
  panelManager.setPanelLoader(panelLoader);

  // Crear paneles iniciales usando el gestor
  panelManager.applyConfiguration();

  // Configurar layout inicial
  panelContainer.classList.add('layout-4');

  setTimeout(() => {
    // El modeler se inicializará automáticamente cuando se aplique la configuración
  }, 300);
}

// Funciones de persistencia para el estado del BPMN
function saveBpmnState() {
  try {
    if (modeler) {
      const xml = modeler.saveXML({ format: true });
      xml.then(result => {
        if (result && result.xml && result.xml.trim().length > 0) {
          localStorage.setItem('bpmnDiagram', result.xml);
          localStorage.setItem('bpmnDiagramTimestamp', Date.now().toString());
          showBpmnSaveIndicator();
          
          // GUARDAR TAMBIÉN LAS RELACIONES PPINOT EN EL XML
          if (window.ppiManager && window.ppiManager.core) {
            // Obtener las relaciones actuales y guardarlas en el XML
            const elementRegistry = modeler.get('elementRegistry');
            const allElements = elementRegistry.getAll();
            
            // Filtrar elementos hijos de PPINOT
            const ppiChildren = allElements.filter(element => {
              const isChildOfPPI = element.parent && 
                (element.parent.type === 'PPINOT:Ppi' || 
                 (element.parent.businessObject && element.parent.businessObject.$type === 'PPINOT:Ppi'));
              
              const isValidChildType = element.type === 'PPINOT:Scope' || 
                element.type === 'PPINOT:Target' ||
                element.type === 'PPINOT:Measure' ||
                element.type === 'PPINOT:Condition' ||
                (element.businessObject && (
                  element.businessObject.$type === 'PPINOT:Scope' ||
                  element.businessObject.$type === 'PPINOT:Target' ||
                  element.businessObject.$type === 'PPINOT:Measure' ||
                  element.businessObject.$type === 'PPINOT:Condition'
                ));
              
              return isChildOfPPI && isValidChildType;
            });
            
            // Crear relaciones para guardar
            const relationships = ppiChildren.map(el => ({
              childId: el.id,
              parentId: el.parent ? el.parent.id : null,
              childType: el.type,
              parentType: el.parent ? el.parent.type : null,
              childBusinessObjectType: el.businessObject ? el.businessObject.$type : null,
              parentBusinessObjectType: el.parent && el.parent.businessObject ? el.parent.businessObject.$type : null,
              childName: el.businessObject ? el.businessObject.name : '',
              parentName: el.parent && el.parent.businessObject ? el.parent.businessObject.name : '',
              timestamp: Date.now()
            }));
            
            // Guardar relaciones en el XML
            window.ppiManager.core.savePPINOTRelationshipsToXML(relationships);
          }
        } else {
        }
      }).catch(err => {
      });
    } else {
    }
  } catch (e) {
  }
}

// Función para mostrar indicador de guardado BPMN
function showBpmnSaveIndicator() {
  let saveIndicator = document.getElementById('bpmn-save-indicator');
  if (!saveIndicator) {
    saveIndicator = document.createElement('div');
    saveIndicator.id = 'bpmn-save-indicator';
    saveIndicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 20px;
        background: #3b82f6;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
      ">
        <i class="fas fa-save" style="font-size: 10px;"></i>
        <span>BPMN guardado</span>
      </div>
    `;
    document.body.appendChild(saveIndicator);
  }

  // Mostrar indicador
  saveIndicator.style.opacity = '1';
  saveIndicator.style.transform = 'translateY(0)';

  // Ocultar después de 2 segundos
  setTimeout(() => {
    saveIndicator.style.opacity = '0';
    saveIndicator.style.transform = 'translateY(-10px)';
  }, 2000);
}

// Función para guardado automático BPMN con debounce
function autoSaveBpmnState() {
  const now = Date.now();
  
  // Evitar guardados muy frecuentes (mínimo 2 segundos entre guardados)
  if (now - lastBpmnSaveTime < 2000) {
    // Cancelar timeout anterior y programar uno nuevo
    if (bpmnSaveTimeout) {
      clearTimeout(bpmnSaveTimeout);
    }
    bpmnSaveTimeout = setTimeout(() => {
      saveBpmnState();
      lastBpmnSaveTime = Date.now();
    }, 2000);
    return;
  }
  
  // Guardar inmediatamente si ha pasado suficiente tiempo
  saveBpmnState();
  lastBpmnSaveTime = now;
}

function loadBpmnState() {
  try {
    console.log('loadBpmnState ejecutándose...');
    const savedDiagram = localStorage.getItem('bpmnDiagram');
    
    if (!modeler) {
      console.log('Modeler no disponible, reintentando en 500ms');
      setTimeout(loadBpmnState, 500);
      return;
    }
    
    if (savedDiagram && savedDiagram.trim().length > 0) {
      console.log('Cargando diagrama guardado...');
      modeler.importXML(savedDiagram).then(() => {
        console.log('Diagrama BPMN restaurado correctamente');
        updateUI('Diagrama BPMN restaurado.');
        
        // La restauración de relaciones PPINOT se maneja automáticamente en PPIManager
        // No es necesario llamar aquí ya que se ejecuta cuando el modeler está listo
        
      }).catch(err => {
        console.warn('Error al cargar diagrama guardado, creando nuevo:', err);
        createNewDiagram();
      });
    } else {
      console.log('No hay diagrama guardado, creando nuevo...');
      createNewDiagram();
    }
  } catch (e) {
    console.error('Error en loadBpmnState:', e);
    createNewDiagram();
  }
}

function validateAndSanitizeWaypoints(waypoints) {
  if (!waypoints || !Array.isArray(waypoints)) return [];
  const valid = waypoints.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
  const unique = valid.filter((p, i, arr) => i === 0 || p.x !== arr[i-1].x || p.y !== arr[i-1].y);
  return unique.length >= 2 ? unique : [];
}

let modeler = null;
const moddle = new BpmnModdle({});
const container = $('.panel:first-child');
const body = $('body');

function initializeModeler() {
  try {
    // Verificar que el elemento canvas existe antes de inicializar
    const canvasElement = document.getElementById('js-canvas');
    if (!canvasElement) {
      console.error('Canvas element #js-canvas not found, cannot initialize modeler');
      return;
    }
    
    // Limpiar modeler anterior si existe
    if (window.modeler && typeof window.modeler.destroy === 'function') {
      try {
        window.modeler.destroy();
      } catch (e) {
        console.warn('Error al destruir modeler anterior:', e);
      }
    }
    
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
      
      // Guardar estado automáticamente cuando hay cambios
      eventBus.on([
        'element.added',
        'element.removed', 
        'element.changed',
        'elements.changed',
        'shape.move.end',
        'shape.resize.end',
        'connection.create',
        'connection.delete'
      ], () => {
        autoSaveBpmnState(); // Usar sistema de guardado automático con debounce
      });
    }
    
    // El modeler está listo
    window.modeler = modeler;
    
    console.log('Modeler inicializado correctamente');
    
    // Inicializar integración con PPI si está disponible
    if (window.ppiManager && window.BpmnIntegration) {
      window.bpmnIntegration = new BpmnIntegration(window.ppiManager, modeler);
    }
  } catch (error) {
    console.error('Error en initializeModeler:', error);
  }
}

async function createNewDiagram() {
  try {
    console.log('createNewDiagram ejecutándose...');
    if (typeof modeler.clear === 'function') await modeler.clear();
    await modeler.createDiagram();
    console.log('Nuevo diagrama creado con éxito');

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

// Función para verificar si el modeler está en buen estado
function isModelerHealthy() {
  if (!window.modeler) return false;
  
  try {
    const canvas = window.modeler.get('canvas');
    const canvasElement = document.getElementById('js-canvas');
    
    // Verificar que existe el elemento canvas y que el modeler puede acceder a él
    return canvas && canvasElement && canvasElement.parentNode;
  } catch (e) {
    return false;
  }
}

// Función de debug para verificar el estado del localStorage
function debugBpmnState() {
  const savedDiagram = localStorage.getItem('bpmnDiagram');
  if (savedDiagram) {
  } else {
  }
  
  if (modeler) {
  } else {
  }
}

// Hacer las funciones globales para que el gestor de paneles pueda acceder a ellas
window.initializeModeler = initializeModeler;
window.createNewDiagram = createNewDiagram;
window.isModelerHealthy = isModelerHealthy;
window.saveBpmnState = saveBpmnState;
window.loadBpmnState = loadBpmnState;
window.autoSaveBpmnState = autoSaveBpmnState;
window.debugBpmnState = debugBpmnState;

function updateUI(message = '') {
  if (message) $('.status-item:first-child span').text(message);
  $('.status-item:nth-child(2) span').text('Modo: Edición');
}

// Funciones para manejo de archivos
function handleNewDiagram() {
  showModeler();
  // Limpiar cualquier diagrama existente
  localStorage.removeItem('bpmnDiagram');
  localStorage.removeItem('bpmnDiagramTimestamp');
  // Actualizar la UI si se regresa a la pantalla de bienvenida
  checkSavedDiagram();
  // El modeler se inicializará automáticamente
}

function handleContinueDiagram() {
  showModeler();
  // El diagrama guardado se cargará automáticamente cuando se inicialice el modeler
}

function handleOpenDiagram() {
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.click();
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const content = e.target.result;
      localStorage.setItem('bpmnDiagram', content);
      localStorage.setItem('bpmnDiagramTimestamp', Date.now().toString());
      showModeler();
      // Actualizar la UI para reflejar que ahora hay un diagrama guardado
      checkSavedDiagram();
      // El diagrama se cargará automáticamente cuando se inicialice el modeler
    };
    reader.readAsText(file);
  }
}

// Función para verificar si hay un diagrama guardado y actualizar la UI
function checkSavedDiagram() {
  const savedDiagram = localStorage.getItem('bpmnDiagram');
  const savedTimestamp = localStorage.getItem('bpmnDiagramTimestamp');
  const continueBtn = document.getElementById('continue-diagram-btn');
  const newBtn = document.getElementById('new-diagram-btn');
  const savedInfo = document.getElementById('saved-diagram-info');
  const savedDate = document.getElementById('saved-diagram-date');
  
  if (savedDiagram && savedDiagram.trim().length > 0) {
    // Hay un diagrama guardado, mostrar botón de continuar e información
    if (continueBtn) {
      continueBtn.classList.remove('hidden');
    }
    if (savedInfo) {
      savedInfo.classList.remove('hidden');
    }
    
    // Mostrar fecha de última modificación si está disponible
    if (savedDate && savedTimestamp) {
      const date = new Date(parseInt(savedTimestamp));
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      let timeText = '';
      if (diffMins < 1) {
        timeText = 'Hace menos de un minuto';
      } else if (diffMins < 60) {
        timeText = `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
      } else if (diffHours < 24) {
        timeText = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      } else if (diffDays < 7) {
        timeText = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
      } else {
        timeText = date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      savedDate.textContent = `Última modificación: ${timeText}`;
    } else if (savedDate) {
      savedDate.textContent = 'Diagrama disponible';
    }
    
    // Cambiar el botón "Nuevo" a secundario
    if (newBtn) {
      newBtn.classList.remove('primary');
      newBtn.classList.add('secondary');
    }
  } else {
    // No hay diagrama guardado, ocultar botón de continuar e información
    if (continueBtn) {
      continueBtn.classList.add('hidden');
    }
    if (savedInfo) {
      savedInfo.classList.add('hidden');
    }
    // Mantener el botón "Nuevo" como primario
    if (newBtn) {
      newBtn.classList.add('primary');
      newBtn.classList.remove('secondary');
    }
  }
}

// Panel y modeler init principal
$(function () {
  // Obtener referencias a los elementos de navegación
  welcomeScreen = document.getElementById('welcome-screen');
  modelerContainer = document.getElementById('modeler-container');
  
  // Verificar si hay un diagrama guardado y actualizar la UI
  checkSavedDiagram();
  
  // Configurar event listeners para la pantalla de bienvenida
  const newDiagramBtn = document.getElementById('new-diagram-btn');
  const openDiagramBtn = document.getElementById('open-diagram-btn');
  const continueDiagramBtn = document.getElementById('continue-diagram-btn');
  
  if (newDiagramBtn) {
    newDiagramBtn.addEventListener('click', handleNewDiagram);
  }
  
  if (openDiagramBtn) {
    openDiagramBtn.addEventListener('click', handleOpenDiagram);
  }
  
  if (continueDiagramBtn) {
    continueDiagramBtn.addEventListener('click', handleContinueDiagram);
  }
  
  // Configurar event listeners para el modelador
  const newBtn = document.getElementById('new-btn');
  const openBtn = document.getElementById('open-btn');
  const saveBtn = document.getElementById('save-btn');
  const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');
  const fileInput = document.getElementById('file-input');
  
  if (newBtn) {
    newBtn.addEventListener('click', handleNewDiagram);
  }
  
  if (openBtn) {
    openBtn.addEventListener('click', handleOpenDiagram);
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (modeler) {
        saveBpmnState();
      }
    });
  }
  
  if (backToWelcomeBtn) {
    backToWelcomeBtn.addEventListener('click', () => {
      showWelcomeScreen();
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }
  
  // Mostrar pantalla de bienvenida por defecto
  showWelcomeScreen();
});