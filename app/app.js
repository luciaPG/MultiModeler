/**
 * Unified Hybrid Modeler Application
 * 
 * Simple unified modeler with all notations (BPMN, PPINOT, RALPH) as one symbolism
 * 
 * Estructura basada en el setup tipo bpmn.io + jQuery + drag & drop + moddleExtensions
 */

import $ from 'jquery';
import MultiNotationModeler from './MultiNotationModeler/index.js';
import BpmnModdle from 'bpmn-moddle';
import PPINOTModdle from './PPINOT-modeler/PPINOT/PPINOTModdle.json';
import RALphModdle from './RALPH-modeler/RALph/RALPHModdle.json';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';

// Helper function to validate and sanitize waypoints
function validateAndSanitizeWaypoints(waypoints) {
  if (!Array.isArray(waypoints)) {
    return [];
  }
  
  return waypoints.filter(function(point) {
    return point && 
           typeof point.x === 'number' && 
           typeof point.y === 'number' && 
           !isNaN(point.x) && !isNaN(point.y) && 
           isFinite(point.x) && isFinite(point.y);
  }).map(function(point) {
    // Ensure coordinates are finite numbers
    return {
      x: isFinite(point.x) ? point.x : 0,
      y: isFinite(point.y) ? point.y : 0
    };
  });
}

const moddle = new BpmnModdle({});
const container = $('#js-drop-zone');
const body = $('body');
let modeler = null;
let currentFile = null;

function initializeModeler() {
  modeler = new MultiNotationModeler({
    container: '#js-canvas',
    moddleExtensions: {
      PPINOT: PPINOTModdle,
      RALph: RALphModdle
    }
  });
  
  // Add global waypoint validation
  if (modeler && modeler.get('eventBus')) {
    const eventBus = modeler.get('eventBus');
    
    // Validate waypoints for all connections
    eventBus.on(['connection.create', 'connection.updateWaypoints', 'bendpoint.move.cleanup'], function(event) {
      var context = event.context,
          connection = context && context.connection;

      if (connection && connection.waypoints) {
        connection.waypoints = validateAndSanitizeWaypoints(connection.waypoints);
      }
    });

    // Validate waypoints for connection previews
    eventBus.on('connectionPreview.shown', function(event) {
      if (event.connection && event.connection.waypoints) {
        event.connection.waypoints = validateAndSanitizeWaypoints(event.connection.waypoints);
      }
    });
  }
  
  window.modeler = modeler;
}


async function createNewDiagram() {
  try {
    if (typeof modeler.clear === 'function') await modeler.clear();
    await modeler.createDiagram();
    container.removeClass('with-error').addClass('with-diagram');
    body.addClass('shown');
    updateUI('Nuevo diagrama creado.');
  } catch (err) {
    container.removeClass('with-diagram').addClass('with-error');
    container.find('.error pre').text(err.message);
  }
}

async function openDiagram(xml, cbpmn, ralph) {
  try {
    await modeler.clear();
    await modeler.importXML(xml);
    container.removeClass('with-error').addClass('with-diagram');
    if (cbpmn) modeler.addPPINOTElements(cbpmn);
    if (ralph) modeler.importRALPHDiagram(ralph);
    body.addClass('shown');
    updateUI('Diagrama cargado exitosamente.');
  } catch (err) {
    container.removeClass('with-diagram').addClass('with-error');
    container.find('.error pre').text(err.message);
  }
}

function saveDiagram(done) {
  modeler.saveXML({ format: true }, (err, xml) => {
    moddle.fromXML(xml, (err, def) => {
      if (def.getPPINOTElements) def.getPPINOTElements();
      def.get('rootElements').forEach((obj) => {
        if (obj.$type && obj.$type.includes('Process')) {
          obj.get('flowElements').forEach((el) => {
            if (el.$type && el.$type.includes('Task')) fixTaskData(el);
            else if (el.$type === 'bpmn:DataObjectReference' && !el.get('name')) el.set('name', '');
            // Ensure RALPH elements have their names saved
            else if (el.$type && el.$type.startsWith('RALph:')) {
              if (!el.get('name')) el.set('name', '');
            }
          });
        }
      });
      moddle.toXML(def, { format: true }, (err, res) => {
        const ppinotElements = modeler.getPPINOTElements ? modeler.getPPINOTElements() : null;
        const ralphElements = modeler.getRALPHElements ? modeler.getRALPHElements() : null;
        done(err, res, { ppinot: ppinotElements, ralph: ralphElements });
      });
    });
  });
}

function saveSVG(done) {
  modeler.saveSVG(done);
}

