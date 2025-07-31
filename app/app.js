// === app.js limpio ===
// TODO: A TERMINAR EL DESARROLLO - Sistema de guardado automático implementado

console.log('🚀 app.js: Archivo cargado correctamente');

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

// Funciones de persistencia para el estado del BPMN
function saveBpmnState() {
  try {
    if (modeler) {
      const xml = modeler.saveXML({ format: true });
      xml.then(result => {
        if (result && result.xml && result.xml.trim().length > 0) {
          localStorage.setItem('bpmnDiagram', result.xml);
          showBpmnSaveIndicator();
          console.log('✅ Estado BPMN guardado automáticamente');
          console.log('📊 Tamaño del XML:', result.xml.length, 'caracteres');
        } else {
          console.warn('⚠️ XML BPMN vacío, no se guardó');
        }
      }).catch(err => {
        console.warn('❌ Error al guardar estado BPMN:', err);
      });
    } else {
      console.warn('⚠️ Modeler BPMN no está disponible para guardar');
    }
  } catch (e) {
    console.warn('❌ No se pudo guardar el estado BPMN:', e);
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
    const savedDiagram = localStorage.getItem('bpmnDiagram');
    
    if (!modeler) {
      console.log('📂 Modeler no está listo, esperando...');
      setTimeout(loadBpmnState, 500);
      return;
    }
    
    if (savedDiagram && savedDiagram.trim().length > 0) {
      console.log('📂 Intentando cargar diagrama BPMN guardado...');
      modeler.importXML(savedDiagram).then(() => {
        console.log('✅ Estado BPMN cargado automáticamente');
        updateUI('Diagrama BPMN restaurado.');
      }).catch(err => {
        console.warn('❌ Error al cargar estado BPMN:', err);
        console.log('📂 Creando nuevo diagrama BPMN...');
        createNewDiagram();
      });
    } else {
      console.log('📂 No hay diagrama BPMN guardado, creando nuevo');
      createNewDiagram();
    }
  } catch (e) {
    console.warn('❌ No se pudo cargar el estado BPMN:', e);
    console.log('📂 Creando nuevo diagrama BPMN...');
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
        const wp = event?.context?.connection?.waypoints;
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
    
    // El estado se cargará desde el gestor de paneles
    console.log('✅ Modeler BPMN inicializado correctamente');
  } catch (error) {
    console.error('❌ Error initializing modeler:', error);
  }
}

async function createNewDiagram() {
  try {
    if (typeof modeler.clear === 'function') await modeler.clear();
    await modeler.createDiagram();

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

// Función de debug para verificar el estado del localStorage
function debugBpmnState() {
  console.log('🔍 === DEBUG ESTADO BPMN ===');
  const savedDiagram = localStorage.getItem('bpmnDiagram');
  if (savedDiagram) {
    console.log('✅ Diagrama BPMN encontrado en localStorage');
    console.log('📊 Tamaño:', savedDiagram.length, 'caracteres');
    console.log('📄 Primeros 200 caracteres:', savedDiagram.substring(0, 200));
  } else {
    console.log('❌ No hay diagrama BPMN en localStorage');
  }
  
  if (modeler) {
    console.log('✅ Modeler BPMN disponible');
  } else {
    console.log('❌ Modeler BPMN no disponible');
  }
  console.log('🔍 === FIN DEBUG ===');
}

// Hacer las funciones globales para que el gestor de paneles pueda acceder a ellas
window.initializeModeler = initializeModeler;
window.createNewDiagram = createNewDiagram;
window.saveBpmnState = saveBpmnState;
window.loadBpmnState = loadBpmnState;
window.autoSaveBpmnState = autoSaveBpmnState;
window.debugBpmnState = debugBpmnState;

function updateUI(message = '') {
  if (message) $('.status-item:first-child span').text(message);
  $('.status-item:nth-child(2) span').text('Modo: Edición');
}

// Panel y modeler init principal
$(function () {
  const panelContainer = document.getElementById('panel-container');
  if (!panelContainer) return;

  const panelLoader = new PanelLoader();
  window.panelLoader = panelLoader;

  // Sistema de layout removido - No se necesita desplazamiento de ventanas
  // const snapSystem = new PanelSnapSystem();
  // window.snapSystem = snapSystem;

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
    console.log('Aplicación inicializada con gestor de paneles');
  }, 300);
});