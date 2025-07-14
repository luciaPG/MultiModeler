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

const moddle = new BpmnModdle({});
const container = $('.panel:first-child');
const body = $('body');
let modeler = null;
let currentFile = null;

function initializeModeler() {
  try {
    modeler = new MultiNotationModeler({
      container: '#js-canvas',
      moddleExtensions: {
        PPINOT: PPINOTModdle,
        RALph: RALphModdle
      }
    });
    
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
      try {
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
      } catch (error) {
        // Silent error handling for waypoint validation
      }
    });

    // Validate waypoints for connection previews and drops
    eventBus.on(['connectionPreview.shown', 'connection.preview', 'connection.move', 'drop.cleanup', 'drag.cleanup'], function(event) {
      try {
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
      } catch (error) {
        // Silent error handling for waypoint validation
      }
    });
    
    // Additional validation for element registry updates
    eventBus.on(['elementRegistry.added', 'elementRegistry.removed', 'elementRegistry.updated'], function(event) {
      try {
        if (event.element && event.element.waypoints) {
          event.element.waypoints = validateAndSanitizeWaypoints(event.element.waypoints);
        }
      } catch (error) {
        // Silent error handling for waypoint validation
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
          // Silent error handling for command stack validation
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
        // Silent error handling for waypoint validation
        return false;
      }
    });
    
    // Add global error handler for waypoint-related errors
    eventBus.on(['error'], function(event) {
      if (event.error && event.error.message && event.error.message.includes('Cannot read properties of undefined')) {
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
         // Silent error handling for drop validation
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
         // Silent error handling for gateway validation
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
  // Validate files array
  if (!files || !Array.isArray(files) || files.length === 0) {
    console.warn('No files provided to handleFiles');
    return;
  }

  let bpmn, cbpmnFile, ralphFile;
  
  // Validate each file before accessing its name property
  if (files[0] && files[0].name && files[0].name.includes('.bpmn')) {
    bpmn = files[0];
    if (files[1] && files[1].name && files[1].name.includes('.cbpmn')) cbpmnFile = files[1];
    else if (files[1] && files[1].name) window.alert('El segundo archivo no es cbpmn');
    if (files[2] && files[2].name && files[2].name.includes('.ralph')) ralphFile = files[2];
    else if (files[2] && files[2].name) window.alert('El tercer archivo no es ralph');
  } else if (files[1] && files[1].name && files[1].name.includes('.bpmn')) {
    bpmn = files[1];
    if (files[0] && files[0].name && files[0].name.includes('.cbpmn')) cbpmnFile = files[0];
    else if (files[0] && files[0].name) window.alert('El segundo archivo no es cbpmn');
    if (files[2] && files[2].name && files[2].name.includes('.ralph')) ralphFile = files[2];
    else if (files[2] && files[2].name) window.alert('El tercer archivo no es ralph');
  } else if (files[2] && files[2].name && files[2].name.includes('.bpmn')) {
    bpmn = files[2];
    if (files[0] && files[0].name && files[0].name.includes('.cbpmn')) cbpmnFile = files[0];
    else if (files[0] && files[0].name) window.alert('El segundo archivo no es cbpmn');
    if (files[1] && files[1].name && files[1].name.includes('.ralph')) ralphFile = files[1];
    else if (files[1] && files[1].name) window.alert('El tercer archivo no es ralph');
  } else if (files[0] && files[0].name && files[0].name.includes('.cbpmn')) {
    cbpmnFile = files[0];
  } else if (files[0] && files[0].name && files[0].name.includes('.ralph')) {
    ralphFile = files[0];
  }

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
    
    // Only process if there are actual files
    if (files && files.length > 0) {
      handleFiles(files, callback);
    }
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
  try {
    if (!window.FileList || !window.FileReader) {
      window.alert('Tu navegador no soporta drag and drop. Usa Chrome/Firefox/IE > 10.');
      return;
    }
    
    // Initialize panels and modeler
    initializePanelsAndModeler();
    
    // Handle file operations with new button structure
    $('.tool-btn').click(function(e) {
      e.preventDefault();
      const buttonText = $(this).text().trim();
      
      if (buttonText.includes('Nuevo')) {
        createNewDiagram();
      } else if (buttonText.includes('Abrir')) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.click();
        input.addEventListener('input', (evt) => {
          if (evt.target.files && evt.target.files.length > 0) {
            handleFiles(evt.target.files, openDiagram);
          }
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
      }
    });
    
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
        if (evt.target.files && evt.target.files.length > 0) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (modeler.setColors) modeler.setColors(JSON.parse(e.target.result));
          };
          reader.readAsText(evt.target.files[0]);
        }
      });
    };
    
    // Handle panel buttons
    $('.panel-btn').click(function(e) {
      e.preventDefault();
      const btn = $(this);
      const panel = btn.closest('.panel');
      
      if (btn.find('.fa-times').length) {
        // Close panel - preserve modeler state instead of removing
        panel.fadeOut(300, function() {
          // Instead of removing, hide the panel and preserve the modeler
          $(this).addClass('closed');
          $(this).hide();
          
          // Keep BPMN modeler active even when panel is hidden
          setTimeout(() => {
            keepBpmnModelerActive();
          }, 200);
          
          // Reorganize remaining panels
          restoreSharedLayout();
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
    }, 500);
    
    if (modeler && modeler.on) modeler.on('commandStack.changed', exportArtifacts);
    updateUI('Aplicación híbrida lista ✔️');
    
  } catch (error) {
    console.error('Error during application initialization:', error);
    alert('Error inicializando la aplicación: ' + error.message);
  }
});

