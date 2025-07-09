import { assign } from 'min-dash';
import { isExternalLabel, isPPINOTConnection } from './Types';
import { getLabel } from 'bpmn-js/lib/features/label-editing/LabelUtil';
import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function PPINOTLabelProvider(eventBus, modeling, elementFactory, canvas, elementRegistry) {
  console.log('🏷️ PPINOTLabelProvider initialized');

  // Sistema de edición personalizado solo para conexiones PPINOT
  let activeInput = null;

  // Listener para doble click - solo para conexiones PPINOT
  eventBus.on('element.dblclick', function(event) {
    const element = event.element;
    console.log('🖱️ [Custom] Double click on:', element.type, element.id);
    
    if (canEditPPINOTConnection(element)) {
      console.log('✅ [Custom] PPINOT connection detected, creating custom editor');
      
      // Si el elemento tiene un label, editar el label. Si no, editar el elemento.
      let targetElement = element;
      if (element.label && element.type !== 'label') {
        targetElement = element.label;
        console.log('🎯 [Custom] Editing label instead of element');
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

    console.log('🎨 Creating custom editor for:', element.type, element.id);

    // Obtener el contenedor del canvas
    const canvasContainer = canvas.getContainer();
    const canvasRect = canvasContainer.getBoundingClientRect();
    
    // Calcular posición del elemento en la pantalla
    const viewbox = canvas.viewbox();
    const zoom = canvas.zoom();
    
    const elementScreenX = (element.x - viewbox.x) * zoom + canvasRect.left;
    const elementScreenY = (element.y - viewbox.y) * zoom + canvasRect.top;
    
    // Obtener texto actual
    const currentText = getPPINOTDefaultText(element.labelTarget || element);
    console.log('📝 Current text:', currentText);
    
    // Crear input overlay
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
    
    // Agregar al DOM
    document.body.appendChild(input);
    activeInput = input;
    
    // Seleccionar todo el texto y enfocar
    input.select();
    input.focus();
    
    console.log('✅ Custom editor created and focused');
    
    // Manejar eventos
    function finishEditing(save = true) {
      if (!activeInput) return;
      
      if (save) {
        const newText = input.value.trim();
        console.log('💾 Saving new text:', newText);
        updatePPINOTConnectionLabel(element, newText);
      }
      
      input.remove();
      activeInput = null;
      console.log('🏁 Custom editing finished');
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

  function canEditPPINOTConnection(element) {
    // Solo puede editar conexiones PPINOT y sus labels
    if (element.type === 'label' && element.labelTarget && element.labelTarget.type && element.labelTarget.type.startsWith('PPINOT:')) {
      return isPPINOTConnection(element.labelTarget);
    }
    
    if (element.type && element.type.startsWith('PPINOT:') && isPPINOTConnection(element)) {
      return true;
    }
    
    return false;
  }

  function getPPINOTDefaultText(element) {
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

    // Solo asignar texto por defecto para conexiones PPINOT
    if (isPPINOTConnection(element)) {
      if (is(element, 'PPINOT:ToConnection')) {
        return 'to';
      }
      if (is(element, 'PPINOT:FromConnection')) {
        return 'from';
      }
      if (is(element, 'PPINOT:AggregatedConnection')) {
        return 'aggregates';
      }
      if (is(element, 'PPINOT:GroupedBy')) {
        return 'isGroupedBy';
      }
      if (is(element, 'PPINOT:StartConnection')) {
        return 'start';
      }
      if (is(element, 'PPINOT:EndConnection')) {
        return 'end';
      }
    }
    
    return '';
  }

  function updatePPINOTConnectionLabel(element, newText) {
    const safeText = (newText == null || newText === undefined) ? '' : String(newText);
    
    console.log('🔄 Updating PPINOT connection label:', element.type, element.id, 'with text:', safeText);
    
    // Para labels externos de conexiones
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
      console.log('✅ Connection label updated via direct method');
      
    } else {
      // Para conexiones sin label externo
      if (!element.businessObject) {
        element.businessObject = {};
      }
      element.businessObject.name = safeText;
      
      eventBus.fire('element.changed', { element: element });
      console.log('✅ Connection element updated via direct method');
    }
    
    console.log('✅ PPINOT connection label update completed');
  }

  // Listener específico para conexiones PPINOT creadas
  eventBus.on('ppinot.connection.created', function(event) {
    console.log('🎯 PPINOTLabelProvider received ppinot.connection.created event');
    const connection = event.connection;
    console.log('🔗 Connection data:', connection.type, connection.id);
    console.log('🤔 Should create label?', shouldCreateExternalLabel(connection));

    if (!connection.label && shouldCreateExternalLabel(connection)) {
      console.log('🏷️ Creating label for PPINOT connection');
      createConnectionLabel(connection, getExternalLabelPosition(connection));
    }
  });

  function createConnectionLabel(target, position) {
    if (target.label || !target || !position || 
        typeof position.x !== 'number' || typeof position.y !== 'number') {
      console.warn('⚠️ Cannot create connection label - invalid conditions');
      return;
    }

    const defaultText = getPPINOTDefaultText(target);
    console.log('📝 Default text for connection:', defaultText);

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

    console.log('✅ Connection label created and added to canvas');
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
