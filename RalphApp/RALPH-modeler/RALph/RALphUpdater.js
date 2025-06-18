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

    // save RALph element position
    assign(businessObject, pick(shape, [ 'x', 'y' ]));
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