// ==== PANEL INITIALIZATION ====

async function initializePanelsAndModeler() {
  try {
    // Wait for PanelLoader to be available
    if (typeof PanelLoader === 'undefined') {
      setTimeout(initializePanelsAndModeler, 100);
      return;
    }
    
    // Create panel loader instance
    const panelLoader = new PanelLoader();
    window.panelLoader = panelLoader; // Make it globally available
    
    // Get container
    const container = document.getElementById('panel-container');
    
    if (!container) {
      return;
    }
    
    // Load BPMN panel
    const bpmnPanel = await panelLoader.createPanel('bpmn', container);
    
    if (!bpmnPanel) {
      return;
    }
    
    // Load PPINOT panel
    const ppinotPanel = await panelLoader.createPanel('ppinot', container);
    
    if (!ppinotPanel) {
      return;
    }
    
    // Apply initial layout
    container.style.flexDirection = 'row';
    container.style.display = 'flex';
    container.style.gap = '8px';
    bpmnPanel.style.flex = '2';
    ppinotPanel.style.flex = '1';
    
    // Initialize modeler after panels are loaded
    setTimeout(() => {
      try {
        initializeModeler();
        createNewDiagram();
        
        // Register file drop
        const canvasContainer = $('#js-canvas');
        if (canvasContainer.length > 0) {
          registerFileDrop(canvasContainer, openDiagram);
        }
      } catch (error) {
        console.error('Error initializing modeler:', error);
      }
    }, 200);
    
    // Initialize layout events
    initializeLayoutEvents();
    
    // Initialize restore events
    initializeRestoreEvents();
    
    // Initialize drag and drop functionality
    initializeDragAndDrop();
    
    // Add window resize listener
    window.addEventListener('resize', () => {
      if (window.bpmnModeler) {
        setTimeout(() => {
          try {
            const canvas = window.bpmnModeler.get('canvas');
            if (canvas && typeof canvas.resized === 'function') {
              canvas.resized();
            }
          } catch (error) {
            console.warn('Error resizing canvas:', error);
          }
        }, 50);
      }
    });
    
    // Initialize horizontal layout by default
    setTimeout(() => {
      const horizontalBtn = document.querySelector('.layout-btn[data-layout="horizontal"]');
      if (horizontalBtn) {
        horizontalBtn.click();
      }
    }, 500);
    
  } catch (error) {
    console.error('Error in initializePanelsAndModeler:', error);
  }
}

