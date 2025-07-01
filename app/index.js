/**
 * Unified Hybrid Modeler Application
 * 
 * Simple unified modeler with all notations (BPMN, PPINOT, RALPH) as one symbolism
 * 
 * Estructura basada en el setup tipo bpmn.io + jQuery + drag & drop + moddleExtensions
 */

import $ from 'jquery';
import BaseModeler from './baseModeler/index.js';
import BpmnModdle from 'bpmn-moddle';
import PPINOTDescriptor from './PPINOT-modeler/PPINOT/PPINOT.json';
// import RALPHDescriptor from './RALPH-modeler/RALPH/RALPH.json'; // (Si tienes RALPH)

// Utilidades de navegación de subprocesos
import SubprocessNavigation from './PPINOT-modeler/PPINOT/utils/NavigationUtil.js';

// Importar CSS
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';


// Variables globales
const moddle = new BpmnModdle({});
const container = $('#js-drop-zone');
const body = $('body');

let modeler = null;
let subprocessNavigation = null;
let navigationTimer = null;
let currentFile = null;

// Inicializar el modelador híbrido con extensiones
function initializeModeler() {
  modeler = new BaseModeler({
    container: '#js-canvas',
    moddleExtensions: {
      PPINOT: PPINOTDescriptor,
      // RALPH: RALPHDescriptor
    }
  });
  window.modeler = modeler; // Para debugging global
}

// Inicializar navegación de subprocesos
function initializeNavigation() {
  if (subprocessNavigation) subprocessNavigation.destroy();
  if (navigationTimer) clearTimeout(navigationTimer);

  navigationTimer = setTimeout(() => {
    try {
      subprocessNavigation = new SubprocessNavigation(modeler);
      navigationTimer = null;
    } catch (error) {
      console.error('Error creando navegación:', error);
      navigationTimer = null;
    }
  }, 100);
}

// Crear un nuevo diagrama vacío
async function createNewDiagram() {
  try {
    if (typeof modeler.clear === 'function') await modeler.clear();
    await modeler.createDiagram();

    container.removeClass('with-error').addClass('with-diagram');
    body.addClass('shown');

    initializeNavigation();

    updateUI('Nuevo diagrama creado.');
  } catch (err) {
    container.removeClass('with-diagram').addClass('with-error');
    container.find('.error pre').text(err.message);
  }
}

// Abrir diagrama desde XML (+ opcionalmente archivo CBPMN para PPINOT)
async function openDiagram(xml, cbpmn) {
  try {
    await modeler.clear();
    await modeler.importXML(xml);

    container.removeClass('with-error').addClass('with-diagram');
    if (cbpmn) modeler.addPPINOTElements(cbpmn);

    body.addClass('shown');
    initializeNavigation();

    updateUI('Diagrama cargado exitosamente.');
  } catch (err) {
    container.removeClass('with-diagram').addClass('with-error');
    container.find('.error pre').text(err.message);
  }
}

// Guardar diagrama como XML
function saveDiagram(done) {
  modeler.saveXML({ format: true }, (err, xml) => {
    // Opcional: procesamiento para integridad de PPINOT/BPMN
    moddle.fromXML(xml, (err, def) => {
      if (def.getPPINOTElements) def.getPPINOTElements();
      def.get('rootElements').forEach((obj) => {
        if (obj.$type && obj.$type.includes('Process')) {
          obj.get('flowElements').forEach((el) => {
            if (el.$type && el.$type.includes('Task')) fixTaskData(el);
            else if (el.$type === 'bpmn:DataObjectReference' && !el.get('name')) el.set('name', '');
          });
        }
      });
      moddle.toXML(def, { format: true }, (err, res) => {
        done(err, res, modeler.getPPINOTElements ? modeler.getPPINOTElements() : null);
      });
    });
    done(err, xml);
  });
}

// Guardar SVG
function saveSVG(done) {
  modeler.saveSVG(done);
}

// Manejo avanzado de archivos BPMN + CBPMN
function handleFiles(files, callback) {
  let bpmn, cbpmnFile;
  if (files[0].name.includes('.bpmn')) {
    bpmn = files[0];
    if (files[1] && files[1].name.includes('.cbpmn')) cbpmnFile = files[1];
    else if (files[1]) window.alert('El segundo archivo no es cbpmn');
  } else if (files[1] && files[1].name.includes('.bpmn')) {
    bpmn = files[1];
    if (files[0] && files[0].name.includes('.cbpmn')) cbpmnFile = files[0];
    else if (files[0]) window.alert('El segundo archivo no es cbpmn');
  } else if (files[0].name.includes('.cbpmn')) cbpmnFile = files[0];

  const reader = new FileReader();
  if (bpmn) {
    reader.onload = (e) => {
      const xml = e.target.result;
      if (cbpmnFile) {
        const reader1 = new FileReader();
        reader1.onload = (e) => {
          const cbpmn = JSON.parse(e.target.result);
          callback(xml, cbpmn);
        };
        reader1.readAsText(cbpmnFile);
      } else {
        callback(xml, null);
      }
    };
    reader.readAsText(bpmn);  } else if (cbpmnFile) {
    reader.onload = (e) => {
      const cbpmn = JSON.parse(e.target.result);
      if (modeler.addPPINOTElements) modeler.addPPINOTElements(cbpmn);
    };
    reader.readAsText(cbpmnFile);
  }
}

