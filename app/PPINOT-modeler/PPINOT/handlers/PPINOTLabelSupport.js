import { assign } from 'min-dash';
import { getMid } from 'diagram-js/lib/layout/LayoutUtil';
import { getLabel } from '../utils/LabelUtil';
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';

/**
 * A handler that implements support for label elements.
 * 
 * @param {EventBus} eventBus
 * @param {Modeling} modeling
 * @param {ElementFactory} elementFactory
 * @param {Canvas} canvas
 */
export default function PPINOTLabelSupport(eventBus, modeling, elementFactory, canvas, elementRegistry) {
  // Listen to element creation events to create labels
  eventBus.on('create.end', 500, function(event) {
    var context = event.context,
        shape = context.shape;

    // Solo crear etiquetas para elementos PPINOT que no tienen ya una
    if (!shape.labelTarget && !shape.hidden && !shape.label && shouldCreateExternalLabel(shape)) {
      console.log('PPINOTLabelSupport: Creando etiqueta para nuevo elemento', shape.id);
      // Crear etiqueta externa
      createLabel(shape, getExternalLabelPosition(shape));
    }
  });

  // Procesar los elementos existentes cuando el diagrama se carga
  eventBus.on('import.done', function() {
    console.log('PPINOTLabelSupport: Procesando elementos existentes');
    // Buscar todos los elementos PPINOT que deberían tener etiquetas externas
    elementRegistry.forEach(function(element) {
      if (shouldCreateExternalLabel(element) && !element.label) {
        console.log('PPINOTLabelSupport: Creando etiqueta para elemento existente', element.id);
        createLabel(element, getExternalLabelPosition(element));
      }
      
      // Marcar el elemento para evitar etiquetas internas
      if (element.type && element.type.startsWith('PPINOT:')) {
        element._skipInternalLabel = true;
      }
    });
  });

  // En lugar de usar drag.move directamente, usamos move.end para un comportamiento específico
  // para asegurar un posicionamiento adecuado de la etiqueta sin causar eventos circulares
  eventBus.on('shape.move.end', function(event) {
    var element = event.shape;

    // Si es una etiqueta, su posición se actualiza en relación a su objetivo
    if (isLabel(element) && element.labelTarget) {
      // Esto ya lo maneja diagram-js
      return;
    }

    // Si un elemento con una etiqueta fue movido, actualizar la posición de la etiqueta
    if (!isLabel(element) && element.label) {
      var labelMid = getExternalLabelMid(element);
      
      // Solo mover si tenemos una posición válida
      if (labelMid && typeof labelMid.x === 'number' && typeof labelMid.y === 'number') {
        var delta = {
          x: labelMid.x - element.label.x - element.label.width / 2,
          y: labelMid.y - element.label.y - element.label.height / 2
        };
        
        modeling.moveShape(element.label, delta);
      }
    }
  });

  /**
   * Create a label for the given target element at the specified position
   */
  function createLabel(target, position) {
    // Verificar que no exista ya una etiqueta
    if (target.label || !target || !position || 
        typeof position.x !== 'number' || typeof position.y !== 'number') {
      console.warn('Invalid target or position for label creation or label already exists');
      return;
    }
    
    var labelText = getLabel(target) || '';
    
    var labelCenter = {
      x: position.x,
      y: position.y
    };

    var labelElement = elementFactory.createLabel({
      id: target.id + '_label',
      businessObject: target.businessObject,
      di: target.di,
      type: 'label',
      labelTarget: target,
      width: 150,
      height: 50
    });

    // Ensure label is positioned at the calculated position
    assign(labelElement, {
      x: labelCenter.x - labelElement.width / 2,
      y: labelCenter.y - labelElement.height / 2
    });

    // Link label and element
    target.label = labelElement;
    
    // Mark the element to avoid duplicate labels
    target._hasExternalLabel = true;
    target._skipInternalLabel = true;
    
    // Add label to canvas - use parent of target as parent for label
    var parent = canvas.findRoot(target) || canvas.getRootElement();
    
    modeling.createShape(labelElement, {
      x: labelCenter.x,
      y: labelCenter.y
    }, parent || canvas.getRootElement());
    
    return labelElement;
  }

  /**
   * Returns true if the given element is a label
   */
  function isLabel(element) {
    return element && element.type === 'label';
  }

  /**
   * Returns true if the given element should have an external label
   * and doesn't have one already
   */
  function shouldCreateExternalLabel(element) {
    // No crear etiqueta si ya tiene una
    if (element._hasExternalLabel || element.label) {
      return false;
    }
    
    // No crear etiqueta para elementos especiales dentro de PPI
    if (element.parent && element.parent.type === 'PPINOT:Ppi' &&
        (element.type === 'PPINOT:Scope' || element.type === 'PPINOT:Target')) {
      return false;
    }
    
    // Create external labels for any PPINOT element
    return element && element.type && element.type.startsWith('PPINOT:');
  }

  /**
   * Returns the mid position for an external label
   */
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

  /**
   * Returns the position for an external label
   */
  function getExternalLabelPosition(element) {
    var mid = getExternalLabelMid(element);
    
    if (!mid) {
      return null;
    }
    
    return {
      x: mid.x,
      y: mid.y
    };
  }
}

PPINOTLabelSupport.$inject = [
  'eventBus',
  'modeling',
  'elementFactory',
  'canvas',
  'elementRegistry'
]; 