function handleFiles(files, callback) {
  let bpmn, cbpmnFile, ralphFile;
  if (files[0].name.includes('.bpmn')) {
    bpmn = files[0];
    if (files[1] && files[1].name.includes('.cbpmn')) cbpmnFile = files[1];
    else if (files[1]) window.alert('El segundo archivo no es cbpmn');
    if (files[2] && files[2].name.includes('.ralph')) ralphFile = files[2];
    else if (files[2]) window.alert('El tercer archivo no es ralph');
  } else if (files[1] && files[1].name.includes('.bpmn')) {
    bpmn = files[1];
    if (files[0] && files[0].name.includes('.cbpmn')) cbpmnFile = files[0];
    else if (files[0]) window.alert('El segundo archivo no es cbpmn');
    if (files[2] && files[2].name.includes('.ralph')) ralphFile = files[2];
    else if (files[2]) window.alert('El tercer archivo no es ralph');
  } else if (files[2] && files[2].name.includes('.bpmn')) {
    bpmn = files[2];
    if (files[0] && files[0].name.includes('.cbpmn')) cbpmnFile = files[0];
    else if (files[0]) window.alert('El segundo archivo no es cbpmn');
    if (files[1] && files[1].name.includes('.ralph')) ralphFile = files[1];
    else if (files[1]) window.alert('El tercer archivo no es ralph');
  } else if (files[0].name.includes('.cbpmn')) cbpmnFile = files[0];
  else if (files[0].name.includes('.ralph')) ralphFile = files[0];

  const reader = new FileReader();
  if (bpmn) {
    reader.onload = (e) => {
      const xml = e.target.result;
      if (cbpmnFile && ralphFile) {
        const reader1 = new FileReader();
        reader1.onload = (e) => {
          const cbpmn = JSON.parse(e.target.result);
          const reader2 = new FileReader();
          reader2.onload = (e) => {
            const ralph = JSON.parse(e.target.result);
            callback(xml, cbpmn, ralph);
          };
          reader2.readAsText(ralphFile);
        };
        reader1.readAsText(cbpmnFile);
      } else if (cbpmnFile) {
        const reader1 = new FileReader();
        reader1.onload = (e) => {
          const cbpmn = JSON.parse(e.target.result);
          callback(xml, cbpmn, null);
        };
        reader1.readAsText(cbpmnFile);
      } else if (ralphFile) {
        const reader1 = new FileReader();
        reader1.onload = (e) => {
          const ralph = JSON.parse(e.target.result);
          callback(xml, null, ralph);
        };
        reader1.readAsText(ralphFile);
      } else {
        callback(xml, null, null);
      }
    };
    reader.readAsText(bpmn);
  } else if (cbpmnFile) {
    reader.onload = (e) => {
      const cbpmn = JSON.parse(e.target.result);
      if (modeler.addPPINOTElements) modeler.addPPINOTElements(cbpmn);
    };
    reader.readAsText(cbpmnFile);
  } else if (ralphFile) {
    reader.onload = (e) => {
      const ralph = JSON.parse(e.target.result);
      if (modeler.importRALPHDiagram) modeler.importRALPHDiagram(ralph);
    };
    reader.readAsText(ralphFile);
  }
}

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

function updateUI(msg) {
  $('#notation-status').text('Modo: Unificado (BPMN + PPINOT + RALPH)');
  $('.mode-btn').removeClass('active');
  $('#hybrid-mode').addClass('active');
  if (msg) console.log(msg);
}

// ==== INICIALIZACIÓN DOCUMENTO Y BOTONES ====
$(function() {
  if (!window.FileList || !window.FileReader) {
    window.alert('Tu navegador no soporta drag and drop. Usa Chrome/Firefox/IE > 10.');
    return;
  }
  initializeModeler();
  createNewDiagram();
  registerFileDrop(container, openDiagram);
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
  $('.js-create-diagram').click((e) => {
    e.preventDefault();
    createNewDiagram();
  });
  $('#js-download-diagram').click((e) => {
    e.preventDefault();
    saveDiagram((err, xml) => {
      if (err) return alert('Error guardando: ' + err.message);
      const filename = currentFile || 'diagram.bpmn';
      downloadFile(xml, filename);
      updateUI('Diagrama guardado.');
    });
  });
  $('#js-download-svg').click((e) => {
    e.preventDefault();
    saveSVG((err, svg) => {
      if (err) return alert('Error exportando SVG: ' + err.message);
      const filename = 'diagram.svg';
      downloadFile(svg, filename, 'image/svg+xml');
      updateUI('SVG exportado.');
    });
  });
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
  $('.buttons a').click(function(e) {
    if (!$(this).is('.active')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  const exportArtifacts = debounce(() => {
    saveSVG((err, svg) => {
      setEncoded($('#js-download-svg'), 'diagram.svg', err ? null : svg);
    });
    saveDiagram((err, xml, data) => {
      const cbpmn = data && data.ppinot ? data.ppinot : (modeler.getJson ? modeler.getJson() : null);
      const ralph = data && data.ralph ? data.ralph : null;
      setMultipleEncoded($('#js-download-diagram'), 'diagram.bpmn', err ? null : [xml, cbpmn, ralph]);
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
    if (data[2]) {
      window.localStorage.setItem('RALPH', encodeURIComponent(JSON.stringify(data[2])));
    }
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