// Registrar drag & drop en el contenedor principal
function registerFileDrop(container, callback) {
  const handleFileSelect = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFiles(files, callback);
  };
  const handleDragOver = (e) => {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  container.get(0).addEventListener('dragover', handleDragOver, false);
  container.get(0).addEventListener('drop', handleFileSelect, false);
}

// Fix de datos en tareas para integridad BPMN/PPINOT
function fixTaskData(task) {
  if (task.dataInputAssociations || task.dataOutputAssociations) {
    const ioSpecification = moddle.create('bpmn:InputOutputSpecification', { id: `io_${task.get('id')}` });
    if (task.dataInputAssociations) {
      task.dataInputAssociations.forEach((obj) => {
        const dataInput = moddle.create('bpmn:DataInput', { id: `input_${obj.get('id')}` });
        ioSpecification.get('dataInputs').push(dataInput);
        obj.set('targetRef', dataInput);
        if (!obj.get('name')) obj.set('name', '');
      });
    }
    if (task.dataOutputAssociations) {
      task.dataOutputAssociations.forEach((obj) => {
        const dataOutput = moddle.create('bpmn:DataOutput', { id: `output_${obj.get('id')}` });
        ioSpecification.get('dataOutputs').push(dataOutput);
        obj.set('sourceRef', [dataOutput]);
        if (!obj.get('name')) obj.set('name', '');
      });
    }
    task.set('ioSpecification', ioSpecification);
  }
  if (!task.get('name')) task.set('name', '');
  return task;
}

// UI update (modo unificado)
function updateUI(msg) {
  $('#notation-status').text('Modo: Unificado (BPMN + PPINOT + RALPH)');
  $('.mode-btn').removeClass('active');
  $('#hybrid-mode').addClass('active');
  if (msg) console.log(msg);
}

// ==== INICIALIZACIÓN DOCUMENTO Y BOTONES ====

$(function() {
  // Chequeo soporte archivos
  if (!window.FileList || !window.FileReader) {
    window.alert('Tu navegador no soporta drag and drop. Usa Chrome/Firefox/IE > 10.');
    return;
  }
  // Inicializar modeler
  initializeModeler();
  
  // Crear diagrama vacío automáticamente al inicializar
  createNewDiagram();

  // Drag & drop
  registerFileDrop(container, openDiagram);

  // Botón abrir diagrama
  $('#js-open-diagram').click((e) => {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.click();
    input.addEventListener('input', (evt) => {
      handleFiles(evt.target.files, openDiagram);
    });
  });

  // Botón crear nuevo diagrama
  $('.js-create-diagram').click((e) => {
    e.preventDefault();
    createNewDiagram();
  });

  // Botón guardar diagrama
  $('#js-download-diagram').click((e) => {
    e.preventDefault();
    saveDiagram((err, xml) => {
      if (err) return alert('Error guardando: ' + err.message);
      const filename = currentFile || 'diagram.bpmn';
      downloadFile(xml, filename);
      updateUI('Diagrama guardado.');
    });
  });

  // Botón guardar SVG
  $('#js-download-svg').click((e) => {
    e.preventDefault();
    saveSVG((err, svg) => {
      if (err) return alert('Error exportando SVG: ' + err.message);
      const filename = 'diagram.svg';
      downloadFile(svg, filename, 'image/svg+xml');
      updateUI('SVG exportado.');
    });
  });

  // Botón añadir colores (opcional)
  $('#js-add-colors').click((e) => {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false;
    input.click();
    input.addEventListener('input', (evt) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (modeler.setColors) modeler.setColors(JSON.parse(e.target.result));
      };
      reader.readAsText(evt.target.files[0]);
    });
  });

  // Bloqueo de clicks repetidos
  $('.buttons a').click(function(e) {
    if (!$(this).is('.active')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Export automático (SVG y BPMN) al cambiar el diagrama
  const exportArtifacts = debounce(() => {
    saveSVG((err, svg) => {
      setEncoded($('#js-download-svg'), 'diagram.svg', err ? null : svg);
    });
    saveDiagram((err, xml) => {
      const cbpmn = modeler.getJson ? modeler.getJson() : null;
      setMultipleEncoded($('#js-download-diagram'), 'diagram.bpmn', err ? null : [xml, cbpmn]);
    });
  }, 500);
  if (modeler.on) modeler.on('commandStack.changed', exportArtifacts);

  updateUI('Aplicación híbrida lista ✔️');
});

// ==== HELPERS ====

function setEncoded(link, name, data) {
  const encodedData = encodeURIComponent(data);
  if (data) {
    link.addClass('active').attr({
      href: `data:application/bpmn20-xml;charset=UTF-8,${encodedData}`,
      download: name
    });
  } else {
    link.removeClass('active');
  }
}

function setMultipleEncoded(link, name, data) {
  if (data) {
    window.localStorage.setItem('diagram', encodeURIComponent(data[0]));
    window.localStorage.setItem('PPINOT', encodeURIComponent(JSON.stringify(data[1])));
  } else {
    link.removeClass('active');
  }
}

function downloadFile(content, filename, type = 'application/xml') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Utilidad debounce
function debounce(fn, timeout) {
  let timer;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, timeout);
  };
}