// Initialize layout events
function initializeLayoutEvents() {
  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const layout = this.getAttribute('data-layout');
      
      // Remove active class from all buttons
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      // Add active to clicked button
      this.classList.add('active');
      
      const panels = document.querySelectorAll('.panel:not(.closed)');
      
      if (panels.length === 0) {
        console.log('No hay paneles disponibles para cambiar el layout');
        return;
      }
      
      // Reset panel styles
      panels.forEach(panel => {
        if (panel && panel.parentNode) {
          panel.style.width = '';
          panel.style.height = '';
          panel.style.flex = '';
          panel.style.transform = '';
          panel.setAttribute('data-x', '0');
          panel.setAttribute('data-y', '0');
        }
      });
      
      // Apply layout
      const container = document.getElementById('panel-container');
      if (layout === 'horizontal' && panels.length >= 2) {
        container.style.flexDirection = 'row';
        if (panels[0] && panels[0].parentNode) panels[0].style.flex = '2';
        if (panels[1] && panels[1].parentNode) panels[1].style.flex = '1';
      } else if (layout === 'vertical' && panels.length >= 2) {
        container.style.flexDirection = 'column';
        if (panels[0] && panels[0].parentNode) panels[0].style.flex = '2';
        if (panels[1] && panels[1].parentNode) panels[1].style.flex = '1';
      } else if (layout === 'grid' && panels.length >= 2) {
        container.style.flexDirection = 'row';
        panels.forEach(panel => {
          if (panel && panel.parentNode) {
            panel.style.flex = '1';
          }
        });
      }
      
      // Resize canvas and keep modeler active
      setTimeout(() => {
        if (window.bpmnModeler) {
          try {
            const canvas = window.bpmnModeler.get('canvas');
            if (canvas && typeof canvas.resized === 'function') {
              canvas.resized();
            }
            
            // Mantener el modeler activo después de cambiar layout
            setTimeout(() => {
              keepBpmnModelerActive();
            }, 100);
          } catch (error) {
            console.warn('Error resizing canvas:', error);
          }
        }
      }, 50);
    });
  });
}

// Función para manejar el cierre de paneles manteniendo el modeler activo
function handlePanelClose(panel) {
  // Ocultar el panel
  panel.classList.add('closed');
  panel.style.display = 'none';
  
  // Mantener el modeler de BPMN activo incluso cuando se cierra el panel
  setTimeout(() => {
    keepBpmnModelerActive();
  }, 100);
  
  // Reorganizar los paneles restantes
  restoreSharedLayout();
}

// Initialize restore events
function initializeRestoreEvents() {
  document.addEventListener('click', function(e) {
    if (e.target.closest('.restore-btn')) {
      const btn = e.target.closest('.restore-btn');
      const panelType = btn.getAttribute('data-panel');
      const container = document.getElementById('panel-container');
      
      if (panelType === 'bpmn') {
        let panel = document.getElementById('bpmn-panel');
        
        if (!panel) {
          // Create new BPMN panel
          if (window.panelLoader) {
            window.panelLoader.createPanel('bpmn', container).then(panel => {
              if (panel) {
                // Restore BPMN canvas if preserved
                if (window._preservedCanvas) {
                  restoreBpmnCanvas();
                }
                restoreSharedLayout();
              }
            });
          }
        } else if (panel.classList.contains('closed')) {
          // Show existing panel
          panel.style.display = '';
          panel.classList.remove('closed', 'minimized', 'maximized');
          panel.style.width = '';
          panel.style.height = '';
          panel.style.position = '';
          panel.style.zIndex = '';
          panel.style.flex = '';
          panel.setAttribute('data-x', '0');
          panel.setAttribute('data-y', '0');
          
          // Reinitialize BPMN modeler when panel is restored
          setTimeout(() => {
            try {
              // Check if modeler needs to be reinitialized
              if (window.bpmnModeler) {
                const canvas = window.bpmnModeler.get('canvas');
                if (canvas) {
                  // Force canvas resize and modeler reactivation
                  canvas.resized();
                  keepBpmnModelerActive();
                  
                  // Re-register file drop functionality
                  const canvasContainer = $('#js-canvas');
                  if (canvasContainer.length > 0) {
                    registerFileDrop(canvasContainer, openDiagram);
                  }
                } else {
                  // Modeler is broken, reinitialize it
                  initializeModeler();
                  createNewDiagram();
                }
              } else {
                // No modeler exists, create new one
                initializeModeler();
                createNewDiagram();
              }
                    } catch (error) {
          // Try to reinitialize completely
          try {
            initializeModeler();
            createNewDiagram();
          } catch (reinitError) {
            console.error('Failed to reinitialize modeler:', reinitError);
          }
        }
          }, 300);
          
          restoreSharedLayout();
        }
      } else if (panelType === 'ppinot') {
        let panel = document.getElementById('ppinot-panel');
        
        if (!panel) {
          // Create new PPINOT panel
          if (window.panelLoader) {
            window.panelLoader.createPanel('ppinot', container).then(panel => {
              if (panel) {
                restoreSharedLayout();
              }
            });
          }
        } else if (panel.classList.contains('closed')) {
          // Show existing panel
          panel.style.display = '';
          panel.classList.remove('closed', 'minimized', 'maximized');
          panel.style.width = '';
          panel.style.height = '';
          panel.style.position = '';
          panel.style.zIndex = '';
          panel.style.flex = '';
          panel.setAttribute('data-x', '0');
          panel.setAttribute('data-y', '0');
          
          restoreSharedLayout();
        }
      }
    }
  });
  
  // Event listener para botones de cerrar panel
  document.addEventListener('click', function(e) {
    if (e.target.closest('.panel-btn') && e.target.closest('.panel-btn').classList.contains('close-btn')) {
      const panel = e.target.closest('.panel');
      if (panel) {
        handlePanelClose(panel);
      }
    }
  });
}

