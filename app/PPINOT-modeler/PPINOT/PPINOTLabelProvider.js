import { assign } from 'min-dash';
import { isExternalLabel, isPPINOTConnection } from './Types';
import { getLabel } from 'bpmn-js/lib/features/label-editing/LabelUtil';
import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function PPINOTLabelProvider(eventBus, modeling, elementFactory, canvas, elementRegistry) {

  let activeInput = null;

  eventBus.on('element.dblclick', function(event) {
    const element = event.element;
    
    if (canEditPPINOTConnection(element)) {
      
      let targetElement = element;
      if (element.label && element.type !== 'label') {
        targetElement = element.label;
      }
      
      createCustomEditor(targetElement);
    }
  });

  // Editor de texto flotante para conexiones PPINOT
  function createCustomEditor(element) {
    if (activeInput) { activeInput.remove(); activeInput = null; }
    const canvasContainer = canvas.getContainer();
    const canvasRect = canvasContainer.getBoundingClientRect();
    const viewbox = canvas.viewbox();
    const zoom = canvas.zoom();
    const elementScreenX = (element.x - viewbox.x) * zoom + canvasRect.left;
    const elementScreenY = (element.y - viewbox.y) * zoom + canvasRect.top;
    const currentText = getPPINOTDefaultText(element.labelTarget || element);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.position = 'fixed';
    input.style.left = elementScreenX + 'px';
    input.style.top = elementScreenY + 'px';
    input.style.width = Math.max(80, element.width * zoom) + 'px';
    input.style.height = Math.max(20, element.height * zoom) + 'px';
    input.style.fontSize = (12 * zoom) + 'px';
    input.style.textAlign = 'center';
    input.style.border = '2px solid #0086e6';
    input.style.borderRadius = '3px';
    input.style.backgroundColor = 'white';
    input.style.zIndex = '1000';
    input.style.outline = 'none';
    document.body.appendChild(input);
    activeInput = input;
    input.select();
    input.focus();
    function finishEditing(save = true) {
      if (!activeInput) return;
      if (save) {
        const newText = input.value.trim();
        updatePPINOTConnectionLabel(element, newText);
      }
      input.remove();
      activeInput = null;
    }
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); finishEditing(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finishEditing(false); }
    });
    input.addEventListener('blur', function() { finishEditing(true); });
    document.addEventListener('click', function onDocumentClick(e) {
      if (e.target !== input) {
        document.removeEventListener('click', onDocumentClick);
        finishEditing(true);
      }
    });
  }

  // Solo permite editar conexiones PPINOT y sus labels
  function canEditPPINOTConnection(element) {
    if (element.type === 'label' && element.labelTarget && element.labelTarget.type && element.labelTarget.type.startsWith('PPINOT:')) {
      return isPPINOTConnection(element.labelTarget);
    }
    if (element.type && element.type.startsWith('PPINOT:') && isPPINOTConnection(element)) {
      return true;
    }
    return false;
  }

  // Devuelve el texto por defecto para conexiones PPINOT
  function getPPINOTDefaultText(element) {
    if (!element || !element.type) return '';
    const currentText = getLabel(element);
    if (currentText && currentText.trim() !== '') return currentText;
    if (isPPINOTConnection(element)) {
      if (is(element, 'PPINOT:ToConnection')) return 'to';
      if (is(element, 'PPINOT:FromConnection')) return 'from';
      if (is(element, 'PPINOT:AggregatedConnection')) return 'aggregates';
      if (is(element, 'PPINOT:GroupedBy')) return 'isGroupedBy';
      if (is(element, 'PPINOT:StartConnection')) return 'start';
      if (is(element, 'PPINOT:EndConnection')) return 'end';
    }
    return '';
  }

  // Actualiza el label de una conexión PPINOT
  function updatePPINOTConnectionLabel(element, newText) {
    const safeText = (newText == null || newText === undefined) ? '' : String(newText);
    if (element.type === 'label' && element.labelTarget) {
      if (!element.businessObject) element.businessObject = { $type: 'bpmn:Label' };
      element.businessObject.name = safeText;
      if (!element.labelTarget.businessObject) element.labelTarget.businessObject = {};
      element.labelTarget.businessObject.name = safeText;
      eventBus.fire('element.changed', { element: element });
    } else {
      if (!element.businessObject) element.businessObject = {};
      element.businessObject.name = safeText;
      eventBus.fire('element.changed', { element: element });
    }
  }

  // Listener específico para conexiones PPINOT creadas
  eventBus.on('ppinot.connection.created', function(event) {
    const connection = event.connection;

    if (!connection.label && shouldCreateExternalLabel(connection)) {
      createConnectionLabel(connection, getExternalLabelPosition(connection));
    }
  });

  function createConnectionLabel(target, position) {
    if (target.label || !target || !position || 
        typeof position.x !== 'number' || typeof position.y !== 'number') {
      return;
    }

    const defaultText = getPPINOTDefaultText(target);

    // Asegurar que el businessObject del target tiene el nombre establecido
    if (target.businessObject) {
      target.businessObject.name = defaultText;
    } else {
      target.businessObject = { name: defaultText };
    }

    // Crear label específico para conexiones con dimensiones pequeñas
    const labelBusinessObject = {
      $type: 'bpmn:Label',
      name: defaultText
    };

    const labelElement = elementFactory.createLabel({
      id: target.id + '_label',
      businessObject: labelBusinessObject,
      type: 'label',
      labelTarget: target,
      width: 80,
      height: 20
    });

    assign(labelElement, {
      x: position.x - labelElement.width / 2,
      y: position.y - labelElement.height / 2,
      hidden: false,
      isLabel: true,
      _isLabel: true,
      movable: true,
      dragable: true,
      parent: canvas.findRoot(target) || canvas.getRootElement()
    });

    target.label = labelElement;
    labelElement.labelTarget = target;

    const parent = canvas.findRoot(target) || canvas.getRootElement();

    modeling.createShape(labelElement, {
      x: position.x,
      y: position.y
    }, parent);

  }

  // Funcionalidad estándar para elementos PPINOT (no conexiones) - aproximación simple
  
  // Listen for element replacement to ensure labels are properly preserved
  eventBus.on('shape.replace', function(event) {
    const oldShape = event.oldShape;
    const newShape = event.newShape;
    
    // If the old element had a label and the new one should have one too
    if (oldShape.label && isExternalLabel(newShape) && !newShape.label) {
      // Transfer the label to the new shape
      const oldLabel = oldShape.label;
      newShape.label = oldLabel;
      oldLabel.labelTarget = newShape;
      
      // Ensure the new shape has the flag set
      newShape._hasExternalLabel = true;
    }
  });

  eventBus.on('create.end', 500, function(event) {
    const shape = event.context.shape;

    // Para conexiones PPINOT, no crear aquí (se maneja en ppinot.connection.created)
    if (isPPINOTConnection(shape)) {
      return;
    }

    if (!shape.labelTarget && !shape.hidden && !shape.label && shouldCreateExternalLabel(shape)) {
      createLabel(shape, getExternalLabelPosition(shape));
    }
  });

  eventBus.on('import.done', function() {
    elementRegistry.forEach(function(element) {
      // Para conexiones PPINOT, no crear aquí
      if (isPPINOTConnection(element)) {
        return;
      }
      
      if (shouldCreateExternalLabel(element) && !element.label) {
        createLabel(element, getExternalLabelPosition(element));
      }

      if (element.type && element.type.startsWith('PPINOT:')) {
        element._skipInternalLabel = true;
      }
    });
  });

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

  function createLabel(target, position) {
    if (target.label || !target || !position || 
        typeof position.x !== 'number' || typeof position.y !== 'number') {
      return;
    }

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
    if (!isExternalLabel(element)) {
      return false;
    }

    // Don't create a new external label if one already exists
    if (element.label) {
      return false;
    }

    return true;
  }

  function getExternalLabelMid(element) {
    // Para conexiones, calcular punto medio de los waypoints
    if (element.waypoints && Array.isArray(element.waypoints) && element.waypoints.length > 1) {
      const midIndex = Math.floor(element.waypoints.length / 2);
      const start = element.waypoints[midIndex - 1];
      const end = element.waypoints[midIndex];
      const x = (start.x + end.x) / 2;
      const y = (start.y + end.y) / 2;
      return {
        x: x,
        y: y - 15
      };
    }
    
    // Para elementos normales
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
