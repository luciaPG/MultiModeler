import { assign } from 'min-dash';
import { isExternalLabel, isRALPHConnection } from './Types';
import { getLabel } from 'bpmn-js/lib/features/label-editing/LabelUtil';
import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function RALPHLabelProvider(eventBus, modeling, elementFactory, canvas, elementRegistry) {

  // Sistema de edición personalizado para elementos RALPH
  let activeInput = null;

  // Listener para doble click - para elementos RALPH
  eventBus.on('element.dblclick', function(event) {
    const element = event.element;
    
    if (canEditRALPHElement(element)) {
      
      // Si el elemento tiene un label, editar el label. Si no, editar el elemento.
      let targetElement = element;
      if (element.label && element.type !== 'label') {
        targetElement = element.label;
      }
      
      createCustomEditor(targetElement);
    }
  });

  function createCustomEditor(element) {
    // Limpiar editor anterior si existe
    if (activeInput) {
      activeInput.remove();
      activeInput = null;
    }

    // Obtener el contenedor del canvas
    const canvasContainer = canvas.getContainer();
    const canvasRect = canvasContainer.getBoundingClientRect();
    
    // Calcular posición del elemento en la pantalla
    const viewbox = canvas.viewbox();
    const zoom = canvas.zoom();
    
    const elementScreenX = (element.x - viewbox.x) * zoom + canvasRect.left;
    const elementScreenY = (element.y - viewbox.y) * zoom + canvasRect.top;
    
    // Obtener texto actual
    const currentText = getRALPHDefaultText(element.labelTarget || element);
    
    // Crear input overlay
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.position = 'fixed';
    input.style.left = elementScreenX + 'px';
    input.style.top = elementScreenY + 'px';
    input.style.width = Math.max(150, element.width * zoom) + 'px';
    input.style.height = Math.max(50, element.height * zoom) + 'px';
    input.style.fontSize = (12 * zoom) + 'px';
    input.style.textAlign = 'center';
    input.style.border = '2px solid #0086e6';
    input.style.borderRadius = '3px';
    input.style.backgroundColor = 'white';
    input.style.zIndex = '1000';
    input.style.outline = 'none';
    
    // Agregar al DOM
    document.body.appendChild(input);
    activeInput = input;
    
    // Seleccionar todo el texto y enfocar
    input.select();
    input.focus();
    
    // Manejar eventos
    function finishEditing(save = true) {
      if (!activeInput) return;
      
      if (save) {
        const newText = input.value.trim();
        updateRALPHLabel(element, newText);
      }
      
      input.remove();
      activeInput = null;
    }
    
    // Enter para guardar
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEditing(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishEditing(false);
      }
    });
    
    // Perder foco para guardar
    input.addEventListener('blur', function() {
      finishEditing(true);
    });
    
    // Click fuera para guardar
    document.addEventListener('click', function onDocumentClick(e) {
      if (e.target !== input) {
        document.removeEventListener('click', onDocumentClick);
        finishEditing(true);
      }
    });
  }

  function canEditRALPHElement(element) {
    // Solo puede editar elementos RALPH y sus labels
    if (element.type === 'label' && element.labelTarget && element.labelTarget.type && element.labelTarget.type.startsWith('RALph:')) {
      return isExternalLabel(element.labelTarget);
    }
    
    if (element.type && element.type.startsWith('RALph:') && isExternalLabel(element)) {
      return true;
    }
    
    return false;
  }

  function getRALPHDefaultText(element) {
    // Verificar que el elemento existe
    if (!element || !element.type) {
      return '';
    }

    // Primero obtener el texto actual
    const currentText = getLabel(element);
    
    // Si ya tiene texto, devolverlo
    if (currentText && currentText.trim() !== '') {
      return currentText;
    }

    // Solo asignar texto por defecto para elementos RALPH
    if (is(element, 'RALph:Position')) {
      return 'Position';
    }
    if (is(element, 'RALph:Complex-Assignment-OR')) {
      return 'OR';
    }
    if (is(element, 'RALph:Complex-Assignment-AND')) {
      return 'AND';
    }
    if (is(element, 'RALph:Orgunit')) {
      return 'Organizational Unit';
    }
    if (is(element, 'RALph:Personcap')) {
      return 'Person Capability';
    }
    if (is(element, 'RALph:Person')) {
      return 'Person';
    }
    if (is(element, 'RALph:RoleRALph')) {
      return 'Role';
    }
    
    return '';
  }

  function updateRALPHLabel(element, newText) {
    const safeText = (newText == null || newText === undefined) ? '' : String(newText);
    
    // Para labels externos
    if (element.type === 'label' && element.labelTarget) {
      // Actualizar el businessObject del label
      if (!element.businessObject) {
        element.businessObject = { $type: 'bpmn:Label' };
      }
      element.businessObject.name = safeText;
      
      // Actualizar el businessObject del target también  
      if (!element.labelTarget.businessObject) {
        element.labelTarget.businessObject = {};
      }
      element.labelTarget.businessObject.name = safeText;
      
      // Forzar re-render
      eventBus.fire('element.changed', { element: element });
      
    } else {
      // Para elementos sin label externo
      if (!element.businessObject) {
        element.businessObject = {};
      }
      element.businessObject.name = safeText;
      
      eventBus.fire('element.changed', { element: element });
    }
  }

  // Listener para elementos RALPH creados
  eventBus.on('create.end', 500, function(event) {
    const shape = event.context.shape;

    if (!shape.labelTarget && !shape.hidden && !shape.label && shouldCreateExternalLabel(shape)) {
      createLabel(shape, getExternalLabelPosition(shape));
    }
  });

  eventBus.on('import.done', function() {
    elementRegistry.forEach(function(element) {
      if (shouldCreateExternalLabel(element) && !element.label) {
        createLabel(element, getExternalLabelPosition(element));
      }

      if (element.type && element.type.startsWith('RALph:')) {
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
    labelElement.labelTarget = target;

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

RALPHLabelProvider.$inject = [
  'eventBus',
  'modeling',
  'elementFactory',
  'canvas',
  'elementRegistry'
]; 