// Helper functions for panel restoration
function restoreBpmnCanvas() {
  const canvas = document.getElementById('js-canvas');
  if (canvas && window._preservedCanvas) {
    canvas.innerHTML = window._preservedCanvas.innerHTML;
    canvas.className = window._preservedCanvas.className;
    
    if (window.bpmnModeler) {
      const canvasService = window.bpmnModeler.get('canvas');
      if (canvasService && canvasService._container) {
        canvasService._container = canvas;
      }
      
      setTimeout(() => {
        try {
          canvasService.resized();
          keepBpmnModelerActive();
          
          // Re-register file drop functionality
          const canvasContainer = $('#js-canvas');
          if (canvasContainer.length > 0) {
            registerFileDrop(canvasContainer, openDiagram);
          }
        } catch (error) {
          // If canvas restoration fails, try to reinitialize modeler
          try {
            initializeModeler();
            createNewDiagram();
          } catch (reinitError) {
            console.error('Failed to reinitialize modeler after canvas error:', reinitError);
          }
        }
      }, 200);
    }
  }
}

function restoreSharedLayout() {
  const container = document.getElementById('panel-container');
  const panels = Array.from(document.querySelectorAll('.panel:not(.closed)'));
  
  if (panels.length === 0) {
    return;
  }
  
  // Reset all panels to default state
  panels.forEach((panel, index) => {
    
    // Reset all styles
    panel.style.transform = '';
    panel.style.position = '';
    panel.style.zIndex = '';
    panel.style.flex = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.style.top = '';
    panel.style.left = '';
    panel.style.right = '';
    panel.style.bottom = '';
    panel.style.margin = '';
    panel.style.padding = '';
    
    // Reset data attributes
    panel.setAttribute('data-x', '0');
    panel.setAttribute('data-y', '0');
    
    // Ensure panel is visible and properly positioned
    panel.style.display = '';
    panel.classList.remove('closed', 'minimized', 'maximized');
  });
  
  // Configure container
  container.style.display = 'flex';
  container.style.gap = '8px';
  container.style.alignItems = 'stretch';
  container.style.height = '100%';
  
  // Keep BPMN modeler active after layout changes
  setTimeout(() => {
    keepBpmnModelerActive();
    
    // Also re-register file drop functionality
    const canvasContainer = $('#js-canvas');
    if (canvasContainer.length > 0) {
      try {
        registerFileDrop(canvasContainer, openDiagram);
              } catch (e) {
          // Silent error handling
        }
      }
    }, 300);
  
  if (panels.length === 1) {
    // Single panel takes full width and height
    container.style.flexDirection = 'row';
    panels[0].style.flex = '1';
    panels[0].style.minWidth = '300px';
    panels[0].style.margin = '0';
    panels[0].style.height = '100%';
  } else if (panels.length === 2) {
    // Two panels side by side with 2:1 ratio
    container.style.flexDirection = 'row';
    panels[0].style.flex = '2';
    panels[1].style.flex = '1';
    panels.forEach(panel => {
      panel.style.minWidth = '300px';
      panel.style.margin = '0';
    });
  } else {
    // Multiple panels - arrange horizontally with equal width
    container.style.flexDirection = 'row';
    panels.forEach(panel => {
      panel.style.flex = '1';
      panel.style.minWidth = '250px';
      panel.style.margin = '0';
    });
  }
  
  // Ensure all panels are at the same height level
  panels.forEach(panel => {
    panel.style.alignSelf = 'stretch';
    panel.style.height = '100%';
  });
  
  // Reorder panels in the container to ensure proper layout
  console.log('🔄 Reordenando paneles en el contenedor...');
  panels.forEach((panel, index) => {
    if (panel.parentNode) {
      container.appendChild(panel);
      console.log(`📦 Panel ${index + 1} (${panel.id}) movido al contenedor`);
    }
  });
  
  // Force a reflow
  container.offsetHeight;
  
  // Resize canvas after layout changes
  setTimeout(() => {
    console.log('🎨 Redimensionando canvas...');
    resizeCanvas();
    
    // Mantener el modeler de BPMN activo después de reorganizar
    setTimeout(() => {
      keepBpmnModelerActive();
    }, 150);
  }, 100);
  
  console.log('✅ Layout restaurado exitosamente');
}

