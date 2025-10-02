import inherits from 'inherits';

import {
  pick,
  assign
} from 'min-dash';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';
import { getServiceRegistry } from '../../../ui/core/ServiceRegistry.js';

import {
  add as collectionAdd,
  remove as collectionRemove
} from 'diagram-js/lib/util/Collections';

import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExternalLabel } from './Types';

/**
 * A handler responsible for updating the PPINOT element's businessObject
 * once changes on the diagram happen.
 */
export default function PPINOTUpdater(eventBus, modeling, bpmnjs) {

  CommandInterceptor.call(this, eventBus);

  var elementRegistry;
  try {
    elementRegistry = bpmnjs && bpmnjs.get && bpmnjs.get('elementRegistry');
  } catch (e) {}

  // Initialize PPINOTElements array if it doesn't exist
  if (!bpmnjs._PPINOTElements) {
    bpmnjs._PPINOTElements = [];
  }

  // Helper function to initialize arrays on parent containers
  function initializeParentArrays(parent) {
    if (!parent || !parent.businessObject) {
      return;
    }

    var parentBO = parent.businessObject;
    
    // Handle pools specially
    if (is(parent, 'bpmn:Participant') && parentBO.processRef) {
      var process = parentBO.processRef;
      // Initialize all necessary arrays that BpmnUpdater expects
      if (!process.flowElements) {
        process.flowElements = [];
      }
      if (!process.artifacts) {
        process.artifacts = [];
      }
      if (!process.children) {
        process.children = [];
      }
    } else if (is(parent, 'bpmn:Collaboration')) {
      // For collaboration, ensure arrays exist
      if (!parentBO.participants) {
        parentBO.participants = [];
      }
      if (!parentBO.messageFlows) {
        parentBO.messageFlows = [];
      }
      if (!parentBO.artifacts) {
        parentBO.artifacts = [];
      }
    } else if (is(parent, 'bpmn:Process')) {
      // For direct process containers
      if (!parentBO.flowElements) {
        parentBO.flowElements = [];
      }
      if (!parentBO.artifacts) {
        parentBO.artifacts = [];
      }
    }
  }

  // Listen for element replacement events to handle labels
  eventBus.on('shape.replace', function(event) {
    const oldShape = event.oldShape;
    const newShape = event.newShape;
    
    // If the old shape had a label and the new shape should have one too
    if (oldShape.label && isExternalLabel(newShape)) {
      // Ensure the new shape has the label reference
      newShape.label = oldShape.label;
      newShape._hasExternalLabel = true;
      
      // Update the label's target reference
      if (oldShape.label.labelTarget) {
        oldShape.label.labelTarget = newShape;
      }
    }
  });

  // Listen for element removal to sync with PPI list
  eventBus.on('element.removed', function(event) {
    const element = event.element;
    
    
    if (element && isPPINOT(element)) {
      
      // Try to remove from PPI list
      this.tryRemoveFromPPIList(element.id);
    } else {
    }
  });

  // Also listen for shape.delete command execution to catch keyboard deletions
  this.executed('shape.delete', function(event) {
    console.log('🔥 [PPINOTUpdater] shape.delete interceptado:', event);
    const context = event.context;
    const elements = context.elements || [context.shape];
    
    console.log('📋 [PPINOTUpdater] Elementos a procesar:', elements);
    elements.forEach(element => {
      console.log('🔍 [PPINOTUpdater] Procesando elemento:', element && element.id, 'isPPINOT:', isPPINOT(element));
      if (element && isPPINOT(element)) {
        console.log('✅ [PPINOTUpdater] Elemento PPINOT detectado, removiendo de lista:', element.id);
        
        // Try to remove from PPI list
        const sr = getServiceRegistry && getServiceRegistry();
        // CORREGIDO: Buscar tanto PPIManagerInstance como PPIManager
        let ppiMgr = sr && (sr.get('PPIManagerInstance') || sr.get('PPIManager'));
        
        // Fallback: usar adapter si no se encuentra en registry
        if (!ppiMgr && this.adapter && this.adapter.getPPIManager) {
          ppiMgr = this.adapter.getPPIManager();
        }
        
        console.log('🎯 [PPINOTUpdater] PPIManager obtenido:', !!ppiMgr, 'tipo:', ppiMgr && ppiMgr.constructor && ppiMgr.constructor.name);
        
        if (ppiMgr && ppiMgr.removePPIFromList) {
          console.log('🗑️ [PPINOTUpdater] Llamando removePPIFromList para:', element.id);
          ppiMgr.removePPIFromList(element.id);
        } else {
          console.error('❌ [PPINOTUpdater] No se pudo obtener PPIManager válido');
        }
      }
    });
  });

  function updatePPINOTElement(e) {
    var context = e.context,
        shape = context.shape,
        businessObject = shape.businessObject;

    if (!isPPINOT(shape)) {
      return;
    }

    var parent = shape.parent;

    // Initialize parent arrays FIRST to prevent BpmnUpdater errors
    initializeParentArrays(parent);

    // Ensure PPINOTElements exists
    var PPINOTElements = bpmnjs._PPINOTElements = bpmnjs._PPINOTElements || [];

    // make sure element is added / removed from bpmnjs.PPINOTElements
    if (!parent) {
      collectionRemove(PPINOTElements, businessObject);
    } else {
      collectionAdd(PPINOTElements, businessObject);
    }

    // save PPINOT element position
    assign(businessObject, pick(shape, [ 'x', 'y' ]));
    
    // Special handling for pool creation
    if (is(parent, 'bpmn:Participant') || is(parent, 'bpmn:Collaboration')) {
      // Ensure proper containment for PPINOT elements in pools
      var process = parent.businessObject.processRef;
      if (process) {
        // Initialize children array if it doesn't exist
        if (!process.children) {
          process.children = [];
        }
        
        // If process exists, ensure PPINOT element is in the process
        if (businessObject.$parent !== process) {
          // Remove from current parent
          if (businessObject.$parent && businessObject.$parent.children) {
            collectionRemove(businessObject.$parent.children, businessObject);
          }
          
          // Add to process
          process.children.push(businessObject);
          businessObject.$parent = process;
        }
      }
    }
  }

  function updatePPINOTConnection(e) {
    var context = e.context,
        connection = context.connection,
        source = connection.source,
        target = context.target || connection.target,
        businessObject = connection.businessObject;

    if (!businessObject || !source || !target) {
      // Do not fail hard; avoid triggering deletion cascades
      return true;
    }

    var parent = connection.parent;
    
    // Initialize parent arrays FIRST to prevent BpmnUpdater errors
    initializeParentArrays(parent);
    
    // Ensure PPINOTElements exists and is an array
    var PPINOTElements = bpmnjs._PPINOTElements = bpmnjs._PPINOTElements || [];

    // Check for existing similar connections
    var existingSimilarConnection = PPINOTElements.find(function(element) {
      return element && element.type === businessObject.type &&
             element.source === source.id &&
             element.target === target.id;
    });

    // If we're creating a new connection and a similar one exists, prevent the duplicate
    if (e.command === 'connection.create' && existingSimilarConnection) {
      return false;
    }

    // make sure element is added / removed from bpmnjs.PPINOTElements
    if (!parent) {
      collectionRemove(PPINOTElements, businessObject);
    } else if (!existingSimilarConnection) {
      // Only add if no similar connection exists
      collectionAdd(PPINOTElements, businessObject);
    }

    // Validate and filter waypoints; if invalid or <2, recompute a safe fallback
    (function ensureValidWaypoints() {
      var current = Array.isArray(connection.waypoints) ? connection.waypoints : [];
      var valid = current.filter(function(p) {
        return p && typeof p.x === 'number' && typeof p.y === 'number' &&
               !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y);
      });

      if (valid.length < 2) {
        var sx = source.x + (source.width || 0) / 2;
        var sy = source.y + (source.height || 0) / 2;
        var tx = target.x + (target.width || 0) / 2;
        var ty = target.y + (target.height || 0) / 2;

        var recomputed;
        if (connection.type === 'PPINOT:GroupedBy') {
          var midY = (sy + ty) / 2;
          recomputed = [ { x: sx, y: sy }, { x: sx, y: midY }, { x: tx, y: midY }, { x: tx, y: ty } ];
        } else {
          recomputed = [ { x: sx, y: sy }, { x: tx, y: ty } ];
        }

        connection.waypoints = recomputed;
        assign(businessObject, { waypoints: recomputed });
        return;
      }

      // Persist filtered valid waypoints
      assign(businessObject, {
        waypoints: valid.map(function(p) { return { x: p.x, y: p.y }; })
      });
      connection.waypoints = valid;
    })();

    // update source and target references
    if (source && target) {
      assign(businessObject, {
        source: source.id,
        target: target.id
      });
    }

    return true;
  }

  // Handle parent updates directly
  eventBus.on('element.updateParent', function(event) {
    var context = event.context;
    var element = context.element;
    var oldParent = context.oldParent;
    var newParent = context.newParent;
    
    if (!isPPINOT(element)) {
      return;
    }
    
    // Initialize arrays for both old and new parents
    initializeParentArrays(oldParent);
    initializeParentArrays(newParent);
    
    var businessObject = element.businessObject;
    
    // Handle parent change
    if (newParent) {
      var newParentBO = newParent.businessObject;
      
      // Handle pools specially
      if (is(newParent, 'bpmn:Participant') && newParentBO.processRef) {
        newParentBO = newParentBO.processRef;
      }
      
      // Ensure children array exists
      if (!newParentBO.children) {
        newParentBO.children = [];
      }
      
      // Remove from old parent
      if (businessObject.$parent && businessObject.$parent.children) {
        collectionRemove(businessObject.$parent.children, businessObject);
      }
      
      // Add to new parent
      newParentBO.children.push(businessObject);
      businessObject.$parent = newParentBO;
    } else if (oldParent && businessObject.$parent) {
      // Remove from old parent only
      if (businessObject.$parent.children) {
        collectionRemove(businessObject.$parent.children, businessObject);
      }
      businessObject.$parent = null;
    }

    // Disparar guardado unificado de PPINOT tras cambio de parent
    try {
      if (typeof getServiceRegistry === 'function') {
        const sr = getServiceRegistry();
        const ppiCore = sr && sr.get && sr.get('PPICore');
        if (ppiCore && typeof ppiCore.debouncedSavePPINOTElements === 'function') {
          ppiCore.debouncedSavePPINOTElements();
        }
      }
    } catch (_) { /* no-op */ }
  });

  this.executed([
    'shape.create',
    'shape.move',
    'shape.delete'
  ], ifPPINOTElement(updatePPINOTElement));

  this.reverted([
    'shape.create',
    'shape.move',
    'shape.delete'
  ], ifPPINOTElement(updatePPINOTElement));

  this.executed([
    'connection.create',
    'connection.reconnectStart',
    'connection.reconnectEnd',
    'connection.updateWaypoints',
    'connection.delete',
    'connection.layout',
    'connection.move'
  ], ifPPINOTElement(updatePPINOTConnection));

  this.reverted([
    'connection.create',
    'connection.reconnectStart',
    'connection.reconnectEnd',
    'connection.updateWaypoints',
    'connection.delete',
    'connection.layout',
    'connection.move'
  ], ifPPINOTElement(updatePPINOTConnection));


  /**
   * When morphing a Process into a Collaboration or vice-versa,
   * make sure that the existing PPINOT elements get their parents updated.
   */
  function updatePPINOTElementsRoot(event) {
    var context = event.context,
        oldRoot = context.oldRoot,
        newRoot = context.newRoot,
        children = oldRoot.children;

    var PPINOTChildren = children.filter(isPPINOT);

    if (PPINOTChildren.length) {
      modeling.moveElements(PPINOTChildren, { x: 0, y: 0 }, newRoot);
    }
  }

  this.postExecute('canvas.updateRoot', updatePPINOTElementsRoot);

  // After moving shapes, ensure PPINOT connections keep valid waypoints and adapt position
  eventBus.on('elements.move.end', function(event) {
    try { console.log('[PPINOT][Updater][elements.move.end]', { count: (event && event.context && (event.context.shapes||[]).length) || 0 }); } catch (e) {}
    var shapes = (event && event.context && event.context.shapes) || [];
    if (!shapes.length) return;

    function isPPINOTConn(c) {
      return c && c.type && /^PPINOT:/.test(c.type);
    }

    function recompute(conn) {
      var s = conn.source, t = conn.target;
      if (!s || !t) return null;
      var sx = s.x + (s.width || 0) / 2;
      var sy = s.y + (s.height || 0) / 2;
      var tx = t.x + (t.width || 0) / 2;
      var ty = t.y + (t.height || 0) / 2;
      if (conn.type === 'PPINOT:GroupedBy') {
        var midY = (sy + ty) / 2;
        return [ { x: sx, y: sy }, { x: sx, y: midY }, { x: tx, y: midY }, { x: tx, y: ty } ];
      }
      return [ { x: sx, y: sy }, { x: tx, y: ty } ];
    }

    var touchedConnections = Object.create(null);

    shapes.forEach(function(s) {
      (s.outgoing || []).concat(s.incoming || []).forEach(function(c) {
        if (!isPPINOTConn(c)) return;
        if (touchedConnections[c.id]) return;
        touchedConnections[c.id] = true;

        try {
          var wps = Array.isArray(c.waypoints) ? c.waypoints : [];
          var valid = wps.length >= 2 && wps.every(function(p){ return p && typeof p.x === 'number' && typeof p.y === 'number'; });
          if (!valid) {
            var recomputed = recompute(c);
            if (recomputed && recomputed.length >= 2) {
              try { console.log('[PPINOT][Updater][recompute]', { id: c.id, type: c.type, len: recomputed.length }); } catch (e) {}
              modeling.updateWaypoints(c, recomputed);
              return;
            }
          }
          modeling.layoutConnection(c);
        } catch (err) {}
      });
    });
  });
}

/**
 * Try to remove element from PPI list
 */
PPINOTUpdater.prototype.tryRemoveFromPPIList = async function(elementId) {
  try {
    const registry = getServiceRegistry();
    const ppiManager = registry && registry.get('PPIManagerInstance');
    if (ppiManager) {
      ppiManager.removePPIFromList(elementId);
    }
  } catch (error) {
    console.warn('Could not access PPI manager:', error);
  }
};

inherits(PPINOTUpdater, CommandInterceptor);

PPINOTUpdater.$inject = [ 'eventBus', 'modeling', 'bpmnjs' ];


/////// helpers ///////////////////////////////////

function isPPINOT(element) {
  if (!element) return false;
  
  // Check element.type
  if (element.type && /PPINOT:/.test(element.type)) {
    return true;
  }
  
  // Check businessObject.$type
  if (element.businessObject && element.businessObject.$type && /PPINOT:/.test(element.businessObject.$type)) {
    return true;
  }
  
  return false;
}

function ifPPINOTElement(fn) {
  return function(event) {
    var context = event.context,
        element = context.shape || context.connection;

    if (isPPINOT(element)) {
      fn(event);
    }
  };
}