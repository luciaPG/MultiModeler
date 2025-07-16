// === app.js limpio ===

import $ from 'jquery';
import MultiNotationModeler from './MultiNotationModeler/index.js';
import BpmnModdle from 'bpmn-moddle';
import PPINOTModdle from './PPINOT-modeler/PPINOT/PPINOTModdle.json';
import RALphModdle from './RALPH-modeler/RALph/RALphModdle.json';
import { PanelLoader } from './js/panel-loader.js';
import { initRasciPanel } from './js/panels/rasci.js';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';

// Variables globales
window.rasciRoles = [];
window.rasciTasks = [];
window.rasciMatrixData = {};
window.initRasciPanel = initRasciPanel;

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
    }
  } catch (error) {
    console.error('Error initializing modeler:', error);
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

  panelLoader.createPanel('bpmn', panelContainer).then(bpmnPanel => {
    if (bpmnPanel) {
      bpmnPanel.style.flex = '2';
    }
  });

  panelLoader.createPanel('rasci', panelContainer).then(rasciPanel => {
    if (rasciPanel) {
      rasciPanel.style.flex = '1';
    }
  });

  setTimeout(() => {
    initializeModeler();
    createNewDiagram();
  }, 300);
});