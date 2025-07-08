import { assign } from 'min-dash';
import { getMid } from 'diagram-js/lib/layout/LayoutUtil';
import { getLabel } from './utils/LabelUtil';
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';

export default function PPINOTLabelProvider(eventBus, modeling, elementFactory, canvas, elementRegistry) {

  // Create external labels when finishing the creation of an element
  eventBus.on('create.end', 500, function(event) {
    const shape = event.context.shape;

    if (!shape.labelTarget && !shape.hidden && !shape.label && shouldCreateExternalLabel(shape)) {
      createLabel(shape, getExternalLabelPosition(shape));
    }
  });

  // Create external labels for existing elements when loading the diagram
  eventBus.on('import.done', function() {
    elementRegistry.forEach(function(element) {
      if (shouldCreateExternalLabel(element) && !element.label) {
        createLabel(element, getExternalLabelPosition(element));
      }

      if (element.type && element.type.startsWith('PPINOT:')) {
        element._skipInternalLabel = true;
      }
    });
  });

  // Reposition external label when moving the element
  eventBus.on('shape.move.end', function(event) {
    const element = event.shape;

    if (isLabel(element) && element.labelTarget) return;

    if (!isLabel(element) && element.label) {
      const labelMid = getExternalLabelMid(element);

      if (labelMid && typeof labelMid.x === 'number' && typeof labelMid.y === 'number') {
        const delta = {
          x: labelMid.x - element.label.x - element.label.width / 2,
          y: labelMid.y - element.label.y - element.label.height / 2
        };

        modeling.moveShape(element.label, delta);
      }
    }
  });

  // Create an external label for a target element at the given position
  function createLabel(target, position) {
    if (target.label || !target || !position || 
        typeof position.x !== 'number' || typeof position.y !== 'number') {
      return;
    }

    const labelText = getLabel(target) || '';

    const labelElement = elementFactory.createLabel({
      id: target.id + '_label',
      businessObject: target.businessObject,
      di: target.di,
      type: 'label',
      labelTarget: target,
      width: 150,
      height: 50
    });

    assign(labelElement, {
      x: position.x - labelElement.width / 2,
      y: position.y - labelElement.height / 2
    });

    target.label = labelElement;

    const parent = canvas.findRoot(target) || canvas.getRootElement();

    modeling.createShape(labelElement, {
      x: position.x,
      y: position.y
    }, parent);
  }

  function isLabel(element) {
    return element && element.type === 'label';
  }

  function shouldCreateExternalLabel(element) {
    if (element._hasExternalLabel || element.label) {
      return false;
    }

    if (element.parent && element.parent.type === 'PPINOT:Ppi' &&
        (element.type === 'PPINOT:Scope' || element.type === 'PPINOT:Target')) {
      return false;
    }

    return element && element.type && element.type.startsWith('PPINOT:');
  }

  function getExternalLabelMid(element) {
    if (!element || typeof element.x !== 'number' || typeof element.y !== 'number' || 
        typeof element.width !== 'number' || typeof element.height !== 'number') {
      return null;
    }

    return {
      x: element.x + element.width / 2,
      y: element.y + element.height + 30
    };
  }

  function getExternalLabelPosition(element) {
    const mid = getExternalLabelMid(element);
    return mid ? { x: mid.x, y: mid.y } : null;
  }
}

PPINOTLabelProvider.$inject = [
  'eventBus',
  'modeling',
  'elementFactory',
  'canvas',
  'elementRegistry'
];
