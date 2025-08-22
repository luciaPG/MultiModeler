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


/**
 * A handler responsible for updating the RALph element's businessObject
 * once changes on the diagram happen.
 */
export default function RALphUpdater(eventBus, modeling, bpmnjs) {

  CommandInterceptor.call(this, eventBus);

  function updateCustomElement(e) {
    var context = e.context,
        shape = context.shape,
        businessObject = shape.businessObject;

    if (!isCustom(shape)) {
      return;
    }

    var parent = shape.parent;

    var RALphElements = bpmnjs._RALphElements;

    // make sure element is added / removed from bpmnjs.RALphElements
    if (!parent) {
      collectionRemove(RALphElements, businessObject);
    } else {
      collectionAdd(RALphElements, businessObject);
    }

    // save RALph element position and name
    assign(businessObject, pick(shape, [ 'x', 'y' ]));
    
    // Save the name if it exists
    if (shape.businessObject && shape.businessObject.name) {
      businessObject.name = shape.businessObject.name;
    }
  }

  function updateCustomConnection(e) {
    var context = e.context,
        connection = context.connection,
        source = connection.source,
        target = connection.target,
        businessObject = connection.businessObject;

    var parent = connection.parent;

    var RALphElements = bpmnjs._RALphElements;

    // make sure element is added / removed from bpmnjs.RALphElements
    if (!parent) {
      collectionRemove(RALphElements, businessObject);
    } else {
      collectionAdd(RALphElements, businessObject);
    }

    // update waypoints
    
    assign(businessObject, {
      waypoints: copyWaypoints(connection)
    });


    if (source && target) {
      assign(businessObject, {
        source: source.id,
        target: target.id
      });
    }

  }

  this.executed([
    'shape.create',
    'shape.move',
    'shape.delete'
  ], ifCustomElement(updateCustomElement));

  this.reverted([
    'shape.create',
    'shape.move',
    'shape.delete'
  ], ifCustomElement(updateCustomElement));

  this.executed([
    'connection.create',
    'connection.reconnectStart',
    'connection.reconnectEnd',
    'connection.updateWaypoints',
    'connection.delete',
    'connection.layout',
    'connection.move'
  ], ifCustomElement(updateCustomConnection));

  this.reverted([
    'connection.create',
    'connection.reconnectStart',
    'connection.reconnectEnd',
    'connection.updateWaypoints',
    'connection.delete',
    'connection.layout',
    'connection.move'
  ], ifCustomElement(updateCustomConnection));

  // Handle property updates for RALPH elements and their labels
  this.executed([
    'element.updateProperties'
  ], function(event) {
    var context = event.context,
        element = context.element,
        properties = context.properties;

    // Handle RALPH element updates
    if (isCustom(element)) {
      if (properties.name !== undefined) {
        element.businessObject.name = properties.name;
      }
    }

    // Handle label updates
    if (element && element.type === 'label' && element.labelTarget && isCustom(element.labelTarget)) {
      if (properties.name !== undefined) {
        element.businessObject.name = properties.name;
        element.labelTarget.businessObject.name = properties.name;
      }
    }
  });

  this.reverted([
    'element.updateProperties'
  ], function(event) {
    var context = event.context,
        element = context.element,
        properties = context.properties;

    // Handle RALPH element updates
    if (isCustom(element)) {
      if (properties.name !== undefined) {
        element.businessObject.name = properties.name;
      }
    }

    // Handle label updates
    if (element && element.type === 'label' && element.labelTarget && isCustom(element.labelTarget)) {
      if (properties.name !== undefined) {
        element.businessObject.name = properties.name;
        element.labelTarget.businessObject.name = properties.name;
      }
    }
  });

  // Handle direct editing completion for RALPH elements
  this.executed([
    'directEditing.complete'
  ], function(event) {
    var element = event.element;
    var text = event.text;

    if (element && element.type && element.type.startsWith('RALph:')) {
      if (element.businessObject) {
        element.businessObject.name = text;
      }
      
      // Update external label if it exists
      if (element.label && element.label.businessObject) {
        element.label.businessObject.name = text;
      }
    }

    if (element && element.type === 'label' && element.labelTarget && element.labelTarget.type && element.labelTarget.type.startsWith('RALph:')) {
      if (element.businessObject) {
        element.businessObject.name = text;
      }
      
      if (element.labelTarget && element.labelTarget.businessObject) {
        element.labelTarget.businessObject.name = text;
      }
    }
  });




  /**
   * When morphing a Process into a Collaboration or vice-versa,
   * make sure that the existing RALph elements get their parents updated.
   */
  function updateCustomElementsRoot(event) {
    var context = event.context,
        oldRoot = context.oldRoot,
        newRoot = context.newRoot,
        children = oldRoot.children;

    var RALphChildren = children.filter(isCustom);

    if (RALphChildren.length) {
      modeling.moveElements(RALphChildren, { x: 0, y: 0 }, newRoot);
    }
  }

  this.postExecute('canvas.updateRoot', updateCustomElementsRoot);
}

inherits(RALphUpdater, CommandInterceptor);

RALphUpdater.$inject = [ 'eventBus', 'modeling', 'bpmnjs' ];


/////// helpers ///////////////////////////////////

function copyWaypoints(connection) {
  return connection.waypoints.map(function(p) {
    return { x: p.x, y: p.y };
  });
}

function isCustom(element) {
  return element && /RALph:/.test(element.type);
}

function ifCustomElement(fn) {
  return function(event) {
    var context = event.context,
        element = context.shape || context.connection;

    if (isCustom(element)) {
      fn(event);
    }
  };
}