// Initialize drag and drop functionality
function initializeDragAndDrop() {
  if (typeof interact === 'undefined') {
    console.warn('Interact.js no está disponible');
    return;
  }

  // Make panel headers draggable
  interact('.panel-header').draggable({
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true
      })
    ],
    autoScroll: true,
    listeners: {
      start(event) {
        const panel = event.target.closest('.panel');
        panel.style.zIndex = 10;
        panel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        toggleSnapZones(true);
      },
      move(event) {
        const panel = event.target.closest('.panel');
        const x = (parseFloat(panel.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(panel.getAttribute('data-y')) || 0) + event.dy;
        
        panel.style.transform = `translate(${x}px, ${y}px)`;
        panel.setAttribute('data-x', x);
        panel.setAttribute('data-y', y);
        
        const snapPosition = getSnapPosition(panel, x, y);
        highlightSnapZone(snapPosition);
      },
      end(event) {
        const panel = event.target.closest('.panel');
        const x = parseFloat(panel.getAttribute('data-x')) || 0;
        const y = parseFloat(panel.getAttribute('data-y')) || 0;
        
        const snapPosition = getSnapPosition(panel, x, y);
        applySnapAndReorganize(panel, snapPosition);
        
        toggleSnapZones(false);
        panel.style.zIndex = '';
        panel.style.boxShadow = '';
      }
    }
  });

  // Make resize handles draggable
  interact('.panel-resize-handle').draggable({
    modifiers: [
      interact.modifiers.restrictEdges({
        outer: 'parent',
        endOnly: true
      }),
      interact.modifiers.restrictSize({
        min: { width: 300, height: 200 }
      })
    ],
    listeners: {
      start(event) {
        const panel = event.target.closest('.panel');
        const handle = event.target;
        const container = panel.parentElement;
        const panels = Array.from(container.children).filter(el => el.classList.contains('panel'));
        
        handle.classList.add('resizing');
        
        panel._initialWidth = panel.offsetWidth;
        panel._initialHeight = panel.offsetHeight;
        panel._initialX = event.clientX;
        panel._initialY = event.clientY;
        
        panels.forEach(p => {
          p._initialWidth = p.offsetWidth;
          p._initialHeight = p.offsetHeight;
        });
        
        const panelIndex = panels.indexOf(panel);
        panel._adjacentPanels = {
          left: panelIndex > 0 ? panels[panelIndex - 1] : null,
          right: panelIndex < panels.length - 1 ? panels[panelIndex + 1] : null,
          top: panelIndex > 0 ? panels[panelIndex - 1] : null,
          bottom: panelIndex < panels.length - 1 ? panels[panelIndex + 1] : null
        };
        
        panel._isVerticalLayout = container.style.flexDirection === 'column';
      },
      move(event) {
        const panel = event.target.closest('.panel');
        const handle = event.target;
        const deltaX = event.clientX - panel._initialX;
        const deltaY = event.clientY - panel._initialY;
        
        if (panel._isVerticalLayout) {
          if (handle.classList.contains('bottom')) {
            const newHeight = Math.max(200, panel._initialHeight + deltaY);
            const heightDiff = newHeight - panel._initialHeight;
            
            panel.style.height = newHeight + 'px';
            panel.style.flex = 'none';
            
            if (panel._adjacentPanels.bottom) {
              const bottomPanel = panel._adjacentPanels.bottom;
              const newBottomHeight = Math.max(200, bottomPanel._initialHeight - heightDiff);
              bottomPanel.style.height = newBottomHeight + 'px';
              bottomPanel.style.flex = 'none';
            }
          } else if (handle.classList.contains('top')) {
            const newHeight = Math.max(200, panel._initialHeight - deltaY);
            const heightDiff = panel._initialHeight - newHeight;
            
            panel.style.height = newHeight + 'px';
            panel.style.flex = 'none';
            
            if (panel._adjacentPanels.top) {
              const topPanel = panel._adjacentPanels.top;
              const newTopHeight = Math.max(200, topPanel._initialHeight + heightDiff);
              topPanel.style.height = newTopHeight + 'px';
              topPanel.style.flex = 'none';
            }
          }
        } else {
          if (handle.classList.contains('right')) {
            const newWidth = Math.max(300, panel._initialWidth + deltaX);
            const widthDiff = newWidth - panel._initialWidth;
            
            panel.style.width = newWidth + 'px';
            panel.style.flex = 'none';
            
            if (panel._adjacentPanels.right) {
              const rightPanel = panel._adjacentPanels.right;
              const newRightWidth = Math.max(300, rightPanel._initialWidth - widthDiff);
              rightPanel.style.width = newRightWidth + 'px';
              rightPanel.style.flex = 'none';
            }
          } else if (handle.classList.contains('left')) {
            const newWidth = Math.max(300, panel._initialWidth - deltaX);
            const widthDiff = panel._initialWidth - newWidth;
            
            panel.style.width = newWidth + 'px';
            panel.style.flex = 'none';
            
            if (panel._adjacentPanels.left) {
              const leftPanel = panel._adjacentPanels.left;
              const newLeftWidth = Math.max(300, leftPanel._initialWidth + widthDiff);
              leftPanel.style.width = newLeftWidth + 'px';
              leftPanel.style.flex = 'none';
            }
          }
        }
      },
      end(event) {
        const handle = event.target;
        handle.classList.remove('resizing');
        resizeCanvas();
      }
    }
  });
}

