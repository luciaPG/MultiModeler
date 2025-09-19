import { assign } from 'min-dash';
import { isExternalLabel, isPPINOTConnection } from './Types';
import { getLabel } from 'bpmn-js/lib/features/label-editing/LabelUtil';
import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function PPINOTLabelProvider(eventBus, modeling, elementFactory, canvas, elementRegistry) {

  // Sistema de edición personalizado solo para conexiones PPINOT
  let activeInput = null;

  // Listener para doble click - para elementos PPINOT
  eventBus.on('element.dblclick', function(event) {
    const element = event.element;
    
    if (canEditPPINOTElement(element)) {
      
      let targetElement = element;
      
      let shouldEdit = false;
      
      // Si es una etiqueta externa, editarla directamente
      if (element.type === 'label') {
        targetElement = element;
        shouldEdit = true;
      }
      // Si el elemento principal tiene etiqueta externa, editarla
      else if (element.label) {
        targetElement = element.label;
        shouldEdit = true;
      }
      // Si el elemento debería tener etiqueta externa pero no la tiene, crearla con doble-click
      else if (shouldCreateExternalLabel(element)) {
        createLabel(element, getExternalLabelPosition(element));
        targetElement = element.label;
        shouldEdit = true;
        
        // Iniciar edición automáticamente después de crear la etiqueta
        setTimeout(() => {
          if (element.label) {
            createCustomEditor(element.label);
          }
        }, 50);
        return; // Evitar doble llamada a createCustomEditor
      }
      // Si no tiene etiqueta externa, editar el elemento directamente (embedded)
      else {
        targetElement = element;
        shouldEdit = true;
      }
      
      if (!shouldEdit) {
        return; // No permitir edición
      }
      
      createCustomEditor(targetElement);
    }
  });

  function createCustomEditor(element) {
    // Limpiar editor anterior si existe
    if (activeInput) {
      try {
        if (activeInput.parentNode) {
          activeInput.remove();
        }
      } catch (e) {
        // Elemento ya fue removido, ignorar error
      }
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
    const currentText = getPPINOTDefaultText(element.labelTarget || element);
    
    // Encontrar el elemento SVG de texto para posicionamiento
    const targetSvgElement = element.labelTarget ? 
      canvas.getGraphics(element.labelTarget) : 
      canvas.getGraphics(element);
      
    if (!targetSvgElement) return;
    
    // Buscar el elemento de texto dentro del SVG
    const svgTextElement = targetSvgElement.querySelector('text') || 
                          targetSvgElement.querySelector('.djs-label');
    
    if (!svgTextElement) return;
    
    // Obtener posición exacta del texto SVG
    const textBounds = svgTextElement.getBoundingClientRect();
    
    // Crear input transparente que se superponga exactamente
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.position = 'fixed';
    input.style.left = textBounds.left + 'px';
    input.style.top = textBounds.top + 'px';
    input.style.width = Math.max(textBounds.width, 60) + 'px';
    input.style.height = textBounds.height + 'px';
    input.style.fontSize = '14px';
    input.style.fontFamily = window.getComputedStyle(svgTextElement).fontFamily || 'Arial';
    input.style.textAlign = 'center';
    input.style.border = 'none';
    input.style.outline = 'none';
    input.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    input.style.borderRadius = '3px';
    input.style.zIndex = '1000';
    input.style.padding = '2px';
    
    // Ocultar temporalmente el texto SVG original
    svgTextElement.style.opacity = '0.3';
    
    // Agregar al DOM
    document.body.appendChild(input);
    activeInput = input;
    
    // Seleccionar todo el texto y enfocar
    input.select();
    input.focus();
    
    
    // Manejar eventos
    let isFinishing = false;
    function finishEditing(save = true) {
      if (!activeInput || isFinishing) return;
      isFinishing = true;
      
      if (save) {
        const newText = activeInput.value.trim();
        updatePPINOTConnectionLabel(element, newText);
      }
      
      // Restaurar opacidad del texto SVG original y limpiar cualquier estado
      try {
        if (svgTextElement) {
          svgTextElement.style.opacity = '';
          svgTextElement.style.visibility = '';
          svgTextElement.style.display = '';
        }
      } catch (e) {
        // Ignorar errores
      }
      
      // Forzar re-render inmediato del canvas para limpiar cualquier preview residual
      try {
        // Múltiples estrategias para forzar re-render
        eventBus.fire('canvas.viewbox.changed', { viewbox: canvas.viewbox() });
        eventBus.fire('element.changed', { element: element });
        
        // Forzar repaint del DOM
        setTimeout(() => {
          if (svgTextElement) {
            svgTextElement.style.transform = 'translateZ(0)';
            setTimeout(() => {
              if (svgTextElement) {
                svgTextElement.style.transform = '';
              }
            }, 1);
          }
        }, 1);
      } catch (e) {
        // Ignorar errores
      }
      
      // Remover el input
      try {
        if (activeInput && activeInput.parentNode) {
          activeInput.remove();
        }
      } catch (e) {
        // Elemento ya fue removido, ignorar error
      }
      
      activeInput = null;
      isFinishing = false;
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

  function canEditPPINOTElement(element) {
    // Puede editar cualquier elemento PPINOT (conexiones y elementos) y sus labels
    if (element.type === 'label' && element.labelTarget && element.labelTarget.type && element.labelTarget.type.startsWith('PPINOT:')) {
      return true;
    }
    
    if (element.type && element.type.startsWith('PPINOT:')) {
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

    // Para elementos scope y target, asegurar que siempre tengan un nombre válido
    if (is(element, 'PPINOT:Scope') || is(element, 'PPINOT:Target')) {
      // Si el businessObject tiene un nombre, usarlo
      if (element.businessObject && element.businessObject.name && element.businessObject.name.trim() !== '') {
        return element.businessObject.name;
      }
      // Si no, usar el ID como fallback
      if (element.id) {
        return element.id;
      }
      // Último fallback: usar el tipo
      return element.type.replace('PPINOT:', '');
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
      
    } else {
      // Para conexiones sin label externo
      if (!element.businessObject) {
        element.businessObject = {};
      }
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

    // Asegurar que scope y target elementos siempre tengan un nombre válido
    if (is(shape, 'PPINOT:Scope') || is(shape, 'PPINOT:Target')) {
      if (!shape.businessObject) {
        shape.businessObject = {};
      }
      if (!shape.businessObject.name || shape.businessObject.name.trim() === '') {
        shape.businessObject.name = shape.id || shape.type.replace('PPINOT:', '');
      }
    }

    // Labels only created on double-click, not automatically
    // if (!shape.labelTarget && !shape.hidden && !shape.label && shouldCreateExternalLabel(shape)) {
    //   createLabel(shape, getExternalLabelPosition(shape));
    // }
  });

  eventBus.on('import.done', function() {
    elementRegistry.forEach(function(element) {
      // Para conexiones PPINOT, no crear aquí
      if (isPPINOTConnection(element)) {
        return;
      }
      
      // Asegurar que scope y target elementos siempre tengan un nombre válido después de importar
      if (is(element, 'PPINOT:Scope') || is(element, 'PPINOT:Target')) {
        if (!element.businessObject) {
          element.businessObject = {};
        }
        if (!element.businessObject.name || element.businessObject.name.trim() === '') {
          element.businessObject.name = element.id || element.type.replace('PPINOT:', '');
        }
      }
      
      // Labels only created on double-click, not automatically
      // if (shouldCreateExternalLabel(element) && !element.label) {
      //   createLabel(element, getExternalLabelPosition(element));
      // }

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
