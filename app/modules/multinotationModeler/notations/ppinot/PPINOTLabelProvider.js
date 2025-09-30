import { assign } from 'min-dash';
import { isExternalLabel, isPPINOTConnection } from './Types';
import { getLabel } from 'bpmn-js/lib/features/label-editing/LabelUtil';
import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function PPINOTLabelProvider(eventBus, modeling, elementFactory, canvas, elementRegistry) {

  // Sistema de edición personalizado solo para conexiones PPINOT
  let activeInput = null;

  // Listener para doble click - solo para conexiones PPINOT
  eventBus.on('element.dblclick', function(event) {
    const element = event.element;
    
    if (canEditPPINOTConnection(element)) {
      console.log('PPINOT double click detected on:', element.type, element.id);
      
      let targetElement = element;
      
      // Si es una conexión PPINOT sin label, crear uno
      if (element.type !== 'label' && isPPINOTConnection(element) && !element.label) {
        console.log('Creating label for PPINOT connection:', element.id);
        const position = getExternalLabelPosition(element);
        console.log('Label position:', position);
        
        const createdLabel = createConnectionLabel(element, position);
        console.log('Created label:', createdLabel);
        
        if (createdLabel) {
          targetElement = createdLabel;
        } else {
          console.warn('Failed to create label for connection:', element.id);
        }
      }
      // Si el elemento tiene un label, editar el label
      else if (element.label && element.type !== 'label') {
        console.log('Using existing label for editing:', element.label.id);
        targetElement = element.label;
      }
      
      // Crear el editor
      if (targetElement) {
        console.log('Opening editor for:', targetElement.type, targetElement.id);
        // Usar un pequeño timeout para asegurar que el DOM esté actualizado
        setTimeout(() => {
          createCustomEditor(targetElement);
        }, 50);
      } else {
        console.warn('No target element found for editing');
      }
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
    const currentText = getPPINOTDefaultText(element.labelTarget || element);
    
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
    
    let isFinishing = false;
    
    // Manejar eventos
    function finishEditing(save = true) {
      if (!activeInput || isFinishing) return;
      
      console.log('finishEditing called with save:', save);
      isFinishing = true;
      const inputToRemove = input;
      activeInput = null; // Set to null first to prevent re-entry
      
      if (save) {
        const rawText = inputToRemove.value;
        const newText = rawText ? rawText.trim() : '';
        console.log('finishEditing - rawText:', rawText, 'newText:', newText);
        updatePPINOTConnectionLabel(element, newText);
      } else {
        console.log('finishEditing - save=false, skipping update');
      }
      
      // Safely remove the input element
      try {
        if (inputToRemove && inputToRemove.parentNode) {
          inputToRemove.parentNode.removeChild(inputToRemove);
        }
      } catch (e) {
        // Element already removed, ignore
      }
      
      console.log('finishEditing completed');
    }
    
    // Enter para guardar
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        finishEditing(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finishEditing(false);
      }
    });
    
    // Perder foco para guardar
    input.addEventListener('blur', function() {
      // Add a small delay to prevent race condition with keydown
      setTimeout(() => {
        finishEditing(true);
      }, 10);
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
      if (is(element, 'PPINOT:MyConnection')) {
        return 'connection';
      }
      // Para cualquier otra conexión PPINOT, usar texto genérico
      return 'Label';
    }
    
    // Nunca devolver cadena vacía - usar texto por defecto
    return 'Label';
  }

  function updatePPINOTConnectionLabel(element, newText) {
    // Validar y normalizar el texto de entrada
    let safeText;
    if (newText == null || newText === undefined || newText === '') {
      safeText = 'Label'; // Usar texto por defecto en lugar de cadena vacía
    } else {
      safeText = String(newText).trim() || 'Label';
    }
    
    console.log('updatePPINOTConnectionLabel - element:', element && element.id, 'safeText:', safeText);
    
    try {
      // EVITAR modeling.updateLabel() que causa el error split()
      // Usar actualización directa del businessObject que es más segura
      
      if (element.type === 'label' && element.labelTarget) {
        // Actualizar la label directamente
        if (!element.businessObject) {
          element.businessObject = { $type: 'bpmn:Label' };
        }
        element.businessObject.name = safeText;
        
        // Actualizar el target también
        if (!element.labelTarget.businessObject) {
          element.labelTarget.businessObject = {};
        }
        element.labelTarget.businessObject.name = safeText;
        
        // Forzar re-render de ambos elementos
        eventBus.fire('element.changed', { element: element });
        eventBus.fire('element.changed', { element: element.labelTarget });
        
        console.log('✅ Label updated via direct businessObject update');
        
      } else {
        // Para elementos sin label externo
        if (!element.businessObject) {
          element.businessObject = {};
        }
        element.businessObject.name = safeText;
        
        eventBus.fire('element.changed', { element: element });
        console.log('✅ Element properties updated via direct businessObject update');
      }
      
    } catch (error) {
      console.error('❌ Error updating PPINOT label:', error);
      // Como último recurso, intentar solo actualizar propiedades mínimas
      try {
        if (element && element.businessObject) {
          element.businessObject.name = safeText;
          eventBus.fire('element.changed', { element: element });
          console.log('✅ Minimal update successful');
        }
      } catch (finalError) {
        console.error('❌ All update methods failed:', finalError);
      }
    }
  }

  // Listener específico para conexiones PPINOT creadas
  eventBus.on('ppinot.connection.created', function(event) {
    const connection = event.connection;

    // Crear labels automáticamente para conexiones PPINOT
    if (connection && isPPINOTConnection(connection) && !connection.label) {
      createConnectionLabel(connection, getExternalLabelPosition(connection));
    }
  });

  function createConnectionLabel(target, position) {
    console.log('createConnectionLabel called with:', target && target.id, position);
    
    if (target.label || !target || !position || 
        typeof position.x !== 'number' || typeof position.y !== 'number') {
      console.log('Early return from createConnectionLabel:', {
        hasLabel: !!target.label,
        hasTarget: !!target,
        hasPosition: !!position,
        validPosition: position && typeof position.x === 'number' && typeof position.y === 'number'
      });
      return null;
    }

    const defaultText = getPPINOTDefaultText(target);
    console.log('Default text for label:', defaultText);

    try {
      // Asegurar que el businessObject del target tiene el nombre
      if (!target.businessObject) {
        target.businessObject = {};
      }
      target.businessObject.name = defaultText;

      const parent = canvas.findRoot(target) || canvas.getRootElement();

      // Crear el businessObject del label
      const labelBusinessObject = {
        $type: 'bpmn:Label',
        name: defaultText
      };

      // Usar elementFactory para crear el label
      const label = elementFactory.createLabel({
        id: target.id + '_label',
        businessObject: labelBusinessObject,
        type: 'label',
        labelTarget: target,
        width: 80,
        height: 20
      });

      // Establecer posición
      label.x = position.x - label.width / 2;
      label.y = position.y - label.height / 2;

      // Establecer referencias cruzadas
      target.label = label;
      label.labelTarget = target;

      // Crear el shape usando modeling
      modeling.createShape(label, {
        x: label.x + label.width / 2,
        y: label.y + label.height / 2
      }, parent);

      // Forzar actualización visual
      eventBus.fire('element.changed', { element: label });
      eventBus.fire('element.changed', { element: target });

      return label;

    } catch (error) {
      console.warn('Error creating connection label:', error);
      // Limpiar en caso de error
      if (target.label) {
        target.label = null;
      }
      return null;
    }
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
      
      // Asegurar que scope y target elementos siempre tengan un nombre válido después de importar
      if (is(element, 'PPINOT:Scope') || is(element, 'PPINOT:Target')) {
        if (!element.businessObject) {
          element.businessObject = {};
        }
        
        // SOLO establecer name si NO existe Y no hay contenido previo guardado
        if (!element.businessObject.name || element.businessObject.name.trim() === '') {
          // Verificar si hay contenido original guardado en localStorage
          const savedElements = JSON.parse(localStorage.getItem('PPINOT_elements') || '[]');
          const savedElement = savedElements.find(saved => saved.id === element.id);
          
          if (savedElement && savedElement.originalName && savedElement.originalName !== element.id) {
            // Restaurar nombre original guardado
            element.businessObject.name = savedElement.originalName;
            console.log(`🔧 Restaurando nombre original para ${element.id}: "${savedElement.originalName}"`);
          } else {
            // Solo usar ID como fallback si no hay contenido original
            const fallbackName = element.id || element.type.replace('PPINOT:', '');
            element.businessObject.name = fallbackName;
            console.log(`⚠️ Usando nombre fallback para ${element.id}: "${fallbackName}"`);
          }
        } else {
          console.log(`✅ Nombre existente preservado para ${element.id}: "${element.businessObject.name}"`);
        }
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