// Helper functions for drag and drop
function toggleSnapZones(show) {
  const snapZones = document.getElementById('snap-zones');
  if (snapZones) {
    if (show) {
      snapZones.classList.add('visible');
    } else {
      snapZones.classList.remove('visible');
      snapZones.querySelectorAll('.snap-zone').forEach(zone => {
        zone.classList.remove('active');
      });
    }
  }
}

function highlightSnapZone(snapPosition) {
  const snapZones = document.getElementById('snap-zones');
  if (snapZones) {
    snapZones.querySelectorAll('.snap-zone').forEach(zone => {
      zone.classList.remove('active');
    });
    
    const activeZone = snapZones.querySelector(`[data-zone="${snapPosition.zone}"]`);
    if (activeZone) {
      activeZone.classList.add('active');
    }
  }
}

function getSnapPosition(panel, x, y) {
  const container = document.getElementById('panel-container');
  const containerRect = container.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  
  const snapPositions = [
    { x: 0, y: 0, name: 'left', zone: 'left' },
    { x: containerRect.width - panelRect.width, y: 0, name: 'right', zone: 'right' },
    { x: 0, y: 0, name: 'top', zone: 'top' },
    { x: 0, y: containerRect.height - panelRect.height, name: 'bottom', zone: 'bottom' }
  ];
  
  let closestSnap = snapPositions[0];
  let minDistance = Infinity;
  
  snapPositions.forEach(snap => {
    const distance = Math.sqrt(
      Math.pow(x - snap.x, 2) + Math.pow(y - snap.y, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestSnap = snap;
    }
  });
  
  return closestSnap;
}

function applySnapAndReorganize(panel, snapPosition) {
  reorganizePanelsForSnap(panel, snapPosition);
}

function reorganizePanelsForSnap(panel, snapPosition) {
  const container = document.getElementById('panel-container');
  const visiblePanels = Array.from(document.querySelectorAll('.panel:not(.closed)'));
  const zone = snapPosition.zone;
  
  visiblePanels.forEach(p => {
    p.style.transform = '';
    p.setAttribute('data-x', '0');
    p.setAttribute('data-y', '0');
  });
  
  let panelOrder = [];
  
  if (visiblePanels.length === 1) {
    panelOrder = [panel];
    container.style.flexDirection = 'row';
    panel.style.flex = '1';
  } else if (zone === 'left') {
    panelOrder = [panel, ...visiblePanels.filter(p => p !== panel)];
    container.style.flexDirection = 'row';
    panel.style.flex = '2';
    visiblePanels.filter(p => p !== panel).forEach(p => p.style.flex = '1');
  } else if (zone === 'right') {
    panelOrder = [...visiblePanels.filter(p => p !== panel), panel];
    container.style.flexDirection = 'row';
    panel.style.flex = '2';
    visiblePanels.filter(p => p !== panel).forEach(p => p.style.flex = '1');
  } else if (zone === 'top') {
    panelOrder = [panel, ...visiblePanels.filter(p => p !== panel)];
    container.style.flexDirection = 'column';
    panel.style.flex = '2';
    visiblePanels.filter(p => p !== panel).forEach(p => p.style.flex = '1');
  } else if (zone === 'bottom') {
    panelOrder = [...visiblePanels.filter(p => p !== panel), panel];
    container.style.flexDirection = 'column';
    panel.style.flex = '2';
    visiblePanels.filter(p => p !== panel).forEach(p => p.style.flex = '1');
  }
  
  container.style.display = 'flex';
  container.style.gap = '8px';
  
  if (panelOrder.length > 0) {
    panelOrder.forEach((p, index) => {
      if (p.parentNode) {
        container.appendChild(p);
      }
    });
  }
  
  setTimeout(() => {
    resizeCanvas();
    
    // Mantener el modeler de BPMN activo después de reorganizar por snap
    setTimeout(() => {
      keepBpmnModelerActive();
    }, 300);
  }, 100);
}

// ==== HELPERS ====

function setEncoded(link, name, data) {
  // This function is not needed in the new structure
  // The download functionality is handled directly in the button handlers
}

function setMultipleEncoded(link, name, data) {
  // This function is not needed in the new structure
  // The download functionality is handled directly in the button handlers
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

// Función para mantener el modeler de BPMN activo y editable
function keepBpmnModelerActive() {
  if (window.bpmnModeler) {
    try {
      // Asegurar que el modeler esté activo
      const canvas = window.bpmnModeler.get('canvas');
      
      if (canvas && typeof canvas.resized === 'function') {
        // Solo hacer resize si es necesario
        try {
          canvas.resized();
        } catch (e) {
          // Silent error handling
        }
      }
      
      // Solo activar eventos si el modeler está en un estado válido
      const eventBus = window.bpmnModeler.get('eventBus');
      if (eventBus && typeof eventBus.fire === 'function') {
        try {
          // Solo disparar eventos básicos para mantener la funcionalidad
          eventBus.fire('canvas.resized');
        } catch (e) {
          // Silent error handling
        }
      }
      
      // Re-register file drop functionality if needed
      const canvasContainer = $('#js-canvas');
      if (canvasContainer.length > 0) {
        try {
          registerFileDrop(canvasContainer, openDiagram);
        } catch (e) {
          // Silent error handling
        }
      }
    } catch (error) {
      console.warn('Error manteniendo modeler activo:', error);
    }
  }
}

// Función para redibujar el canvas BPMN
function resizeCanvas() {
  if (window.bpmnModeler) {
    setTimeout(() => {
      try {
        const canvas = window.bpmnModeler.get('canvas');
        if (canvas && typeof canvas.resized === 'function') {
          canvas.resized();
          
          // Asegurar que el modeler permanezca editable
          keepBpmnModelerActive();
          
          // Re-register file drop functionality
          const canvasContainer = $('#js-canvas');
          if (canvasContainer.length > 0) {
            registerFileDrop(canvasContainer, openDiagram);
          }
        }
              } catch (error) {
          // If canvas resize fails, try to reinitialize modeler
          try {
            initializeModeler();
            createNewDiagram();
          } catch (reinitError) {
            console.error('Failed to reinitialize modeler after resize error:', reinitError);
          }
        }
    }, 100);
  }
}

// Utilidad debounce
function debounce(fn, timeout) {
  let timer;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, timeout);
  };
}
