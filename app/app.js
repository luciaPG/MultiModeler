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
import RALphModdle from './RALPH-modeler/RALph/RALphModdle.json';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';

console.log('App.js loaded successfully');

// Helper function to validate and sanitize waypoints
function validateAndSanitizeWaypoints(waypoints) {
  // Handle null, undefined, or non-array inputs
  if (!waypoints || !Array.isArray(waypoints)) {
    return [];
  }
  
  // Ensure we have at least 2 waypoints for a valid connection
  const validWaypoints = waypoints.filter(function(point) {
    return point && 
           typeof point.x === 'number' && 
           typeof point.y === 'number' && 
           !isNaN(point.x) && !isNaN(point.y) && 
           isFinite(point.x) && isFinite(point.y) &&
           point.x !== null && point.y !== null;
  }).map(function(point) {
    // Ensure coordinates are finite numbers with fallback to 0
    return {
      x: isFinite(point.x) && point.x !== null ? point.x : 0,
      y: isFinite(point.y) && point.y !== null ? point.y : 0
    };
  });
  
  // If we don't have enough waypoints, return empty array to prevent intersection errors
  if (validWaypoints.length < 2) {
    return [];
  }
  
  // Ensure waypoints are not identical (which can cause intersection issues)
  const uniqueWaypoints = [];
  for (let i = 0; i < validWaypoints.length; i++) {
    const current = validWaypoints[i];
    const previous = uniqueWaypoints[uniqueWaypoints.length - 1];
    
    if (!previous || (current.x !== previous.x || current.y !== previous.y)) {
      uniqueWaypoints.push(current);
    }
  }
  
  // Still need at least 2 waypoints
  if (uniqueWaypoints.length < 2) {
    return [];
  }
  
  return uniqueWaypoints;
}

console.log('Initializing moddle and container');

const moddle = new BpmnModdle({});
const container = $('.panel:first-child');
const body = $('body');
let modeler = null;
let currentFile = null;

console.log('Container found:', container.length > 0);

