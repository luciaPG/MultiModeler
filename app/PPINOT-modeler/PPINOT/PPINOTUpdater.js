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

import { is } from './utils/CompatibilityUtil';

/**
 * A handler responsible for updating the PPINOT element's businessObject
 * once changes on the diagram happen.
 */
export default function PPINOTUpdater(eventBus, modeling, bpmnjs) {

  CommandInterceptor.call(this, eventBus);

  function updatePPINOTElement(e) {
    var context = e.context,
        shape = context.shape,
        businessObject = shape.businessObject;

    if (!isPPINOT(shape)) {
      return;
    }

    var parent = shape.parent;

    var PPINOTElements = bpmnjs._PPINOTElements;

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
        target = connection.target,
        businessObject = connection.businessObject;

    var parent = connection.parent;

    var PPINOTElements = bpmnjs._PPINOTElements;

    // make sure element is added / removed from bpmnjs.PPINOTElements
    if (!parent) {
      collectionRemove(PPINOTElements, businessObject);
    } else {
      collectionAdd(PPINOTElements, businessObject);
    }

    // update waypoints and preserve them
    if (connection.waypoints) {
      assign(businessObject, {
        waypoints: connection.waypoints.map(function(p) {
          return { x: p.x, y: p.y };
        })
      });
    }

    // update source and target references
    if (source && target) {
      assign(businessObject, {
        source: source.id,
        target: target.id
      });
    }
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