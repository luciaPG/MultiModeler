import inherits from 'inherits';

import {
  pick,
  assign
} from 'min-dash';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import {
  add as collectionAdd,
  remove as collectionRemove
} from 'diagram-js/lib/util/Collections';

import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExternalLabel, isPPINOTConnection } from './Types';

/**
 * A handler responsible for updating the PPINOT element's businessObject
 * once changes on the diagram happen.
 */
export default function PPINOTUpdater(eventBus, modeling, bpmnjs) {

  CommandInterceptor.call(this, eventBus);

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
      return false;
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

    // Validate and filter waypoints
    if (connection.waypoints) {
      // Filter out any invalid waypoints
      var validWaypoints = connection.waypoints.filter(function(p) {
        return p && typeof p.x === 'number' && typeof p.y === 'number' && 
               !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y);
      });

      // Only update if we have valid waypoints
      if (validWaypoints.length >= 2) {
        assign(businessObject, {
          waypoints: validWaypoints.map(function(p) {
            return { x: p.x, y: p.y };
          })
        });
        // Update the connection's waypoints to only include valid ones
        connection.waypoints = validWaypoints;
      }
    }

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
}

inherits(PPINOTUpdater, CommandInterceptor);

PPINOTUpdater.$inject = [ 'eventBus', 'modeling', 'bpmnjs' ];


/////// helpers ///////////////////////////////////

function isPPINOT(element) {
  return element && /PPINOT:/.test(element.type);
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