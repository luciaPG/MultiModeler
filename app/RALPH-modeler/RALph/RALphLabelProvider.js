import { assign } from 'min-dash';
import { isExternalLabel, isRALPHConnection } from './Types';
import { getLabel } from 'bpmn-js/lib/features/label-editing/LabelUtil';
import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

export default function RALPHLabelProvider(eventBus, modeling, elementFactory, canvas, elementRegistry) {

  // Sistema de edición personalizado para elementos RALPH
  let activeInput = null;
  
  // Elementos que tienen dos etiquetas (interna y externa)
  const dualLabelElements = [
    'RALph:reportsDirectly',
    'RALph:reportsTransitively', 
    'RALph:delegatesDirectly',
    'RALph:delegatesTransitively'
  ];

  // Elementos que NO deben tener labels (no editables)
  const nonEditableElements = [
    // History elements (excepto instance)
    'RALph:history',
    'RALph:historyStart',
    'RALph:historyEnd',
    // Gateways (AND/OR)
    'bpmn:ExclusiveGateway',
    'bpmn:InclusiveGateway',
    'bpmn:ParallelGateway',
    'bpmn:ComplexGateway',
    'bpmn:EventBasedGateway'
  ];

  // Elementos que SÍ deben ser editables (específicamente los history instance)
  const editableHistoryElements = [
    'RALph:History-AnyInstanceInTime-Green',
    'RALph:History-AnyInstanceInTime-Red'
  ];

  // Listener para doble click - para elementos RALPH (solo para elementos que NO tienen dos etiquetas)
  eventBus.on('element.dblclick', function(event) {
    const element = event.element;
    
    console.log('Double-click event on element:', element.type);
    
    // NO manejar elementos con dos etiquetas aquí - dejar que el label editing provider los maneje
    if (dualLabelElements.includes(element.type) || 
        (element.type === 'label' && element.labelTarget && dualLabelElements.includes(element.labelTarget.type))) {
      return; // Dejar que el label editing provider maneje estos elementos
    }
    
    // NO manejar elementos history instance - dejar que el label editing provider los maneje
    if (editableHistoryElements.includes(element.type)) {
      return; // Dejar que el label editing provider maneje estos elementos
    }
    
    // Solo manejar elementos RALPH que NO tienen dos etiquetas y NO son history instance
    if (canEditRALPHElement(element) && !dualLabelElements.includes(element.type)) {
      console.log('Creating custom editor for element:', element.type);
      
      let targetElement = element;
      
      // Si es un label externo, editar el label externo
      if (element.type === 'label' && element.labelTarget) {
        targetElement = element;
      } 
      // Si es el elemento principal, editar la etiqueta interna
      else if (element.type && element.type.startsWith('RALph:')) {
        if (isExternalLabel(element)) {
          // Crear label externo si no existe
          if (!element.label) {
            createLabel(element, getExternalLabelPosition(element));
          }
          targetElement = element.label;
        } else {
          targetElement = element;
        }
      }
      
      createCustomEditor(targetElement);
    }
  });
  
  // Listener para crear etiquetas externas cuando el usuario hace doble-click en el área correcta
  eventBus.on('canvas.click', function(event) {
    const element = event.element;
    
    // Solo para elementos con dos etiquetas que no tienen etiqueta externa
    if (element && dualLabelElements.includes(element.type) && !element.label) {
      const position = getExternalLabelPosition(element);
      if (position) {
        // Verificar si el click está cerca de donde debería estar la etiqueta externa
        const clickX = event.x;
        const clickY = event.y;
        const labelArea = {
          x: position.x - 50,
          y: position.y - 25,
          width: 100,
          height: 50
        };
        
        if (clickX >= labelArea.x && clickX <= labelArea.x + labelArea.width &&
            clickY >= labelArea.y && clickY <= labelArea.y + labelArea.height) {
          // Crear la etiqueta externa
          createLabel(element, position);
        }
      }
    }
  });

  function createCustomEditor(element) {
    // Limpiar editor anterior si existe
    if (activeInput) {
      activeInput.remove();
      activeInput = null;
    }

    // For external labels, create them if they don't exist (solo para elementos que NO tienen dos etiquetas)
    // NO crear automáticamente etiquetas externas para elementos con dos etiquetas
    if (element.type && element.type.startsWith('RALph:') && isExternalLabel(element) && !element.label && !dualLabelElements.includes(element.type)) {
      createLabel(element, getExternalLabelPosition(element));
      element = element.label; // Use the created label element
    }

    // Show the label if it's hidden (only for external labels)
    // NO mostrar automáticamente etiquetas externas cuando se edita la interna
    if (element.hidden && element.type === 'label' && element.labelTarget && isExternalLabel(element.labelTarget)) {
      element.hidden = false;
      eventBus.fire('element.changed', { element: element });
    }

    // Obtener el contenedor del canvas
    const canvasContainer = canvas.getContainer();
    const canvasRect = canvasContainer.getBoundingClientRect();
    
    // Calcular posición del elemento en la pantalla
    const viewbox = canvas.viewbox();
    const zoom = canvas.zoom();
    
    let elementScreenX, elementScreenY;
    
    // Para elementos con dos etiquetas, posicionar el editor correctamente
    if (element.type === 'label' && element.labelTarget && dualLabelElements.includes(element.labelTarget.type)) {
      // Editor para etiqueta externa - aparecer sobre la etiqueta externa
      elementScreenX = (element.x - viewbox.x) * zoom + canvasRect.left;
      elementScreenY = (element.y - viewbox.y) * zoom + canvasRect.top;
    } else if (dualLabelElements.includes(element.type)) {
      // Editor para etiqueta interna - aparecer sobre el shape
      elementScreenX = (element.x - viewbox.x) * zoom + canvasRect.left + (element.width * zoom) / 2;
      elementScreenY = (element.y - viewbox.y) * zoom + canvasRect.top + (element.height * zoom) / 2;
    } else {
      // Para otros elementos, usar la posición normal centrada
      elementScreenX = (element.x - viewbox.x) * zoom + canvasRect.left + (element.width * zoom) / 2;
      elementScreenY = (element.y - viewbox.y) * zoom + canvasRect.top + (element.height * zoom) / 2;
    }
    
    // Obtener texto actual - diferenciar entre etiqueta interna y externa
    let currentText = '';
    if (element.type === 'label' && element.labelTarget) {
      // Etiqueta externa - usar businessObject.name
      currentText = element.businessObject ? element.businessObject.name || '' : '';
    } else {
      // Etiqueta interna - usar businessObject.text o businessObject.name
      currentText = getRALPHDefaultText(element.labelTarget || element);
      // Si no hay texto por defecto, intentar obtener del businessObject
      if (!currentText && element.businessObject) {
        currentText = element.businessObject.name || element.businessObject.text || '';
      }
    }
    
    // Crear input overlay
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.position = 'fixed';
    
    // Calcular el ancho del input - muy estrecho y corto
    const inputWidth = Math.max(60, Math.min(100, element.width * zoom));
    const inputHeight = Math.max(15, Math.min(18, element.height * zoom));
    
    // Centrar el input sobre el elemento
    input.style.left = (elementScreenX - inputWidth / 2) + 'px';
    input.style.top = (elementScreenY - inputHeight / 2) + 'px';
    input.style.width = inputWidth + 'px';
    input.style.height = inputHeight + 'px';
    input.style.fontSize = (9 * zoom) + 'px';
    input.style.textAlign = 'center';
    input.style.border = 'none';
    input.style.borderRadius = '0px';
    input.style.backgroundColor = 'white';
    input.style.zIndex = '1000';
    input.style.outline = 'none';
    input.style.padding = '0px';
    input.style.caretColor = '#000';
    input.style.color = '#000';
    
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
        
        // Diferenciar entre etiqueta interna y externa
        if (element.type === 'label' && element.labelTarget) {
          // Etiqueta externa - guardar en businessObject.name
          if (!element.businessObject) {
            element.businessObject = { $type: 'bpmn:Label' };
          }
          element.businessObject.name = newText;
          
          // También actualizar el businessObject del target
          if (!element.labelTarget.businessObject) {
            element.labelTarget.businessObject = {};
          }
          element.labelTarget.businessObject.name = newText;
          
          eventBus.fire('element.changed', { element: element });
          // NO tocar la etiqueta interna cuando se edita la externa
        } else {
          // Etiqueta interna - guardar en businessObject.text o businessObject.name
          if (!element.businessObject) {
            element.businessObject = {};
          }
          // Para elementos history instance, usar name
          if (editableHistoryElements.includes(element.type)) {
            element.businessObject.name = newText;
          } else {
            element.businessObject.text = newText;
          }
          eventBus.fire('element.changed', { element: element });
          // NO tocar la etiqueta externa cuando se edita la interna
        }
        
        // Keep the label visible after editing
        if (element.hidden === false) {
          eventBus.fire('element.changed', { element: element });
        }
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
    // Check if element should NOT be editable
    if (element.type && nonEditableElements.includes(element.type)) {
      return false;
    }
    
    // Check if it's a label of a non-editable element
    if (element.type === 'label' && element.labelTarget && element.labelTarget.type && nonEditableElements.includes(element.labelTarget.type)) {
      return false;
    }
    
    // Explicitly allow editing for history instance elements
    if (element.type && editableHistoryElements.includes(element.type)) {
      console.log('History instance element is editable:', element.type);
      return true;
    }
    
    // Check if it's a label of a history instance element
    if (element.type === 'label' && element.labelTarget && element.labelTarget.type && editableHistoryElements.includes(element.labelTarget.type)) {
      console.log('History instance label is editable:', element.labelTarget.type);
      return true;
    }
    
    // Para elementos con dos etiquetas (reports/delegates), permitir edición de ambas
    
    // Si es un label externo de un elemento con dos etiquetas
    if (element.type === 'label' && element.labelTarget && element.labelTarget.type && dualLabelElements.includes(element.labelTarget.type)) {
      return true;
    }
    
    // Si es el elemento principal de un elemento con dos etiquetas
    if (element.type && dualLabelElements.includes(element.type)) {
      return true;
    }
    
    // Para otros elementos RALPH con etiquetas externas
    if (element.type === 'label' && element.labelTarget && element.labelTarget.type && element.labelTarget.type.startsWith('RALph:')) {
      return isExternalLabel(element.labelTarget);
    }
    
    if (element.type && element.type.startsWith('RALph:') && isExternalLabel(element)) {
      return true;
    }
    
    // Allow editing for internal labels (elements in label array but not in externalLabel)
    if (element.type && element.type.startsWith('RALph:') && !isExternalLabel(element)) {
      return true;
    }
    
    return false;
  }

  function getRALPHDefaultText(element) {
    // Verificar que el elemento existe
    if (!element || !element.type) {
      return '';
    }

    // Para elementos no editables, no generar texto por defecto
    if (nonEditableElements.includes(element.type)) {
      return '';
    }

    // Para elementos con dos etiquetas, usar businessObject.text para la interna
    if (dualLabelElements.includes(element.type)) {
      return element.businessObject ? element.businessObject.text || '' : '';
    }

    // Para otros elementos, usar getLabel normal
    const currentText = getLabel(element);
    
    // Si ya tiene texto, devolverlo
    if (currentText && currentText.trim() !== '') {
      return currentText;
    }

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
    if (is(element, 'RALph:Person')) {
      return 'Person';
    }
    if (is(element, 'RALph:RoleRALph')) {
      return 'Role';
    }
    
    // Default text for history instance elements
    if (is(element, 'RALph:History-AnyInstanceInTime-Green')) {
      return 'History Green';
    }
    
    if (is(element, 'RALph:History-AnyInstanceInTime-Red')) {
      return 'History Red';
    }
    
    return '';
  }

  function updateRALPHLabel(element, newText) {
    const safeText = (newText == null || newText === undefined) ? '' : String(newText);
    
    // Para elementos con dos etiquetas (reports/delegates)
    if (dualLabelElements.includes(element.type)) {
      // Para elementos con dos etiquetas, actualizar businessObject.text (etiqueta interna)
      if (!element.businessObject) {
        element.businessObject = {};
      }
      element.businessObject.text = safeText;
      
      eventBus.fire('element.changed', { element: element });
      return;
    }
    
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

    // Solo asignar texto por defecto a etiquetas internas de elementos editables
    if (shape.type && shape.type.startsWith('RALph:') && !isExternalLabel(shape) && !nonEditableElements.includes(shape.type)) {
      if (!shape.businessObject.name) {
        shape.businessObject.name = getRALPHDefaultText(shape);
      }
    }
  });

  eventBus.on('import.done', function() {
    elementRegistry.forEach(function(element) {
      // Solo asignar texto por defecto a etiquetas internas de elementos editables
      if (element.type && element.type.startsWith('RALph:') && !isExternalLabel(element) && !nonEditableElements.includes(element.type)) {
        if (!element.businessObject.name) {
          element.businessObject.name = getRALPHDefaultText(element);
        }
      }
      if (element.type && element.type.startsWith('RALph:')) {
        element._skipInternalLabel = true;
      }
    });
  });

  eventBus.on('shape.move.end', function(event) {
    const element = event.shape;

    if (isLabel(element) && element.labelTarget) return;

    // Para elementos con dos etiquetas, NO mover las etiquetas automáticamente
    
    if (dualLabelElements.includes(element.type)) {
      return; // No mover etiquetas para elementos con dos etiquetas
    }

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

    // External labels should be hidden by default, except for dual label elements
    const shouldHide = isExternalLabel(target) && !dualLabelElements.includes(target.type);

    const labelElement = elementFactory.createLabel({
      id: target.id + '_label',
      businessObject: target.businessObject,
      di: target.di,
      type: 'label',
      labelTarget: target,
      width: 150,
      height: 50,
      hidden: shouldHide // Hide external labels by default
    });

    assign(labelElement, {
      x: position.x - labelElement.width / 2,
      y: position.y - labelElement.height / 2,
      hidden: shouldHide // Hide external labels by default
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
    // Para elementos con dos etiquetas, usar posiciones fijas
    const dualLabelElements = [
      'RALph:reportsDirectly',
      'RALph:reportsTransitively', 
      'RALph:delegatesDirectly',
      'RALph:delegatesTransitively'
    ];
    
    if (dualLabelElements.includes(element.type)) {
      // Posiciones fijas para cada tipo de elemento
      const positions = {
        'RALph:reportsDirectly': { x: element.x + element.width / 2, y: element.y - 30 },
        'RALph:reportsTransitively': { x: element.x + element.width / 2, y: element.y - 30 },
        'RALph:delegatesDirectly': { x: element.x + element.width / 2, y: element.y + element.height + 30 },
        'RALph:delegatesTransitively': { x: element.x + element.width / 2, y: element.y + element.height + 30 }
      };
      return positions[element.type];
    }
    
    // Para otros elementos, usar la lógica normal
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