function initializeModeler() {
  console.log('Initializing modeler...');
  
  try {
    modeler = new MultiNotationModeler({
      container: '#js-canvas',
      moddleExtensions: {
        PPINOT: PPINOTModdle,
        RALph: RALphModdle
      }
    });
    
    console.log('Modeler created successfully');
    
    // Make modeler globally accessible for HTML scripts
    window.bpmnModeler = modeler;
  } catch (error) {
    console.error('Error initializing modeler:', error);
    return;
  }
  
  // Add global waypoint validation
  if (modeler && modeler.get('eventBus')) {
    const eventBus = modeler.get('eventBus');
    
    // Validate waypoints for all connections - earlier in the process
    eventBus.on(['connect.start', 'connect.hover', 'connect.out', 'connect.cleanup', 'connection.create', 'connection.updateWaypoints', 'bendpoint.move.cleanup', 'bendpoint.add', 'bendpoint.move.start', 'bendpoint.move.end', 'drop.start', 'drop.end', 'drag.start', 'drag.end'], function(event) {
      var context = event.context;
      
      // Validate connection waypoints
      if (context && context.connection && context.connection.waypoints) {
        context.connection.waypoints = validateAndSanitizeWaypoints(context.connection.waypoints);
      }
      
      // Validate hints waypoints
      if (context && context.hints && context.hints.waypoints) {
        context.hints.waypoints = validateAndSanitizeWaypoints(context.hints.waypoints);
      }
      
      // Validate any waypoints in the event itself
      if (event.connection && event.connection.waypoints) {
        event.connection.waypoints = validateAndSanitizeWaypoints(event.connection.waypoints);
      }
      
      // Special handling for gateway connections
      if (context && context.source && context.source.type && context.source.type.includes('Gateway')) {
        // Ensure gateway connections have valid waypoints
        if (context.connection && context.connection.waypoints) {
          context.connection.waypoints = validateAndSanitizeWaypoints(context.connection.waypoints);
        }
        if (context.hints && context.hints.waypoints) {
          context.hints.waypoints = validateAndSanitizeWaypoints(context.hints.waypoints);
        }
      }
      
      if (context && context.target && context.target.type && context.target.type.includes('Gateway')) {
        // Ensure gateway connections have valid waypoints
        if (context.connection && context.connection.waypoints) {
          context.connection.waypoints = validateAndSanitizeWaypoints(context.connection.waypoints);
        }
        if (context.hints && context.hints.waypoints) {
          context.hints.waypoints = validateAndSanitizeWaypoints(context.hints.waypoints);
        }
      }
    });

    // Validate waypoints for connection previews and drops
    eventBus.on(['connectionPreview.shown', 'connection.preview', 'connection.move', 'drop.cleanup', 'drag.cleanup'], function(event) {
      if (event.connection && event.connection.waypoints) {
        event.connection.waypoints = validateAndSanitizeWaypoints(event.connection.waypoints);
      }
      
      if (event.context && event.context.hints && event.context.hints.waypoints) {
        event.context.hints.waypoints = validateAndSanitizeWaypoints(event.context.hints.waypoints);
      }
      
      // Also validate any waypoints in the event context
      if (event.context && event.context.connection && event.context.connection.waypoints) {
        event.context.connection.waypoints = validateAndSanitizeWaypoints(event.context.connection.waypoints);
      }
    });
    
    // Additional validation for element registry updates
    eventBus.on(['elementRegistry.added', 'elementRegistry.removed', 'elementRegistry.updated'], function(event) {
      if (event.element && event.element.waypoints) {
        event.element.waypoints = validateAndSanitizeWaypoints(event.element.waypoints);
      }
    });
  }
  
  // Add command interceptor to catch waypoint issues before they cause errors
  if (modeler && modeler.get('commandStack')) {
    const commandStack = modeler.get('commandStack');
    
    // Use the correct API for command interceptors
    if (commandStack && typeof commandStack.on === 'function') {
      commandStack.on('commandStack.changed', function(event) {
        try {
          // Validate waypoints in the current command context
          if (event.command && event.command.context) {
            const context = event.command.context;
            
            if (context.connection && context.connection.waypoints) {
              context.connection.waypoints = validateAndSanitizeWaypoints(context.connection.waypoints);
            }
            
            if (context.connections) {
              context.connections.forEach(function(connection) {
                if (connection.waypoints) {
                  connection.waypoints = validateAndSanitizeWaypoints(connection.waypoints);
                }
              });
            }
          }
        } catch (error) {
          console.warn('Command stack waypoint validation error:', error);
        }
      });
    }
  }
  
  // Add specific validation for DropOnFlowBehavior to prevent intersection errors
  if (modeler && modeler.get('eventBus')) {
    const eventBus = modeler.get('eventBus');
    
    // Intercept events that might trigger DropOnFlowBehavior
    eventBus.on(['drop.start', 'drop.end', 'drop.cleanup', 'drag.start', 'drag.end', 'drag.cleanup'], function(event) {
      try {
        // Validate any waypoints in the event context
        if (event.context && event.context.connection && event.context.connection.waypoints) {
          event.context.connection.waypoints = validateAndSanitizeWaypoints(event.context.connection.waypoints);
        }
        
        // Validate waypoints in hints
        if (event.context && event.context.hints && event.context.hints.waypoints) {
          event.context.hints.waypoints = validateAndSanitizeWaypoints(event.context.hints.waypoints);
        }
        
        // Validate any waypoints in the event itself
        if (event.connection && event.connection.waypoints) {
          event.connection.waypoints = validateAndSanitizeWaypoints(event.connection.waypoints);
        }
        
        // Validate waypoints in any elements being moved
        if (event.context && event.context.elements) {
          event.context.elements.forEach(function(element) {
            if (element.waypoints) {
              element.waypoints = validateAndSanitizeWaypoints(element.waypoints);
            }
          });
        }
      } catch (error) {
        console.warn('Waypoint validation error:', error);
        // Prevent the error from propagating
        return false;
      }
    });
    
    // Add global error handler for waypoint-related errors
    eventBus.on(['error'], function(event) {
      if (event.error && event.error.message && event.error.message.includes('Cannot read properties of undefined')) {
        console.warn('Intercepted waypoint error:', event.error);
        // Prevent the error from propagating
        event.preventDefault();
        return false;
      }
    });
    
         // Intercept specific events that trigger DropOnFlowBehavior
     eventBus.on(['drop.start', 'drop.end'], function(event) {
       try {
         // Ensure all connections have valid waypoints before drop operations
         const elementRegistry = modeler.get('elementRegistry');
         if (elementRegistry) {
           elementRegistry.forEach(function(element) {
             if (element.waypoints && Array.isArray(element.waypoints)) {
               element.waypoints = validateAndSanitizeWaypoints(element.waypoints);
             }
           });
         }
         
         // Validate context waypoints
         if (event.context) {
           if (event.context.connection && event.context.connection.waypoints) {
             event.context.connection.waypoints = validateAndSanitizeWaypoints(event.context.connection.waypoints);
           }
           if (event.context.hints && event.context.hints.waypoints) {
             event.context.hints.waypoints = validateAndSanitizeWaypoints(event.context.hints.waypoints);
           }
         }
       } catch (error) {
         console.warn('Drop waypoint validation error:', error);
         return false;
       }
     });
     
     // Specific validation for AND/OR gateways (bpmn:Gateway)
     eventBus.on(['element.added', 'element.removed', 'element.changed'], function(event) {
       try {
         const element = event.element;
         
         // Check if it's a gateway (AND/OR gateways)
         if (element && element.type && element.type.includes('Gateway')) {
           // Validate all incoming and outgoing connections
           const modeling = modeler.get('modeling');
           if (modeling) {
             // Get all connections related to this gateway
             const elementRegistry = modeler.get('elementRegistry');
             if (elementRegistry) {
               elementRegistry.forEach(function(connection) {
                 if (connection.type && connection.type.includes('SequenceFlow')) {
                   // Check if this connection is connected to the gateway
                   if ((connection.source && connection.source.id === element.id) ||
                       (connection.target && connection.target.id === element.id)) {
                     if (connection.waypoints && Array.isArray(connection.waypoints)) {
                       connection.waypoints = validateAndSanitizeWaypoints(connection.waypoints);
                     }
                   }
                 }
               });
             }
           }
         }
       } catch (error) {
         console.warn('Gateway waypoint validation error:', error);
         return false;
       }
     });
  }
  
  window.modeler = modeler;
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
  if (!container || !container.get(0)) {
    console.warn('Container is not available for file drop registration');
    return;
  }
  
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
  
  try {
    container.get(0).addEventListener('dragover', handleDragOver, false);
    container.get(0).addEventListener('drop', handleFileSelect, false);
    console.log('File drop event listeners added successfully');
  } catch (error) {
    console.error('Error registering file drop:', error);
  }
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

function updateUI(message = '') {
  // Update status bar if message is provided
  if (message) {
    $('.status-item:first-child span').text(message);
  }
  
  // Update mode indicator
  $('.status-item:nth-child(2) span').text('Modo: Edición');
}

// ==== INICIALIZACIÓN DOCUMENTO Y BOTONES ====
$(function() {
  console.log('Document ready, initializing application...');
  
  try {
    if (!window.FileList || !window.FileReader) {
      window.alert('Tu navegador no soporta drag and drop. Usa Chrome/Firefox/IE > 10.');
      return;
    }
    
    console.log('Browser supports file operations');
    
    initializeModeler();
    createNewDiagram();
    
    // Register file drop after a short delay to ensure DOM is ready
    setTimeout(() => {
      const canvasContainer = $('#js-canvas');
      if (canvasContainer.length > 0) {
        registerFileDrop(canvasContainer, openDiagram);
        console.log('File drop registered successfully');
      } else {
        console.warn('Canvas container not found, skipping file drop registration');
      }
    }, 100);
    
    console.log('Basic initialization complete');
    
    // Handle file operations with new button structure
    $('.tool-btn').click(function(e) {
      e.preventDefault();
      const buttonText = $(this).text().trim();
      
      console.log('Button clicked:', buttonText);
      
      if (buttonText.includes('Nuevo')) {
        createNewDiagram();
      } else if (buttonText.includes('Abrir')) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.click();
        input.addEventListener('input', (evt) => {
          handleFiles(evt.target.files, openDiagram);
        });
      } else if (buttonText.includes('Guardar')) {
        saveDiagram((err, xml) => {
          if (err) return alert('Error guardando: ' + err.message);
          const filename = currentFile || 'diagram.bpmn';
          downloadFile(xml, filename);
          updateUI('Diagrama guardado.');
        });
      } else if (buttonText.includes('Deshacer')) {
        if (modeler && modeler.get('commandStack')) {
          modeler.get('commandStack').undo();
        }
      } else if (buttonText.includes('Rehacer')) {
        if (modeler && modeler.get('commandStack')) {
          modeler.get('commandStack').redo();
        }
      } else if (buttonText.includes('Validar')) {
        // Validation functionality
        console.log('Validation clicked');
      }
    });
    
    console.log('Button handlers attached');
    
    // Handle SVG export (could be added to toolbar)
    const exportSVG = () => {
      saveSVG((err, svg) => {
        if (err) return alert('Error exportando SVG: ' + err.message);
        const filename = 'diagram.svg';
        downloadFile(svg, filename, 'image/svg+xml');
        updateUI('SVG exportado.');
      });
    };
    
    // Add color functionality if needed
    const addColors = () => {
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
    };
    
    // Handle panel buttons
    $('.panel-btn').click(function(e) {
      e.preventDefault();
      const btn = $(this);
      const panel = btn.closest('.panel');
      
      if (btn.find('.fa-times').length) {
        // Close panel
        panel.fadeOut(300, function() {
          $(this).remove();
        });
      } else if (btn.find('.fa-expand').length) {
        // Maximize panel
        if (panel.css('width') === '100%') {
          panel.css({
            width: '',
            height: '',
            position: '',
            zIndex: ''
          });
        } else {
          panel.css({
            width: '100%',
            height: '100%',
            position: 'absolute',
            zIndex: '20'
          });
        }
      }
    });
    
    // Handle tabs
    $('.tab').click(function() {
      $(this).siblings().removeClass('active');
      $(this).addClass('active');
    });
    
    const exportArtifacts = debounce(() => {
      // Export functionality is now handled directly in button handlers
      // This function is kept for potential future use
      console.log('Export artifacts triggered');
    }, 500);
    
    if (modeler && modeler.on) modeler.on('commandStack.changed', exportArtifacts);
    updateUI('Aplicación híbrida lista ✔️');
    
    console.log('Application initialization complete');
    
  } catch (error) {
    console.error('Error during application initialization:', error);
    alert('Error inicializando la aplicación: ' + error.message);
  }
});

// ==== HELPERS ====

function setEncoded(link, name, data) {
  // This function is not needed in the new structure
  // The download functionality is handled directly in the button handlers
  console.log('setEncoded called:', name, data ? 'data available' : 'no data');
}

function setMultipleEncoded(link, name, data) {
  // This function is not needed in the new structure
  // The download functionality is handled directly in the button handlers
  console.log('setMultipleEncoded called:', name, data ? 'data available' : 'no data');
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
