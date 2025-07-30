// RASCI Mapping Consolidated - Solo funciones utilizadas
// Este archivo contiene únicamente la funcionalidad de mapeo RASCI que se está usando

// ============================================================================
// POSITION MANAGER
// ============================================================================

class SimpleBpmnStylePositionManager {
  constructor() {
    this.positionCache = new Map();
    this.defaultSpacing = 150;
    this.defaultOffset = 100;
  }

  // Calcular posición para elementos especiales
  calculateSpecialElementPosition(baseTask, elementType, index = 0) {
    const basePosition = {
      x: baseTask.x + baseTask.width / 2,
      y: baseTask.y + baseTask.height / 2
    };

    let position;
    switch (elementType) {
      case 'approval':
        position = {
          x: basePosition.x + this.defaultSpacing,
          y: basePosition.y - this.defaultOffset
        };
        break;
      case 'consult':
        position = {
          x: basePosition.x - this.defaultSpacing,
          y: basePosition.y - this.defaultOffset
        };
        break;
      case 'inform':
        position = {
          x: basePosition.x,
          y: basePosition.y + this.defaultOffset
        };
        break;
      default:
        position = {
          x: basePosition.x + (index * this.defaultSpacing),
          y: basePosition.y + this.defaultOffset
        };
    }

    return position;
  }

  // Guardar posición en caché
  cachePosition(elementId, position) {
    this.positionCache.set(elementId, position);
  }

  // Obtener posición desde caché
  getCachedPosition(elementId) {
    return this.positionCache.get(elementId);
  }

  // Limpiar caché
  clearCache() {
    this.positionCache.clear();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Función para encontrar tarea BPMN por nombre o ID
function findBpmnTaskByName(modeler, taskName) {
  const elementRegistry = modeler.get('elementRegistry');
  let foundTask = null;
  
  console.log(`🔍 Buscando tarea BPMN: "${taskName}"`);
  
  // Buscar por ID exacto primero
  foundTask = elementRegistry.get(taskName);
  if (foundTask && foundTask.type === 'bpmn:Task') {
    console.log(`✅ Tarea encontrada por ID: "${taskName}"`);
    return foundTask;
  }
  
  // Buscar por nombre
  elementRegistry.forEach(element => {
    if (element.type === 'bpmn:Task' && element.businessObject && element.businessObject.name === taskName) {
      foundTask = element;
      console.log(`✅ Tarea encontrada por nombre: "${taskName}"`);
    }
  });
  
  if (!foundTask) {
    console.log(`❌ No se encontró tarea BPMN para: "${taskName}"`);
  }
  
  return foundTask;
}

// Función para encontrar la siguiente tarea en el flujo
function findNextTaskInFlow(modeler, currentTask) {
  const elementRegistry = modeler.get('elementRegistry');
  let nextTask = null;
  
  console.log(`🔍 Buscando siguiente tarea para: ${currentTask.businessObject && currentTask.businessObject.name ? currentTask.businessObject.name : currentTask.id}`);
  
  // Mostrar todas las conexiones salientes de la tarea actual
  console.log(`🔍 Conexiones salientes de ${currentTask.id}:`);
  elementRegistry.forEach(connection => {
    if (connection.type === 'bpmn:SequenceFlow' && 
        connection.source && 
        connection.source.id === currentTask.id) {
      const targetName = connection.target.businessObject?.name || connection.target.id;
      const targetType = connection.target.type;
      console.log(`  - ${connection.id}: ${currentTask.id} → ${targetName} (${targetType})`);
    }
  });
  
  // Función recursiva para buscar la siguiente tarea, incluyendo elementos especiales
  function findNextTaskRecursive(task, visited = new Set(), includeSpecialElements = false) {
    if (visited.has(task.id)) {
      console.log(`⚠️ Ciclo detectado, evitando: ${task.businessObject?.name || task.id}`);
      return null;
    }
    visited.add(task.id);
    
    console.log(`🔍 Procesando tarea: ${task.businessObject?.name || task.id} (${task.type})`);
    
    // Buscar conexiones salientes
    const outgoingConnections = elementRegistry.filter(connection => 
      connection.type === 'bpmn:SequenceFlow' && 
      connection.source && 
      connection.source.id === task.id
    );
    
    console.log(`🔍 Encontradas ${outgoingConnections.length} conexiones salientes`);
    
    for (const connection of outgoingConnections) {
      const target = connection.target;
      const targetName = target.businessObject?.name || target.id;
      const targetType = target.type;
      
      console.log(`🔍 Analizando conexión a: ${targetName} (${targetType})`);
      
      // Si estamos incluyendo elementos especiales, procesar todos
      if (includeSpecialElements) {
        // Si es una tarea normal, retornarla
        if (targetType && (
          targetType === 'bpmn:Task' ||
          targetType === 'bpmn:UserTask' ||
          targetType === 'bpmn:ServiceTask' ||
          targetType === 'bpmn:ScriptTask' ||
          targetType === 'bpmn:ManualTask' ||
          targetType === 'bpmn:BusinessRuleTask' ||
          targetType === 'bpmn:SendTask' ||
          targetType === 'bpmn:ReceiveTask' ||
          targetType === 'bpmn:CallActivity' ||
          targetType === 'bpmn:SubProcess'
        )) {
          console.log(`✅ Encontrada siguiente tarea: ${targetName}`);
          return target;
        }
        
        // Si es un gateway, continuar recursivamente
        if (targetType && targetType.includes('Gateway')) {
          console.log(`🔀 Gateway encontrado: ${targetName}, continuando búsqueda...`);
          const nextTask = findNextTaskRecursive(target, visited, true);
          if (nextTask) {
            return nextTask;
          }
        }
        
        // Si es un evento intermedio, continuar recursivamente
        if (targetType && targetType.includes('IntermediateEvent')) {
          console.log(`📢 Evento intermedio encontrado: ${targetName}, continuando búsqueda...`);
          const nextTask = findNextTaskRecursive(target, visited, true);
          if (nextTask) {
            return nextTask;
          }
        }
      } else {
        // Modo normal: ignorar elementos especiales pero buscar más allá de ellos
      if (targetName.startsWith('Aprobar ') || 
          targetName.startsWith('Consultar ') || 
          targetName.startsWith('Informar ') ||
          targetType.includes('Event')) {
          console.log(`⚠️ Saltando elemento especial: ${targetName}, pero continuando búsqueda...`);
          // Continuar buscando desde este elemento especial
          const nextTask = findNextTaskRecursive(target, visited, true);
          if (nextTask) {
            return nextTask;
          }
        continue;
      }
      
      // Si es una tarea normal, retornarla
      if (targetType && (
        targetType === 'bpmn:Task' ||
        targetType === 'bpmn:UserTask' ||
        targetType === 'bpmn:ServiceTask' ||
        targetType === 'bpmn:ScriptTask' ||
        targetType === 'bpmn:ManualTask' ||
        targetType === 'bpmn:BusinessRuleTask' ||
        targetType === 'bpmn:SendTask' ||
        targetType === 'bpmn:ReceiveTask' ||
        targetType === 'bpmn:CallActivity' ||
        targetType === 'bpmn:SubProcess'
      )) {
        console.log(`✅ Encontrada siguiente tarea: ${targetName}`);
        return target;
      }
      
      // Si es un gateway, continuar recursivamente
      if (targetType && targetType.includes('Gateway')) {
        console.log(`🔀 Gateway encontrado: ${targetName}, continuando búsqueda...`);
          const nextTask = findNextTaskRecursive(target, visited, false);
        if (nextTask) {
          return nextTask;
          }
        }
      }
    }
    
    console.log(`❌ No se encontró siguiente tarea para: ${task.businessObject?.name || task.id}`);
    return null;
  }
  
  nextTask = findNextTaskRecursive(currentTask);
  
  if (nextTask) {
    console.log(`✅ Siguiente tarea encontrada: ${nextTask.businessObject?.name || nextTask.id}`);
  } else {
    console.log(`❌ No se encontró siguiente tarea en el flujo`);
  }
  
  return nextTask;
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

// Limpiar elementos que ya no están en la matriz RASCI
function cleanupRemovedElements(modeler, matrix) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  console.log('🧹 Limpiando elementos que ya no están en la matriz RASCI...');
  
  // Obtener todas las tareas del diagrama
  const diagramTasks = [];
  elementRegistry.forEach(element => {
    if (element.type && (
      element.type === 'bpmn:Task' ||
      element.type === 'bpmn:UserTask' ||
      element.type === 'bpmn:ServiceTask' ||
      element.type === 'bpmn:ScriptTask' ||
      element.type === 'bpmn:ManualTask' ||
      element.type === 'bpmn:BusinessRuleTask' ||
      element.type === 'bpmn:SendTask' ||
      element.type === 'bpmn:ReceiveTask' ||
      element.type === 'bpmn:CallActivity' ||
      element.type === 'bpmn:SubProcess'
    )) {
      const taskName = element.businessObject?.name || element.id;
      // Ignorar elementos especiales
      if (!taskName.startsWith('Aprobar ') && 
          !taskName.startsWith('Consultar ') && 
          !taskName.startsWith('Informar ')) {
        diagramTasks.push(taskName);
      }
    }
  });
  
  console.log(`📊 Tareas en el diagrama: ${diagramTasks.join(', ')}`);
  console.log(`📊 Tareas en la matriz: ${Object.keys(matrix).join(', ')}`);
  
  // Para cada tarea en el diagrama, verificar si está en la matriz
  diagramTasks.forEach(taskName => {
    if (!matrix[taskName]) {
      console.log(`⚠️ Tarea ${taskName} no está en la matriz RASCI, pero está en el diagrama`);
      // No eliminamos la tarea del diagrama, solo limpiamos elementos especiales relacionados
      cleanupSpecialElementsForTask(modeler, taskName);
    }
  });
  
  // Limpiar elementos especiales que ya no están en la matriz
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    
    if (!bpmnTask) {
      console.log(`⚠️ Tarea ${taskName} está en la matriz pero no en el diagrama`);
      return;
    }
    
    // Limpiar elementos especiales que ya no están en la matriz
    cleanupSpecialElementsForTask(modeler, taskName, taskRoles);
  });
}



// Limpiar tareas de aprobación duplicadas
function cleanupDuplicateApprovalTasks(modeler, bpmnTask) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  console.log(`🧹 Limpiando tareas de aprobación duplicadas para: ${bpmnTask.businessObject?.name || bpmnTask.id}`);
  
  // Buscar tareas de aprobación existentes
  const existingApprovalTasks = [];
  elementRegistry.forEach(element => {
    if (element.type === 'bpmn:UserTask' && 
        element.businessObject?.name && 
        element.businessObject.name.startsWith('Aprobar ')) {
      
      // Verificar si está conectada a la tarea actual
      const incomingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && 
        conn.target && 
        conn.target.id === element.id
      );
      
      const outgoingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && 
        conn.source && 
        conn.source.id === element.id
      );
      
      // Verificar si está conectada a la tarea base
      const connectedToBase = incomingConnections.some(conn => 
        conn.source && conn.source.id === bpmnTask.id
      );
      
      if (connectedToBase) {
        existingApprovalTasks.push(element);
        console.log(`🔍 Tarea de aprobación existente encontrada: ${element.businessObject.name} (ID: ${element.id})`);
      }
    }
  });
  
  console.log(`📊 Encontradas ${existingApprovalTasks.length} tareas de aprobación existentes`);
  
  // Si hay más de una, eliminar las duplicadas
  if (existingApprovalTasks.length > 1) {
    console.log(`🗑️ Eliminando ${existingApprovalTasks.length - 1} tareas de aprobación duplicadas`);
    
    // Mantener la primera y eliminar las demás
    for (let i = 1; i < existingApprovalTasks.length; i++) {
      const taskToRemove = existingApprovalTasks[i];
      console.log(`🗑️ Eliminando tarea de aprobación: ${taskToRemove.businessObject.name} (ID: ${taskToRemove.id})`);
      
      try {
        modeling.removeElements([taskToRemove]);
        console.log(`✅ Tarea de aprobación eliminada: ${taskToRemove.businessObject.name}`);
      } catch (error) {
        console.error(`❌ Error eliminando tarea de aprobación: ${error.message}`);
      }
    }
  }
}

// Limpiar eventos duplicados
function cleanupDuplicateEvents(modeler, eventName, eventType) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  console.log(`🧹 Limpiando eventos duplicados: ${eventName} (${eventType})`);
  
  const existingEvents = [];
  elementRegistry.forEach(element => {
    if (element.type === 'bpmn:IntermediateThrowEvent' && 
        element.businessObject?.name === eventName) {
      existingEvents.push(element);
      console.log(`🔍 Evento existente encontrado: ${element.businessObject.name} (ID: ${element.id})`);
    }
  });
  
  console.log(`📊 Encontrados ${existingEvents.length} eventos existentes`);
  
  // Si hay más de uno, eliminar los duplicados
  if (existingEvents.length > 1) {
    console.log(`🗑️ Eliminando ${existingEvents.length - 1} eventos duplicados`);
    
    // Mantener el primero y eliminar los demás
    for (let i = 1; i < existingEvents.length; i++) {
      const eventToRemove = existingEvents[i];
      console.log(`🗑️ Eliminando evento: ${eventToRemove.businessObject.name} (ID: ${eventToRemove.id})`);
      
      try {
        modeling.removeElements([eventToRemove]);
        console.log(`✅ Evento eliminado: ${eventToRemove.businessObject.name}`);
      } catch (error) {
        console.error(`❌ Error eliminando evento: ${error.message}`);
      }
    }
  }
}

// ============================================================================
// ELEMENT CREATION FUNCTIONS
// ============================================================================

// Crear tarea de aprobación
function createApprovalTask(modeler, sourceElement, roleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔄 Creando tarea de aprobación para rol: ${roleName}`);
  console.log(`📋 Elemento fuente: ${sourceElement.businessObject?.name || sourceElement.id}`);
  console.log(`📍 Posición del elemento fuente: x=${sourceElement.x}, y=${sourceElement.y}`);
  
  // Limpiar tareas de aprobación duplicadas antes de crear una nueva
  cleanupDuplicateApprovalTasks(modeler, sourceElement);
  
  // Verificar si ya existe una tarea de aprobación para este rol
  const approvalTaskName = `Aprobar ${roleName}`;
  const existingApprovalTask = elementRegistry.find(element => 
    element.type === 'bpmn:UserTask' && 
    element.businessObject?.name === approvalTaskName
  );
  
  if (existingApprovalTask) {
    console.log(`ℹ️ Tarea de aprobación ya existe para rol: ${roleName}`);
    return existingApprovalTask;
  }
  
  try {
    // Buscar la siguiente tarea en el flujo DESDE el elemento fuente
    console.log(`🔍 Buscando siguiente tarea en el flujo desde: ${sourceElement.businessObject?.name || sourceElement.id}`);
    const nextTask = findNextTaskInFlow(modeler, sourceElement);
    if (!nextTask) {
      console.warn(`⚠️ No se encontró siguiente tarea para insertar tarea de aprobación`);
      console.warn(`⚠️ El elemento ${sourceElement.businessObject?.name || sourceElement.id} parece ser el último del flujo`);
      return null;
    }
    
    console.log(`✅ Siguiente tarea encontrada: ${nextTask.businessObject?.name || nextTask.id}`);
    console.log(`📍 Posición de la siguiente tarea: x=${nextTask.x}, y=${nextTask.y}`);

    const rootElement = canvas.getRootElement();
    
    // Calcular posición en el medio del flujo
    const approvalPosition = {
      x: (sourceElement.x + nextTask.x) / 2,
      y: (sourceElement.y + nextTask.y) / 2
    };
    
    console.log(`📍 Posición calculada para la tarea de aprobación: x=${approvalPosition.x}, y=${approvalPosition.y}`);
    
    // Crear la tarea de aprobación
    console.log(`🔨 Creando tarea de aprobación...`);
    const approvalTask = modeling.createShape(
      { type: 'bpmn:UserTask' },
      approvalPosition,
      rootElement
    );

    if (!approvalTask) {
      console.error(`❌ Error: No se pudo crear la tarea de aprobación`);
      return null;
    }

    console.log(`✅ Tarea de aprobación creada con ID: ${approvalTask.id}`);

    // Configurar la tarea de aprobación con el nombre del rol
    modeling.updateProperties(approvalTask, {
      name: approvalTaskName
    });

    console.log(`✅ Tarea de aprobación configurada con nombre: ${approvalTaskName}`);

    // Buscar la conexión original entre el elemento fuente y la siguiente tarea
    let originalConnection = null;
    elementRegistry.forEach(connection => {
      if (connection.type === 'bpmn:SequenceFlow' &&
          connection.source && connection.target &&
          connection.source.id === sourceElement.id &&
          connection.target.id === nextTask.id) {
        originalConnection = connection;
        console.log(`🔍 Conexión original encontrada: ${connection.id}`);
      }
    });

    if (originalConnection) {
      // Eliminar la conexión original
      modeling.removeConnection(originalConnection);
      console.log(`🗑️ Eliminada conexión original: ${sourceElement.businessObject?.name || sourceElement.id} → ${nextTask.businessObject?.name || nextTask.id}`);
    } else {
      console.warn(`⚠️ No se encontró conexión original entre los elementos`);
    }

    // Crear nuevas conexiones: Elemento Fuente → Aprobación → Siguiente Tarea
    console.log(`🔗 Creando conexión 1: ${sourceElement.id} → ${approvalTask.id}`);
    const connection1 = modeling.connect(sourceElement, approvalTask, { type: 'bpmn:SequenceFlow' });
    
    console.log(`🔗 Creando conexión 2: ${approvalTask.id} → ${nextTask.id}`);
    const connection2 = modeling.connect(approvalTask, nextTask, { type: 'bpmn:SequenceFlow' });
    
    if (connection1 && connection2) {
      results.approvalTasks++;
      console.log(`✅ Tarea de aprobación insertada en flujo: ${sourceElement.businessObject?.name || sourceElement.id} → ${approvalTaskName} → ${nextTask.businessObject?.name || nextTask.id}`);
      console.log(`📊 Total de tareas de aprobación: ${results.approvalTasks}`);
      
      // Conectar la tarea de aprobación al rol que la hace
      console.log(`🔗 Conectando tarea de aprobación al rol: ${roleName}`);
      createSimpleAssignment(modeler, approvalTask, roleName, results);
    } else {
      console.error(`❌ Error creando conexiones para la tarea de aprobación`);
      if (!connection1) console.error(`❌ Falló conexión 1: ${sourceElement.id} → ${approvalTask.id}`);
      if (!connection2) console.error(`❌ Falló conexión 2: ${approvalTask.id} → ${nextTask.id}`);
    }
    
    return approvalTask;
    
  } catch (error) {
    console.error(`❌ Error creando tarea de aprobación: ${error.message}`);
    console.error(`❌ Stack trace:`, error.stack);
    return null;
  }
  // Obtener la tarea BPMN base y reconstruir el flujo
  const bpmnTaskBase = findAssociatedBpmnTask(modeler, sourceElement) || sourceElement;
  rebuildSpecialFlow(modeler, bpmnTaskBase);
}

// Crear evento de consulta
function createConsultEvent(modeler, sourceElement, roles, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔄 Creando evento de consulta para roles: ${roles.join(', ')}`);
  console.log(`📋 Elemento fuente: ${sourceElement.businessObject?.name || sourceElement.id}`);
  console.log(`📍 Posición del elemento fuente: x=${sourceElement.x}, y=${sourceElement.y}`);
  
  try {
    // Convertir roles a array si es un string
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    // Verificar si ya existe un evento de consulta para esta tarea y roles
    const consultEventName = roleArray.length === 1 
      ? `Consultar ${roleArray[0]}`
      : `Consultar ${roleArray.join(' y ')}`;
    
    console.log(`🔍 Buscando evento existente: ${consultEventName}`);
    
    // Buscar evento de consulta existente
    let existingConsultEvent = null;
    elementRegistry.forEach(element => {
      if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') && 
          element.businessObject && 
          element.businessObject.name === consultEventName) {
        existingConsultEvent = element;
        console.log(`✅ Evento de consulta existente encontrado: ${element.id}`);
      }
    });
    
    if (existingConsultEvent) {
      console.log(`✓ Evento de consulta ya existe: ${consultEventName}`);
      return existingConsultEvent;
    }
    
    // Buscar la siguiente tarea en el flujo DESDE el elemento fuente
    console.log(`🔍 Buscando siguiente tarea en el flujo desde: ${sourceElement.businessObject?.name || sourceElement.id}`);
    const nextTask = findNextTaskInFlow(modeler, sourceElement);
    if (!nextTask) {
      console.warn(`⚠️ No se encontró siguiente tarea para insertar evento de consulta`);
      console.warn(`⚠️ El elemento ${sourceElement.businessObject?.name || sourceElement.id} parece ser el último del flujo`);
      return null;
    }
    
    console.log(`✅ Siguiente tarea encontrada: ${nextTask.businessObject?.name || nextTask.id}`);
    console.log(`📍 Posición de la siguiente tarea: x=${nextTask.x}, y=${nextTask.y}`);

    const rootElement = canvas.getRootElement();
    
    // Calcular posición en el medio del flujo
    const consultPosition = {
      x: (sourceElement.x + nextTask.x) / 2,
      y: (sourceElement.y + nextTask.y) / 2
    };
    
    console.log(`📍 Posición calculada para el evento: x=${consultPosition.x}, y=${consultPosition.y}`);
    
    // Crear evento intermedio de mensaje tipo throw
    console.log(`🔨 Creando evento intermedio...`);
    const consultEvent = modeling.createShape(
      { type: 'bpmn:IntermediateThrowEvent' },
      consultPosition,
      rootElement
    );

    if (!consultEvent) {
      console.error(`❌ Error: No se pudo crear el evento de consulta`);
      return null;
    }

    console.log(`✅ Evento creado con ID: ${consultEvent.id}`);

    // Agregar definición de mensaje al evento
    const moddle = modeler.get('moddle');
    const messageEventDefinition = moddle.create('bpmn:MessageEventDefinition');
    consultEvent.businessObject.eventDefinitions = [messageEventDefinition];

    // Configurar el evento de consulta con el nombre del rol
    modeling.updateProperties(consultEvent, {
      name: consultEventName
    });

    console.log(`✅ Evento configurado con nombre: ${consultEventName}`);

    // Buscar la conexión original entre el elemento fuente y la siguiente tarea
    let originalConnection = null;
    elementRegistry.forEach(connection => {
      if (connection.type === 'bpmn:SequenceFlow' &&
          connection.source && connection.target &&
          connection.source.id === sourceElement.id &&
          connection.target.id === nextTask.id) {
        originalConnection = connection;
        console.log(`🔍 Conexión original encontrada: ${connection.id}`);
      }
    });

    if (originalConnection) {
      // Eliminar la conexión original
      modeling.removeConnection(originalConnection);
      console.log(`🗑️ Eliminada conexión original: ${sourceElement.businessObject?.name || sourceElement.id} → ${nextTask.businessObject?.name || nextTask.id}`);
    } else {
      console.warn(`⚠️ No se encontró conexión original entre los elementos`);
    }

    // Crear nuevas conexiones: Elemento Fuente → Evento → Siguiente Tarea
    console.log(`🔗 Creando conexión 1: ${sourceElement.id} → ${consultEvent.id}`);
    const connection1 = modeling.connect(sourceElement, consultEvent, { type: 'bpmn:SequenceFlow' });
    
    console.log(`🔗 Creando conexión 2: ${consultEvent.id} → ${nextTask.id}`);
    const connection2 = modeling.connect(consultEvent, nextTask, { type: 'bpmn:SequenceFlow' });
    
    if (connection1 && connection2) {
      results.messageFlows++;
      console.log(`✅ Evento de consulta insertado en flujo: ${sourceElement.businessObject?.name || sourceElement.id} → ${consultEventName} → ${nextTask.businessObject?.name || nextTask.id}`);
      console.log(`📊 Total de flujos de mensaje: ${results.messageFlows}`);
      
      // Los eventos de consulta NO se conectan a roles (son solo eventos informativos)
      console.log(`ℹ️ Evento de consulta creado sin conexión a roles (solo informativo)`);
    } else {
      console.error(`❌ Error creando conexiones para el evento de consulta`);
      if (!connection1) console.error(`❌ Falló conexión 1: ${sourceElement.id} → ${consultEvent.id}`);
      if (!connection2) console.error(`❌ Falló conexión 2: ${consultEvent.id} → ${nextTask.id}`);
    }
    
    return consultEvent;
    
  } catch (error) {
    console.error(`❌ Error creando evento de consulta: ${error.message}`);
    console.error(`❌ Stack trace:`, error.stack);
    return null;
  }
  // Obtener la tarea BPMN base y reconstruir el flujo
  const bpmnTaskBase = findAssociatedBpmnTask(modeler, sourceElement) || sourceElement;
  rebuildSpecialFlow(modeler, bpmnTaskBase);
}

// Crear evento de información
function createInfoEvent(modeler, sourceElement, roles, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔄 Creando evento de información para roles: ${roles.join(', ')}`);
  console.log(`📋 Elemento fuente: ${sourceElement.businessObject?.name || sourceElement.id}`);
  console.log(`📍 Posición del elemento fuente: x=${sourceElement.x}, y=${sourceElement.y}`);
  
  try {
    // Convertir roles a array si es un string
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    // Verificar si ya existe un evento de información para esta tarea y roles
    const infoEventName = roleArray.length === 1 
      ? `Informar ${roleArray[0]}`
      : `Informar ${roleArray.join(' y ')}`;
    
    console.log(`🔍 Buscando evento existente: ${infoEventName}`);
    
    // Buscar evento de información existente
    let existingInfoEvent = null;
    elementRegistry.forEach(element => {
      if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') && 
          element.businessObject && 
          element.businessObject.name === infoEventName) {
        existingInfoEvent = element;
        console.log(`✅ Evento de información existente encontrado: ${element.id}`);
      }
    });
    
    if (existingInfoEvent) {
      console.log(`✓ Evento de información ya existe: ${infoEventName}`);
      return existingInfoEvent;
    }

    // Buscar la siguiente tarea en el flujo DESDE el elemento fuente
    console.log(`🔍 Buscando siguiente tarea en el flujo desde: ${sourceElement.businessObject?.name || sourceElement.id}`);
    const nextTask = findNextTaskInFlow(modeler, sourceElement);
    if (!nextTask) {
      console.warn(`⚠️ No se encontró siguiente tarea para insertar evento de información`);
      console.warn(`⚠️ El elemento ${sourceElement.businessObject?.name || sourceElement.id} parece ser el último del flujo`);
      return null;
    }
    
    console.log(`✅ Siguiente tarea encontrada: ${nextTask.businessObject?.name || nextTask.id}`);
    console.log(`📍 Posición de la siguiente tarea: x=${nextTask.x}, y=${nextTask.y}`);

    const rootElement = canvas.getRootElement();
    
    // Calcular posición en el medio del flujo
    const infoPosition = {
      x: (sourceElement.x + nextTask.x) / 2,
      y: (sourceElement.y + nextTask.y) / 2
    };
    
    console.log(`📍 Posición calculada para el evento: x=${infoPosition.x}, y=${infoPosition.y}`);
    
    // Crear evento intermedio de mensaje tipo throw
    console.log(`🔨 Creando evento intermedio...`);
    const infoEvent = modeling.createShape(
      { type: 'bpmn:IntermediateThrowEvent' },
      infoPosition,
      rootElement
    );

    if (!infoEvent) {
      console.error(`❌ Error: No se pudo crear el evento de información`);
      return null;
    }

    console.log(`✅ Evento creado con ID: ${infoEvent.id}`);

    // Agregar definición de mensaje al evento
    const moddle = modeler.get('moddle');
    const messageEventDefinition = moddle.create('bpmn:MessageEventDefinition');
    infoEvent.businessObject.eventDefinitions = [messageEventDefinition];

    // Configurar el evento de información con el nombre del rol
    modeling.updateProperties(infoEvent, {
      name: infoEventName
    });

    console.log(`✅ Evento configurado con nombre: ${infoEventName}`);

    // Buscar la conexión original entre el elemento fuente y la siguiente tarea
    let originalConnection = null;
    elementRegistry.forEach(connection => {
      if (connection.type === 'bpmn:SequenceFlow' &&
          connection.source && connection.target &&
          connection.source.id === sourceElement.id &&
          connection.target.id === nextTask.id) {
        originalConnection = connection;
        console.log(`🔍 Conexión original encontrada: ${connection.id}`);
      }
    });

    if (originalConnection) {
      // Eliminar la conexión original
      modeling.removeConnection(originalConnection);
      console.log(`🗑️ Eliminada conexión original: ${sourceElement.businessObject?.name || sourceElement.id} → ${nextTask.businessObject?.name || nextTask.id}`);
    } else {
      console.warn(`⚠️ No se encontró conexión original entre los elementos`);
    }

    // Crear nuevas conexiones: Elemento Fuente → Evento → Siguiente Tarea
    console.log(`🔗 Creando conexión 1: ${sourceElement.id} → ${infoEvent.id}`);
    const connection1 = modeling.connect(sourceElement, infoEvent, { type: 'bpmn:SequenceFlow' });
    
    console.log(`🔗 Creando conexión 2: ${infoEvent.id} → ${nextTask.id}`);
    const connection2 = modeling.connect(infoEvent, nextTask, { type: 'bpmn:SequenceFlow' });
    
    if (connection1 && connection2) {
      results.infoEvents++;
      console.log(`✅ Evento de información insertado en flujo: ${sourceElement.businessObject?.name || sourceElement.id} → ${infoEventName} → ${nextTask.businessObject?.name || nextTask.id}`);
      console.log(`📊 Total de eventos informativos: ${results.infoEvents}`);
      
      // Conectar el evento de información a los roles que informa
      console.log(`🔗 Conectando evento de información a los roles: ${roleArray.join(', ')}`);
      roleArray.forEach(roleName => {
        createSimpleAssignment(modeler, infoEvent, roleName, results);
      });
    } else {
      console.error(`❌ Error creando conexiones para el evento de información`);
      if (!connection1) console.error(`❌ Falló conexión 1: ${sourceElement.id} → ${infoEvent.id}`);
      if (!connection2) console.error(`❌ Falló conexión 2: ${infoEvent.id} → ${nextTask.id}`);
    }
    
    return infoEvent;
    
  } catch (error) {
    console.error(`❌ Error creando evento de información: ${error.message}`);
    console.error(`❌ Stack trace:`, error.stack);
    return null;
  }
  // Obtener la tarea BPMN base y reconstruir el flujo
  const bpmnTaskBase = findAssociatedBpmnTask(modeler, sourceElement) || sourceElement;
  rebuildSpecialFlow(modeler, bpmnTaskBase);
}

// Crear rol RALph
function createRalphRole(modeler, roleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔄 Creando rol RALph: ${roleName}`);
  
  // Verificar si el rol ya existe
  const existingRole = elementRegistry.find(element => 
    (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
    element.businessObject?.name === roleName
  );
  
  if (existingRole) {
    console.log(`ℹ️ Rol RALph ya existe: ${roleName}`);
    return existingRole;
  }
  
  try {
    const rootElement = canvas.getRootElement();
    
    // Calcular posición (en la parte superior del canvas)
    const position = { x: 100 + (results.rolesCreated * 200), y: 100 };
    
    // Crear el rol RALph
    const role = modeling.createShape(
      { type: 'RALph:RoleRALph' },
      position,
      rootElement
    );

    // Configurar el rol con el nombre
    modeling.updateProperties(role, {
      name: roleName
    });
    
    console.log(`✅ Rol RALph creado: ${role.businessObject.name} (ID: ${role.id})`);
    results.rolesCreated++;
    
    return role;
    
  } catch (error) {
    console.error(`❌ Error creando rol RALph: ${error.message}`);
    return null;
  }
}

// Crear puerta AND para conectar múltiples roles
function createAndGate(modeler, bpmnTask, roles, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔄 Creando puerta AND para roles: ${roles.join(', ')}`);
  
  // Verificar si ya existe una puerta AND para esta tarea
  const existingAndGate = findExistingAndGate(modeler, bpmnTask);
  if (existingAndGate) {
    console.log(`ℹ️ Puerta AND ya existe para esta tarea, verificando conexiones...`);
    
    // Verificar que todos los roles estén conectados al AND existente
    roles.forEach(roleName => {
      const role = elementRegistry.find(element => 
        (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
        element.businessObject?.name === roleName
      );
      
      if (role) {
        const isConnected = elementRegistry.some(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          conn.source?.id === role.id &&
          conn.target?.id === existingAndGate.id
        );
        
        if (!isConnected) {
          console.log(`🔄 Conectando rol ${roleName} a puerta AND existente`);
          modeling.connect(role, existingAndGate, { type: 'RALph:ResourceArc' });
          results.roleAssignments++;
        } else {
          console.log(`ℹ️ Rol ${roleName} ya está conectado a la puerta AND`);
        }
      }
    });
    
    return existingAndGate;
  }
  
  try {
    const rootElement = canvas.getRootElement();
    
    // Calcular posición cerca de la tarea
    const position = {
      x: bpmnTask.x + 200,
      y: bpmnTask.y
    };
    
    // Crear la puerta AND
    const andGate = modeling.createShape(
      { type: 'RALph:Complex-Assignment-AND' },
      position,
      rootElement
    );

    if (!andGate) {
      console.error(`❌ Error: No se pudo crear la puerta AND`);
      return null;
    }

    console.log(`✅ Puerta AND creada con ID: ${andGate.id}`);

    // Conectar la tarea a la puerta AND
    const taskToGate = modeling.connect(bpmnTask, andGate, { type: 'RALph:ResourceArc' });
    
    // Conectar cada rol a la puerta AND
    roles.forEach(roleName => {
      // Crear o buscar el rol
      let role = elementRegistry.find(element => 
        (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
        element.businessObject?.name === roleName
      );
      
      if (!role) {
        console.log(`⚠️ Rol no encontrado: ${roleName}, creando...`);
        role = createRalphRole(modeler, roleName, results);
      }
      
      if (role) {
        const roleToGate = modeling.connect(role, andGate, { type: 'RALph:ResourceArc' });
        console.log(`✅ Rol ${roleName} conectado a puerta AND`);
        results.roleAssignments++;
      }
    });
    
    console.log(`✅ Puerta AND creada y conectada para roles: ${roles.join(', ')}`);
    return andGate;
    
  } catch (error) {
    console.error(`❌ Error creando puerta AND: ${error.message}`);
    return null;
  }
}

// Crear asignación simple
function createSimpleAssignment(modeler, bpmnTask, roleName, results) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔄 Creando asignación simple para rol: ${roleName}`);
  
  try {
    // Buscar el rol RALph
    let role = elementRegistry.find(element => 
      (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
      element.businessObject?.name === roleName
    );
    
    if (!role) {
      console.log(`⚠️ Rol RALph no encontrado: ${roleName}, creando...`);
      role = createRalphRole(modeler, roleName, results);
    }
    
    if (!role) {
      console.error(`❌ No se pudo crear o encontrar el rol: ${roleName}`);
      return null;
    }
    
    // Verificar si ya existe una asignación entre esta tarea y este rol
    const existingAssignment = elementRegistry.find(element => 
      (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association') &&
      element.source && element.target &&
      ((element.source.id === bpmnTask.id && element.target.id === role.id) ||
       (element.source.id === role.id && element.target.id === bpmnTask.id))
    );
    
    if (existingAssignment) {
      console.log(`✓ Asignación ya existe: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${roleName}`);
      return existingAssignment;
    }
    
    // Crear la asignación (conexión entre tarea y rol)
    const assignment = modeling.connect(bpmnTask, role, { type: 'RALph:ResourceArc' });
    
    console.log(`✅ Asignación simple creada: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${roleName}`);
    results.roleAssignments++;
    
    return assignment;
    
  } catch (error) {
    console.error(`❌ Error creando asignación simple: ${error.message}`);
    return null;
  }
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

// Verificar si existe un elemento especial
function checkSpecialElementExists(modeler, taskName, roleName, elementType) {
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔍 Verificando si existe elemento especial: ${elementType} para rol ${roleName} en tarea ${taskName}`);
  
  let searchPattern;
  switch (elementType) {
    case 'approval':
      searchPattern = `Aprobar ${roleName}`;
      break;
    case 'consult':
      searchPattern = `Consultar ${roleName}`;
      break;
    case 'inform':
      searchPattern = `Informar ${roleName}`;
      break;
    default:
      searchPattern = roleName;
  }
  
  // Buscar elementos que coincidan con el patrón
  const existingElements = [];
  elementRegistry.forEach(element => {
    const elementName = element.businessObject?.name || '';
    
    if (elementName.includes(searchPattern)) {
      // Verificar conexiones para confirmar que está relacionado con la tarea
      const connections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && 
        (conn.source?.id === element.id || conn.target?.id === element.id)
      );
      
      if (connections.length > 0) {
        existingElements.push(element);
        console.log(`🔍 Elemento especial encontrado: ${elementName} (ID: ${element.id})`);
      }
    }
  });
  
  const exists = existingElements.length > 0;
  console.log(`🔍 Resultado verificación ${elementType}: ${exists ? 'EXISTE' : 'NO EXISTE'}`);
  
  return exists;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Limpieza específica y conservadora - solo elimina elementos RASCI añadidos
function cleanupSpecificChanges(modeler, matrix) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  console.log('🧹 Aplicando limpieza específica de elementos RASCI...');
  
  // Obtener el estado anterior de la matriz
  const previousMatrixData = localStorage.getItem('previousRasciMatrixData');
  if (!previousMatrixData) {
    console.log('ℹ️ No hay matriz anterior, aplicando limpieza completa...');
    // Si no hay matriz anterior, limpiar todos los elementos especiales
    Object.keys(matrix).forEach(taskName => {
      const bpmnTask = findBpmnTaskByName(modeler, taskName);
      if (bpmnTask) {
        cleanupSpecialElementsForTask(modeler, taskName, matrix[taskName] || {}, {});
        cleanupUnnecessaryAndGates(modeler, bpmnTask, matrix[taskName] || {}, {});
        restoreOriginalFlowIfNeeded(modeler, bpmnTask, matrix[taskName] || {});
      }
    });
    return;
  }
  
  try {
    const previousMatrix = JSON.parse(previousMatrixData);
    
    // Procesar cada tarea en la matriz
    Object.keys(matrix).forEach(taskName => {
      const currentRoles = matrix[taskName] || {};
      const previousRoles = previousMatrix[taskName] || {};
      
      const bpmnTask = findBpmnTaskByName(modeler, taskName);
      if (!bpmnTask) return;
      
      // Solo limpiar si hay cambios reales en esta tarea
      const hasChangesInTask = JSON.stringify(currentRoles) !== JSON.stringify(previousRoles);
      
      if (hasChangesInTask) {
        console.log(`🔄 Cambios detectados en tarea ${taskName}, aplicando limpieza...`);
        
        // 1. Limpiar elementos especiales (A, C, I) que ya no están en la matriz
        cleanupSpecialElementsForTask(modeler, taskName, currentRoles, previousRoles);
        
        // 2. Limpiar puertas AND que ya no son necesarias
        cleanupUnnecessaryAndGates(modeler, bpmnTask, currentRoles, previousRoles);
      } else {
        console.log(`ℹ️ No hay cambios en tarea ${taskName}, preservando elementos`);
      }
      
      // 3. Restaurar flujo original si no quedan elementos especiales (siempre verificar)
      restoreOriginalFlowIfNeeded(modeler, bpmnTask, currentRoles);
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza específica:', error);
  }
}

// Limpiar elementos especiales (A, C, I) que ya no están en la matriz
function cleanupSpecialElementsForTask(modeler, taskName, currentRoles, previousRoles) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  console.log(`🧹 Limpiando elementos especiales para: ${taskName}`);
  
  // Buscar elementos especiales existentes
  const specialElements = [];
  elementRegistry.forEach(element => {
    const elementName = element.businessObject?.name || '';
    
    // Solo considerar elementos RASCI (Aprobar, Consultar, Informar)
    if (elementName.startsWith('Aprobar ') || 
        elementName.startsWith('Consultar ') || 
        elementName.startsWith('Informar ')) {
      
      // Verificar si está en el flujo de la tarea
      if (isElementInTaskFlow(modeler, findBpmnTaskByName(modeler, taskName), element)) {
        specialElements.push(element);
        console.log(`🔍 Elemento especial encontrado: ${elementName}`);
      }
    }
  });
  
  // Eliminar elementos que ya no están en la matriz actual
  specialElements.forEach(element => {
    const elementName = element.businessObject?.name || '';
    
    // Extraer el rol del nombre del elemento
    let roleName = '';
    if (elementName.startsWith('Aprobar ')) {
      roleName = elementName.replace('Aprobar ', '');
    } else if (elementName.startsWith('Consultar ')) {
      roleName = elementName.replace('Consultar ', '');
    } else if (elementName.startsWith('Informar ')) {
      roleName = elementName.replace('Informar ', '');
    }
    
    // Verificar si el rol ya no tiene esta responsabilidad
    const currentResponsibility = currentRoles[roleName];
    const previousResponsibility = previousRoles[roleName];
    
    let shouldRemove = false;
    
    // Solo eliminar si el rol existe en la matriz actual pero cambió de responsabilidad
    // O si el rol ya no existe en la matriz actual
    if (elementName.startsWith('Aprobar ')) {
      if (currentResponsibility === undefined) {
        // Rol eliminado de la matriz
        shouldRemove = true;
        console.log(`🗑️ Rol ${roleName} eliminado de la matriz, eliminando elemento ${elementName}`);
      } else if (currentResponsibility !== 'A') {
        // Rol cambió de responsabilidad
        shouldRemove = true;
        console.log(`🗑️ Rol ${roleName} cambió de A a ${currentResponsibility}, eliminando elemento ${elementName}`);
      } else {
        console.log(`✅ Elemento ${elementName} mantiene responsabilidad A, preservando`);
      }
    } else if (elementName.startsWith('Consultar ')) {
      if (currentResponsibility === undefined) {
        shouldRemove = true;
        console.log(`🗑️ Rol ${roleName} eliminado de la matriz, eliminando elemento ${elementName}`);
      } else if (currentResponsibility !== 'C') {
        shouldRemove = true;
        console.log(`🗑️ Rol ${roleName} cambió de C a ${currentResponsibility}, eliminando elemento ${elementName}`);
      } else {
        console.log(`✅ Elemento ${elementName} mantiene responsabilidad C, preservando`);
      }
    } else if (elementName.startsWith('Informar ')) {
      if (currentResponsibility === undefined) {
        shouldRemove = true;
        console.log(`🗑️ Rol ${roleName} eliminado de la matriz, eliminando elemento ${elementName}`);
      } else if (currentResponsibility !== 'I') {
        shouldRemove = true;
        console.log(`🗑️ Rol ${roleName} cambió de I a ${currentResponsibility}, eliminando elemento ${elementName}`);
      } else {
        console.log(`✅ Elemento ${elementName} mantiene responsabilidad I, preservando`);
      }
    }
    
    if (shouldRemove) {
      try {
        modeling.removeElements([element]);
        console.log(`✅ Eliminado elemento especial: ${elementName}`);
      } catch (error) {
        console.error(`❌ Error eliminando elemento especial: ${error.message}`);
      }
    }
  });
  
  // Después de eliminar elementos especiales, verificar si necesitamos restaurar el flujo
  const bpmnTask = findBpmnTaskByName(modeler, taskName);
  if (bpmnTask) {
    // Verificar si quedan otros elementos especiales antes de restaurar
    const remainingSpecialElements = findExistingSpecialElements(modeler, bpmnTask);
    console.log(`🔍 Elementos especiales restantes después de limpieza: ${remainingSpecialElements.length}`);
    
    if (remainingSpecialElements.length > 0) {
      // Quedan elementos especiales, reconstruir el flujo con los restantes
      console.log(`🔄 Reconstruyendo flujo con elementos especiales restantes`);
      rebuildSpecialFlow(modeler, bpmnTask);
    } else {
      // No quedan elementos especiales, usar la nueva lógica de restauración
      console.log(`🔄 No quedan elementos especiales, verificando restauración`);
      restoreOriginalFlowIfNeeded(modeler, bpmnTask, currentRoles);
    }
  }
}

// Limpiar puertas AND que ya no son necesarias
function cleanupUnnecessaryAndGates(modeler, bpmnTask, currentRoles, previousRoles) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // Contar roles R y S actuales
  const responsibleRoles = Object.keys(currentRoles).filter(role => currentRoles[role] === 'R');
  const supportRoles = Object.keys(currentRoles).filter(role => currentRoles[role] === 'S');
  
  // Si solo hay un R y no hay S, eliminar la puerta AND si existe
  if (responsibleRoles.length === 1 && supportRoles.length === 0) {
    const andGate = findExistingAndGate(modeler, bpmnTask);
    if (andGate) {
      console.log(`🗑️ Eliminando puerta AND innecesaria para ${bpmnTask.businessObject?.name || bpmnTask.id}`);
      try {
        modeling.removeElements([andGate]);
        console.log(`✅ Puerta AND eliminada`);
        
        // Reconectar el rol R directamente
        const responsibleRole = responsibleRoles[0];
        createSimpleAssignment(modeler, bpmnTask, responsibleRole, { roleAssignments: 0 });
        console.log(`✅ Rol R ${responsibleRole} reconectado directamente`);
      } catch (error) {
        console.error(`❌ Error eliminando puerta AND: ${error.message}`);
      }
    }
  }
}

// Restaurar flujo original si no quedan elementos especiales
function restoreOriginalFlowIfNeeded(modeler, bpmnTask, currentRoles) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  console.log(`🔄 Verificando restauración de flujo para: ${bpmnTask.businessObject?.name || bpmnTask.id}`);
  
  // 1. Verificar si hay elementos especiales en la matriz actual
  const hasSpecialElementsInMatrix = Object.values(currentRoles).some(resp => resp === 'A' || resp === 'C' || resp === 'I');
  
  // 2. Verificar si hay elementos especiales existentes en el canvas
  const existingSpecialElements = findExistingSpecialElements(modeler, bpmnTask);
  const hasSpecialElementsInCanvas = existingSpecialElements.length > 0;
  
  console.log(`📊 Estado de elementos especiales:`);
  console.log(`  - En matriz: ${hasSpecialElementsInMatrix ? 'SÍ' : 'NO'}`);
  console.log(`  - En canvas: ${hasSpecialElementsInCanvas ? 'SÍ' : 'NO'}`);
  console.log(`  - Elementos existentes: ${existingSpecialElements.map(el => el.businessObject?.name || el.id).join(', ')}`);
  
  if (!hasSpecialElementsInMatrix && !hasSpecialElementsInCanvas) {
    // No hay elementos especiales en matriz ni en canvas, restaurar flujo original
    console.log(`🔄 No hay elementos especiales, restaurando flujo original`);
    restoreOriginalFlow(modeler, bpmnTask);
  } else if (hasSpecialElementsInMatrix && hasSpecialElementsInCanvas) {
    // Hay elementos especiales en ambos, reconstruir el flujo con los elementos restantes
    console.log(`🔄 Hay elementos especiales en matriz y canvas, reconstruyendo flujo`);
    rebuildSpecialFlow(modeler, bpmnTask);
  } else if (!hasSpecialElementsInMatrix && hasSpecialElementsInCanvas) {
    // No hay elementos especiales en matriz pero sí en canvas, limpiar y restaurar
    console.log(`🔄 Limpiando elementos especiales obsoletos y restaurando flujo original`);
    cleanupObsoleteSpecialElements(modeler, bpmnTask);
    restoreOriginalFlow(modeler, bpmnTask);
  } else {
    // Hay elementos especiales en matriz pero no en canvas, crear los elementos
    console.log(`🔄 Hay elementos especiales en matriz pero no en canvas, creando elementos`);
    // Esto se maneja en la función principal de mapeo
  }
}

// === FUNCIÓN: Restaurar flujo original ===
function restoreOriginalFlow(modeler, bpmnTask) {
  restoreOriginalFlowSafely(modeler, bpmnTask);
}

// === NUEVA FUNCIÓN: Restaurar flujo original de forma segura ===
function restoreOriginalFlowSafely(modeler, bpmnTask) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  console.log(`🔄 Restaurando flujo original de forma segura para: ${bpmnTask.businessObject?.name || bpmnTask.id}`);
  
  // Buscar el siguiente elemento en el flujo original (ignorando elementos especiales)
  const nextTask = findNextTaskInOriginalFlow(modeler, bpmnTask);
  if (!nextTask) {
    console.warn(`⚠️ No se encontró siguiente tarea para restaurar flujo`);
    return;
  }
  
  console.log(`✅ Siguiente tarea encontrada: ${nextTask.businessObject?.name || nextTask.id}`);
  
  // PASO 1: Limpiar TODAS las conexiones salientes de la tarea base
  console.log(`🧹 Limpiando todas las conexiones salientes de la tarea base...`);
  elementRegistry.forEach(conn => {
    if (conn.type === 'bpmn:SequenceFlow' && conn.source?.id === bpmnTask.id) {
      try {
        modeling.removeConnection(conn);
        console.log(`🗑️ Eliminada conexión saliente: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${conn.target?.businessObject?.name || conn.target?.id}`);
      } catch (e) {
        console.warn('⚠️ Error al eliminar conexión saliente:', e.message);
      }
    }
  });
  
  // PASO 2: Crear conexión directa con la siguiente tarea
  console.log(`🔗 Creando conexión directa con la siguiente tarea...`);
  try {
    modeling.connect(bpmnTask, nextTask, { type: 'bpmn:SequenceFlow' });
    console.log(`✅ Flujo original restaurado: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${nextTask.businessObject?.name || nextTask.id}`);
  } catch (error) {
    console.error(`❌ Error restaurando flujo original: ${error.message}`);
  }
}

// === FUNCIÓN: Limpiar elementos especiales obsoletos ===
function cleanupObsoleteSpecialElements(modeler, bpmnTask) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  console.log(`🧹 Limpiando elementos especiales obsoletos para: ${bpmnTask.businessObject?.name || bpmnTask.id}`);
  
  // Buscar elementos especiales en el flujo de la tarea
  const specialElements = [];
  elementRegistry.forEach(element => {
    const elementName = element.businessObject?.name || '';
    
    if ((elementName.startsWith('Aprobar ') || 
         elementName.startsWith('Consultar ') || 
         elementName.startsWith('Informar ')) &&
        isElementInTaskFlow(modeler, bpmnTask, element)) {
      specialElements.push(element);
      console.log(`🔍 Elemento especial obsoleto encontrado: ${elementName}`);
    }
  });
  
  // Eliminar elementos especiales obsoletos
  if (specialElements.length > 0) {
    try {
      modeling.removeElements(specialElements);
      console.log(`✅ Eliminados ${specialElements.length} elementos especiales obsoletos`);
    } catch (error) {
      console.error(`❌ Error eliminando elementos especiales obsoletos: ${error.message}`);
    }
  } else {
    console.log(`ℹ️ No se encontraron elementos especiales obsoletos`);
  }
}

// Buscar la siguiente tarea en el flujo original (ignorando elementos especiales)
function findNextTaskInOriginalFlow(modeler, currentTask) {
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔍 Buscando siguiente tarea original para: ${currentTask.businessObject?.name || currentTask.id}`);
  
  // Función recursiva para buscar la siguiente tarea, saltando elementos especiales
  function findNextTaskRecursive(task, visited = new Set()) {
    if (visited.has(task.id)) {
      return null; // Evitar ciclos
    }
    visited.add(task.id);
    
    // Buscar conexiones salientes
    const outgoingConnections = elementRegistry.filter(connection => 
      connection.type === 'bpmn:SequenceFlow' && 
      connection.source && 
      connection.source.id === task.id
    );
    
    for (const connection of outgoingConnections) {
      const target = connection.target;
      const targetName = target.businessObject?.name || target.id;
      const targetType = target.type;
      
      // Si es un elemento especial, continuar buscando desde él
      if (targetName.startsWith('Aprobar ') || 
          targetName.startsWith('Consultar ') || 
          targetName.startsWith('Informar ')) {
        console.log(`⚠️ Saltando elemento especial: ${targetName}`);
        const nextTask = findNextTaskRecursive(target, visited);
        if (nextTask) {
          return nextTask;
        }
        continue;
      }
      
      // Si es una tarea normal, retornarla
      if (targetType && (
        targetType === 'bpmn:Task' ||
        targetType === 'bpmn:UserTask' ||
        targetType === 'bpmn:ServiceTask' ||
        targetType === 'bpmn:ScriptTask' ||
        targetType === 'bpmn:ManualTask' ||
        targetType === 'bpmn:BusinessRuleTask' ||
        targetType === 'bpmn:SendTask' ||
        targetType === 'bpmn:ReceiveTask' ||
        targetType === 'bpmn:CallActivity' ||
        targetType === 'bpmn:SubProcess'
      )) {
        console.log(`✅ Encontrada siguiente tarea original: ${targetName}`);
        return target;
      }
      
      // Si es un gateway, continuar recursivamente
      if (targetType && targetType.includes('Gateway')) {
        const nextTask = findNextTaskRecursive(target, visited);
        if (nextTask) {
          return nextTask;
        }
      }
    }
    
    return null;
  }
  
  return findNextTaskRecursive(currentTask);
}

// Obtener el nombre esperado de un elemento basado en rol y responsabilidad
function getExpectedElementName(roleName, responsibility) {
  switch (responsibility) {
    case 'A': return `Aprobar ${roleName}`;
    case 'C': return `Consultar ${roleName}`;
    case 'I': return `Informar ${roleName}`;
    default: return '';
  }
}

// Verificar si existe una puerta AND para una tarea
function findExistingAndGate(modeler, bpmnTask) {
  const elementRegistry = modeler.get('elementRegistry');
  
  return elementRegistry.find(element => 
    element.type === 'RALph:Complex-Assignment-AND' &&
    elementRegistry.some(conn => 
      conn.type === 'RALph:ResourceArc' &&
      conn.source?.id === bpmnTask.id &&
      conn.target?.id === element.id
    )
  );
}

// Verificar si un rol R está conectado directamente a una tarea
function isRoleDirectlyConnected(modeler, bpmnTask, roleName) {
  const elementRegistry = modeler.get('elementRegistry');
  
  const role = elementRegistry.find(element => 
    (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
    element.businessObject?.name === roleName
  );
  
  if (!role) return false;
  
  return elementRegistry.some(conn => 
    (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
    conn.source?.id === bpmnTask.id &&
    conn.target?.id === role.id
  );
}

// Eliminar conexión directa entre tarea y rol
function removeDirectConnection(modeler, bpmnTask, roleName) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  const role = elementRegistry.find(element => 
    (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
    element.businessObject?.name === roleName
  );
  
  if (!role) return;
  
  const connection = elementRegistry.find(conn => 
    (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
    conn.source?.id === bpmnTask.id &&
    conn.target?.id === role.id
  );
  
  if (connection) {
    try {
      modeling.removeElements([connection]);
      console.log(`✅ Eliminada conexión directa: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${roleName}`);
    } catch (error) {
      console.error(`❌ Error eliminando conexión directa: ${error.message}`);
    }
  }
}

// Eliminar puerta AND y reconectar R directamente
function removeAndGateAndReconnectR(modeler, bpmnTask, responsibleRole) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  const andGate = findExistingAndGate(modeler, bpmnTask);
  if (!andGate) return;
  
  console.log(`🗑️ Eliminando puerta AND y reconectando R: ${responsibleRole}`);
  
  try {
    // Eliminar la puerta AND y todas sus conexiones
    modeling.removeElements([andGate]);
    console.log(`✅ Puerta AND eliminada`);
    
    // Reconectar el rol R directamente a la tarea
    createSimpleAssignment(modeler, bpmnTask, responsibleRole, { roleAssignments: 0 });
    console.log(`✅ Rol R ${responsibleRole} reconectado directamente`);
    
  } catch (error) {
    console.error(`❌ Error eliminando puerta AND: ${error.message}`);
  }
}

// Limpiar conexiones específicas cuando se elimina un rol S
function cleanupRoleConnections(modeler, roleName) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  console.log(`🧹 Limpiando conexiones para rol eliminado: ${roleName}`);
  
  // Buscar el rol
  const role = elementRegistry.find(element => 
    (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
    element.businessObject?.name === roleName
  );
  
  if (!role) {
    console.log(`ℹ️ Rol ${roleName} no encontrado para limpiar conexiones`);
    return;
  }
  
  // Buscar todas las conexiones que involucran a este rol
  const connectionsToRemove = [];
  elementRegistry.forEach(element => {
    if (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association') {
      if ((element.source && element.source.id === role.id) ||
          (element.target && element.target.id === role.id)) {
        connectionsToRemove.push(element);
        console.log(`🔍 Conexión encontrada para eliminar: ${element.id}`);
      }
    }
  });
  
  // Eliminar las conexiones
  if (connectionsToRemove.length > 0) {
    try {
      modeling.removeElements(connectionsToRemove);
      console.log(`✅ Eliminadas ${connectionsToRemove.length} conexiones para rol ${roleName}`);
    } catch (error) {
      console.error(`❌ Error eliminando conexiones: ${error.message}`);
    }
  } else {
    console.log(`ℹ️ No se encontraron conexiones para eliminar del rol ${roleName}`);
  }
}

// Verificar si hay cambios en la matriz que requieran limpieza
function checkForMatrixChanges(modeler, matrix) {
  const elementRegistry = modeler.get('elementRegistry');
  
  // Obtener el estado anterior de la matriz desde localStorage
  const previousMatrixData = localStorage.getItem('previousRasciMatrixData');
  if (!previousMatrixData) {
    console.log('📋 No hay matriz anterior, asumiendo cambios...');
    return true;
  }
  
  try {
    const previousMatrix = JSON.parse(previousMatrixData);
    
    // Comparar matrices
    const currentKeys = Object.keys(matrix);
    const previousKeys = Object.keys(previousMatrix);
    
    // Verificar si hay tareas nuevas o eliminadas
    if (currentKeys.length !== previousKeys.length) {
      console.log('📊 Número de tareas cambiado, se requieren cambios');
      return true;
    }
    
    // Verificar cada tarea y detectar roles eliminados
    for (const taskName of currentKeys) {
      const currentRoles = matrix[taskName] || {};
      const previousRoles = previousMatrix[taskName] || {};
      
      const currentRoleKeys = Object.keys(currentRoles);
      const previousRoleKeys = Object.keys(previousRoles);
      
      // Verificar si hay roles nuevos o eliminados
      if (currentRoleKeys.length !== previousRoleKeys.length) {
        console.log(`📊 Roles cambiaron para tarea ${taskName}, se requieren cambios`);
        
        // Detectar roles eliminados y limpiar sus conexiones
        previousRoleKeys.forEach(roleName => {
          if (!currentRoles[roleName]) {
            console.log(`🗑️ Rol ${roleName} eliminado de ${taskName}, limpiando conexiones`);
            cleanupRoleConnections(modeler, roleName);
          }
        });
        
        return true;
      }
      
      // Verificar si hay cambios en las responsabilidades
      for (const roleName of currentRoleKeys) {
        if (currentRoles[roleName] !== previousRoles[roleName]) {
          console.log(`📊 Responsabilidad cambiada para ${taskName} - ${roleName}, se requieren cambios`);
          return true;
        }
      }
      
      // Verificar roles eliminados en esta tarea
      previousRoleKeys.forEach(roleName => {
        if (!currentRoles[roleName]) {
          console.log(`🗑️ Rol ${roleName} eliminado de ${taskName}, limpiando conexiones`);
          cleanupRoleConnections(modeler, roleName);
        }
      });
    }
    
    // Verificar si hay diferencias en el contenido de las matrices
    const currentMatrixString = JSON.stringify(matrix);
    const previousMatrixString = JSON.stringify(previousMatrix);
    
    if (currentMatrixString !== previousMatrixString) {
      console.log('📊 Contenido de matriz cambiado, se requieren cambios');
      return true;
    }
    
    console.log('✅ No se detectaron cambios en la matriz');
    return false;
    
  } catch (error) {
    console.error('❌ Error comparando matrices:', error);
    return true; // En caso de error, asumir que hay cambios
  }
}

// ============================================================================
// MAIN MAPPING FUNCTION
// ============================================================================

// Función principal de mapeo RASCI
export function executeSimpleRasciMapping(modeler, matrix) {
  console.log('🚀 Iniciando mapeo RASCI simplificado...');
  console.log('📋 Matriz RASCI:', matrix);
  
  // VERIFICAR ESTADO DE LA MATRIZ ANTES DEL MAPEO
  console.log('🔍 Verificando estado de la matriz antes del mapeo...');
  verifyMatrixStateBeforeMapping();
  
  // Inicializar gestor de posiciones
  const positionManager = new SimpleBpmnStylePositionManager();
  
  // Inicializar resultados
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: 0
  };
  
  // Hacer que positionManager esté disponible globalmente para las funciones internas
  window.currentPositionManager = positionManager;
  
  // PRIMERO: Analizar el canvas actual y comparar con la matriz
  console.log('🔍 Fase 1: Analizando canvas actual vs matriz...');
  
  // Obtener todos los elementos especiales del canvas
  const canvasAnalysis = analyzeCanvasElements(modeler);
  console.log('📊 Análisis del canvas:', canvasAnalysis);
  
  // Comparar con la matriz actual y determinar qué mantener/eliminar/añadir
  const comparisonResult = compareCanvasWithMatrix(canvasAnalysis, matrix);
  console.log('📋 Resultado de comparación:', comparisonResult);
  
  // SEGUNDO: Limpiar elementos que no coinciden con la matriz
  console.log('🧹 Fase 2: Limpiando elementos que no coinciden...');
  cleanupNonMatchingElements(modeler, comparisonResult.elementsToRemove);
  
  // TERCERO: Marcar elementos que se mantienen
  console.log('✅ Fase 3: Marcando elementos que se mantienen...');
  markElementsToKeep(modeler, comparisonResult.elementsToKeep);
  
  // SEGUNDO: Mapear nombres de tareas
  console.log('📋 Fase 2: Mapeando tareas...');
  const taskMappings = {};
  Object.keys(matrix).forEach(taskName => {
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    if (bpmnTask) {
      taskMappings[taskName] = bpmnTask;
      console.log(`✅ Tarea mapeada: ${taskName} → ${bpmnTask.businessObject?.name || bpmnTask.id}`);
    } else {
      console.log(`❌ Tarea no encontrada: ${taskName}`);
    }
  });
  
  // CUARTO: Procesar elementos nuevos que necesitan ser añadidos
  console.log('🆕 Fase 4: Añadiendo elementos nuevos...');
  
  // Obtener elementos que se van a añadir desde la comparación
  const elementsToAdd = comparisonResult.elementsToAdd;
  console.log(`📋 Elementos a añadir: ${elementsToAdd.length}`);
  
  // Procesar cada elemento nuevo
  elementsToAdd.forEach(item => {
    console.log(`🆕 Procesando elemento nuevo: ${item.type} - ${item.name}`);
    
    switch (item.type) {
      case 'role':
        // Crear rol RALph
        createRalphRole(modeler, item.name, results);
        break;
        
      case 'approval':
        // Crear tarea de aprobación
        // Necesitamos encontrar la tarea BPMN correspondiente
        const taskForApproval = findTaskForRole(matrix, item.name);
        if (taskForApproval) {
          const bpmnTask = findBpmnTaskByName(modeler, taskForApproval);
          if (bpmnTask) {
            createApprovalTask(modeler, bpmnTask, item.name, results);
          }
        }
        break;
        
      case 'consult':
        // Crear evento de consulta
        const taskForConsult = findTaskForRole(matrix, item.name);
        if (taskForConsult) {
          const bpmnTask = findBpmnTaskByName(modeler, taskForConsult);
          if (bpmnTask) {
            createConsultEvent(modeler, bpmnTask, [item.name], results);
          }
        }
        break;
        
      case 'info':
        // Crear evento de información
        const taskForInfo = findTaskForRole(matrix, item.name);
        if (taskForInfo) {
          const bpmnTask = findBpmnTaskByName(modeler, taskForInfo);
          if (bpmnTask) {
            createInfoEvent(modeler, bpmnTask, [item.name], results);
          }
        }
        break;
    }
  });
  
  // QUINTO: Procesar tareas para asignaciones y conexiones
  console.log('🔗 Fase 5: Procesando asignaciones y conexiones...');
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    const bpmnTask = taskMappings[taskName];
    
    if (!bpmnTask) {
      console.log(`⚠️ Saltando tarea no encontrada: ${taskName}`);
      return;
    }
    
    console.log(`📋 Procesando asignaciones para tarea: ${taskName}`);
    
    // Clasificar roles por tipo de responsabilidad
    const responsibleRoles = [];
    const supportRoles = [];
    const consultRoles = [];
    const approveRoles = [];
    const informRoles = [];
    
    Object.keys(taskRoles).forEach(roleKey => {
      const roleName = roleKey;
      const responsibility = taskRoles[roleKey];
      
      switch (responsibility) {
        case 'R':
          responsibleRoles.push(roleName);
          break;
        case 'S':
          supportRoles.push(roleName);
          break;
        case 'C':
          consultRoles.push(roleName);
          break;
        case 'A':
          approveRoles.push(roleName);
          break;
        case 'I':
          informRoles.push(roleName);
          break;
      }
    });
    
    console.log(`📊 Roles clasificados para ${taskName}:`);
    console.log(`  - Responsible (R): ${responsibleRoles.length > 0 ? responsibleRoles.join(', ') : 'ninguno'}`);
    console.log(`  - Support (S): ${supportRoles.length > 0 ? supportRoles.join(', ') : 'ninguno'}`);
    console.log(`  - Consult (C): ${consultRoles.length > 0 ? consultRoles.join(', ') : 'ninguno'}`);
    console.log(`  - Approve (A): ${approveRoles.length > 0 ? approveRoles.join(', ') : 'ninguno'}`);
    console.log(`  - Inform (I): ${informRoles.length > 0 ? informRoles.join(', ') : 'ninguno'}`);
    
    // Procesar roles responsables (R) y de soporte (S) con transiciones inteligentes
    if (responsibleRoles.length === 0 && supportRoles.length === 0) {
      console.log(`ℹ️ No hay roles R o S para procesar en ${taskName}`);
    } else if (responsibleRoles.length === 1 && supportRoles.length === 0) {
      // Solo un rol R, usar asignación simple
      const roleName = responsibleRoles[0];
      console.log(`🔄 Procesando solo rol R: ${roleName}`);
      
      // Verificar si hay una puerta AND existente que debe eliminarse
      const existingAndGate = findExistingAndGate(modeler, bpmnTask);
      if (existingAndGate) {
        console.log(`🔄 Transición: Eliminando puerta AND y reconectando R directamente`);
        removeAndGateAndReconnectR(modeler, bpmnTask, roleName);
      } else {
        // Verificar si ya está conectado directamente
        if (!isRoleDirectlyConnected(modeler, bpmnTask, roleName)) {
          console.log(`🔄 Creando rol R y conectándolo directamente: ${roleName}`);
          createRalphRole(modeler, roleName, results);
          createSimpleAssignment(modeler, bpmnTask, roleName, results);
        } else {
          console.log(`ℹ️ Rol R ${roleName} ya está conectado directamente`);
        }
      }
    } else {
      // Hay múltiples roles o hay S, usar puerta AND
      const allRoles = [...responsibleRoles, ...supportRoles];
      console.log(`🔄 Procesando roles con puerta AND: R=${responsibleRoles.join(', ')}, S=${supportRoles.join(', ')}`);
      
      // Verificar si hay una puerta AND existente
      const existingAndGate = findExistingAndGate(modeler, bpmnTask);
      
      if (existingAndGate) {
        console.log(`ℹ️ Puerta AND ya existe, verificando roles...`);
        // Solo crear roles que no existan
        allRoles.forEach(roleName => {
          console.log(`🔄 Verificando/creando rol: ${roleName}`);
          createRalphRole(modeler, roleName, results);
        });
      } else {
        console.log(`🔄 Transición: Creando nueva puerta AND`);
        
        // Si hay un R conectado directamente, eliminarlo primero
        if (responsibleRoles.length === 1) {
          const responsibleRole = responsibleRoles[0];
          if (isRoleDirectlyConnected(modeler, bpmnTask, responsibleRole)) {
            console.log(`🔄 Transición: Eliminando conexión directa de R antes de crear AND`);
            removeDirectConnection(modeler, bpmnTask, responsibleRole);
          }
        }
        
        // Crear todos los roles
        allRoles.forEach(roleName => {
          console.log(`🔄 Creando rol para AND: ${roleName}`);
          createRalphRole(modeler, roleName, results);
        });
        
        // Crear puerta AND
        createAndGate(modeler, bpmnTask, allRoles, results);
      }
    }
    
    // Procesar roles especiales en el ORDEN CORRECTO: C → A → I
    if (consultRoles.length > 0 || approveRoles.length > 0 || informRoles.length > 0) {
      console.log(`🔍 Procesando elementos especiales para: ${taskName} en orden: C → A → I`);
      
      // Crear elementos especiales secuencialmente
      createSequentialSpecialElements(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results);
      
    } else {
      console.log(`ℹ️ No hay roles especiales para procesar en ${taskName}`);
    }
  });
  
  console.log(`✅ Mapeo RASCI completado:`, results);
  console.log(`📊 Resumen: ${results.rolesCreated} roles, ${results.roleAssignments} asignaciones, ${results.approvalTasks} aprobaciones, ${results.messageFlows} consultas, ${results.infoEvents} informaciones`);
  
  // Log adicional para verificar que el mapeo se ejecutó
  console.log('🔍 Verificando elementos creados en el canvas...');
  const elementRegistry = modeler.get('elementRegistry');
  let rolesCount = 0;
  let approvalTasksCount = 0;
  let consultEventsCount = 0;
  let infoEventsCount = 0;
  
  elementRegistry.forEach(element => {
    const elementName = element.businessObject?.name || '';
    if (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') {
      rolesCount++;
    } else if (elementName.startsWith('Aprobar ')) {
      approvalTasksCount++;
    } else if (elementName.startsWith('Consultar ')) {
      consultEventsCount++;
    } else if (elementName.startsWith('Informar ')) {
      infoEventsCount++;
    }
  });
  
  console.log(`📊 Elementos en canvas: ${rolesCount} roles, ${approvalTasksCount} aprobaciones, ${consultEventsCount} consultas, ${infoEventsCount} informaciones`);
  
  // Guardar el estado actual de la matriz para futuras comparaciones
  try {
    localStorage.setItem('previousRasciMatrixData', JSON.stringify(matrix));
    console.log('💾 Estado de matriz guardado para futuras comparaciones');
  } catch (error) {
    console.warn('⚠️ No se pudo guardar el estado de la matriz:', error);
  }
  
  return results;
}

// Función para encontrar elementos especiales existentes para una tarea
function findExistingSpecialElements(modeler, bpmnTask) {
  const elementRegistry = modeler.get('elementRegistry');
  const existingElements = {
    consultEvents: [],
    approvalTasks: [],
    infoEvents: []
  };
  
  console.log(`🔍 Buscando elementos especiales existentes para: ${bpmnTask.businessObject?.name || bpmnTask.id}`);
  
  // Buscar elementos especiales de forma más simple y directa
  elementRegistry.forEach(element => {
    const elementName = element.businessObject?.name || '';
    
    // Verificar si es un elemento especial y está en el canvas
    if (elementName.startsWith('Consultar ')) {
      existingElements.consultEvents.push(element);
      console.log(`🔍 Evento de consulta encontrado: ${elementName} (ID: ${element.id})`);
    } else if (elementName.startsWith('Aprobar ')) {
      existingElements.approvalTasks.push(element);
      console.log(`🔍 Tarea de aprobación encontrada: ${elementName} (ID: ${element.id})`);
    } else if (elementName.startsWith('Informar ')) {
      existingElements.infoEvents.push(element);
      console.log(`🔍 Evento de información encontrado: ${elementName} (ID: ${element.id})`);
    }
  });
  
  // NO ordenar elementos por ahora - usar orden simple
  console.log(`📊 Elementos especiales encontrados:`, {
    consultEvents: existingElements.consultEvents.length,
    approvalTasks: existingElements.approvalTasks.length,
    infoEvents: existingElements.infoEvents.length
  });
  
  return existingElements;
}

// Función para analizar todos los elementos especiales del canvas
function analyzeCanvasElements(modeler) {
  const elementRegistry = modeler.get('elementRegistry');
  const analysis = {
    tasks: {},
    roles: {},
    approvalTasks: {},
    consultEvents: {},
    infoEvents: {},
    andGates: {},
    connections: {}
  };
  
  console.log('🔍 Analizando elementos del canvas...');
  
  elementRegistry.forEach(element => {
    const elementName = element.businessObject?.name || '';
    const elementId = element.id;
    const elementType = element.type;
    
    console.log(`🔍 Elemento: ${elementName} (${elementType}) - ID: ${elementId}`);
    
    // Analizar tareas BPMN (por nombre Y por ID)
    if (elementType === 'bpmn:Task' || 
        elementType === 'bpmn:UserTask' || 
        elementType === 'bpmn:ServiceTask' || 
        elementType === 'bpmn:ScriptTask' || 
        elementType === 'bpmn:ManualTask' || 
        elementType === 'bpmn:BusinessRuleTask' || 
        elementType === 'bpmn:SendTask' || 
        elementType === 'bpmn:ReceiveTask' || 
        elementType === 'bpmn:CallActivity' || 
        elementType === 'bpmn:SubProcess') {
      
      // NO incluir tareas de aprobación aquí
      if (!elementName.startsWith('Aprobar ')) {
        // Usar tanto nombre como ID como clave
        const taskKey = elementName || elementId;
        analysis.tasks[taskKey] = {
          id: elementId,
          element: element,
          type: 'task',
          name: elementName,
          businessObjectName: elementName,
          businessObjectId: element.businessObject?.id || elementId
        };
        console.log(`✅ Tarea BPMN encontrada: "${taskKey}"`);
      }
    }
    
    // Analizar roles RALph (por nombre Y por ID)
    if (elementType === 'RALph:RoleRALph' || elementType === 'ralph:Role') {
      const roleKey = elementName || elementId;
      analysis.roles[roleKey] = {
        id: elementId,
        element: element,
        type: 'role',
        name: elementName,
        businessObjectName: elementName,
        businessObjectId: element.businessObject?.id || elementId
      };
      console.log(`✅ Rol RALph encontrado: "${roleKey}"`);
    }
    
    // Analizar tareas de aprobación
    if (elementName.startsWith('Aprobar ')) {
      const roleName = elementName.replace('Aprobar ', '');
      analysis.approvalTasks[roleName] = {
        id: elementId,
        element: element,
        type: 'approval',
        roleName: roleName,
        name: elementName,
        businessObjectName: elementName,
        businessObjectId: element.businessObject?.id || elementId
      };
      console.log(`✅ Tarea de aprobación encontrada: "${roleName}"`);
    }
    
    // Analizar eventos de consulta
    if (elementName.startsWith('Consultar ')) {
      const roleName = elementName.replace('Consultar ', '');
      analysis.consultEvents[roleName] = {
        id: elementId,
        element: element,
        type: 'consult',
        roleName: roleName,
        name: elementName,
        businessObjectName: elementName,
        businessObjectId: element.businessObject?.id || elementId
      };
      console.log(`✅ Evento de consulta encontrado: "${roleName}"`);
    }
    
    // Analizar eventos de información
    if (elementName.startsWith('Informar ')) {
      const roleName = elementName.replace('Informar ', '');
      analysis.infoEvents[roleName] = {
        id: elementId,
        element: element,
        type: 'info',
        roleName: roleName,
        name: elementName,
        businessObjectName: elementName,
        businessObjectId: element.businessObject?.id || elementId
      };
      console.log(`✅ Evento de información encontrado: "${roleName}"`);
    }
    
    // Analizar compuertas AND
    if (elementType === 'bpmn:ParallelGateway') {
      analysis.andGates[elementId] = {
        id: elementId,
        element: element,
        type: 'andGate',
        name: elementName,
        businessObjectName: elementName,
        businessObjectId: element.businessObject?.id || elementId
      };
      console.log(`✅ Compuerta AND encontrada: "${elementId}"`);
    }
    
    // Analizar conexiones
    if (elementType === 'bpmn:SequenceFlow' || 
        elementType === 'RALph:ResourceArc' || 
        elementType === 'bpmn:Association') {
      const connectionKey = `${element.source?.id || 'unknown'}_${element.target?.id || 'unknown'}`;
      analysis.connections[connectionKey] = {
        id: elementId,
        element: element,
        type: 'connection',
        source: element.source?.id,
        target: element.target?.id,
        sourceName: element.source?.businessObject?.name || element.source?.id,
        targetName: element.target?.businessObject?.name || element.target?.id
      };
      console.log(`🔗 Conexión encontrada: ${element.source?.businessObject?.name || element.source?.id} → ${element.target?.businessObject?.name || element.target?.id}`);
    }
  });
  
  console.log(`📊 RESUMEN DE ELEMENTOS ENCONTRADOS:`);
  console.log(`  - Tareas BPMN: ${Object.keys(analysis.tasks).length}`);
  console.log(`  - Roles RALph: ${Object.keys(analysis.roles).length}`);
  console.log(`  - Tareas de aprobación: ${Object.keys(analysis.approvalTasks).length}`);
  console.log(`  - Eventos de consulta: ${Object.keys(analysis.consultEvents).length}`);
  console.log(`  - Eventos de información: ${Object.keys(analysis.infoEvents).length}`);
  console.log(`  - Compuertas AND: ${Object.keys(analysis.andGates).length}`);
  console.log(`  - Conexiones: ${Object.keys(analysis.connections).length}`);
  
  // Mostrar detalles de cada tipo
  console.log(`📋 TAREAS BPMN:`, Object.keys(analysis.tasks));
  console.log(`📋 ROLES RALPH:`, Object.keys(analysis.roles));
  console.log(`📋 APROBACIONES:`, Object.keys(analysis.approvalTasks));
  console.log(`📋 CONSULTAS:`, Object.keys(analysis.consultEvents));
  console.log(`📋 INFORMACIONES:`, Object.keys(analysis.infoEvents));
  
  return analysis;
}

// Función para comparar el canvas con la matriz
function compareCanvasWithMatrix(canvasAnalysis, matrix) {
  const result = {
    elementsToKeep: [],
    elementsToRemove: [],
    elementsToAdd: []
  };
  
  console.log('🔍 Comparando canvas con matriz...');
  console.log('📋 Matriz actual:', matrix);
  console.log('📋 Tareas en canvas:', Object.keys(canvasAnalysis.tasks));
  
  // Para cada tarea en la matriz
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    console.log(`🔍 Procesando tarea: ${taskName}`);
    console.log(`📋 Roles en matriz:`, taskRoles);
    
    // Verificar si la tarea existe en el canvas (por nombre o ID)
    const taskExists = canvasAnalysis.tasks[taskName] || 
                      Object.values(canvasAnalysis.tasks).find(task => 
                        task.businessObjectId === taskName || 
                        task.id === taskName
                      );
    
    if (taskExists) {
      console.log(`✅ Tarea ${taskName} existe en canvas`);
      
      // Para cada rol en la tarea
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        console.log(`🔍 Procesando rol: ${roleName} (${responsibility})`);
        
        // Verificar si el rol existe (por nombre o ID)
        const roleExists = canvasAnalysis.roles[roleName] || 
                          Object.values(canvasAnalysis.roles).find(role => 
                            role.businessObjectId === roleName || 
                            role.id === roleName
                          );
        
        if (roleExists) {
          console.log(`✅ Rol ${roleName} existe en canvas`);
          result.elementsToKeep.push({
            type: 'role',
            name: roleName,
            element: roleExists.element
          });
        } else {
          console.log(`❌ Rol ${roleName} NO existe en canvas - se añadirá`);
          result.elementsToAdd.push({
            type: 'role',
            name: roleName,
            responsibility: responsibility
          });
        }
        
        // Verificar elementos especiales según responsabilidad
        switch (responsibility) {
          case 'A':
            const approvalExists = canvasAnalysis.approvalTasks[roleName] || 
                                  Object.values(canvasAnalysis.approvalTasks).find(approval => 
                                    approval.roleName === roleName
                                  );
            if (approvalExists) {
              console.log(`✅ Aprobación para ${roleName} existe en canvas`);
              result.elementsToKeep.push({
                type: 'approval',
                name: roleName,
                element: approvalExists.element
              });
            } else {
              console.log(`❌ Aprobación para ${roleName} NO existe en canvas - se añadirá`);
              result.elementsToAdd.push({
                type: 'approval',
                name: roleName,
                responsibility: responsibility
              });
            }
            break;
            
          case 'C':
            const consultExists = canvasAnalysis.consultEvents[roleName] || 
                                 Object.values(canvasAnalysis.consultEvents).find(consult => 
                                   consult.roleName === roleName
                                 );
            if (consultExists) {
              console.log(`✅ Consulta para ${roleName} existe en canvas`);
              result.elementsToKeep.push({
                type: 'consult',
                name: roleName,
                element: consultExists.element
              });
            } else {
              console.log(`❌ Consulta para ${roleName} NO existe en canvas - se añadirá`);
              result.elementsToAdd.push({
                type: 'consult',
                name: roleName,
                responsibility: responsibility
              });
            }
            break;
            
          case 'I':
            const infoExists = canvasAnalysis.infoEvents[roleName] || 
                              Object.values(canvasAnalysis.infoEvents).find(info => 
                                info.roleName === roleName
                              );
            if (infoExists) {
              console.log(`✅ Información para ${roleName} existe en canvas`);
              result.elementsToKeep.push({
                type: 'info',
                name: roleName,
                element: infoExists.element
              });
            } else {
              console.log(`❌ Información para ${roleName} NO existe en canvas - se añadirá`);
              result.elementsToAdd.push({
                type: 'info',
                name: roleName,
                responsibility: responsibility
              });
            }
            break;
        }
      });
    } else {
      console.log(`❌ Tarea ${taskName} NO existe en canvas`);
    }
  });
  
  // Identificar elementos a eliminar (están en canvas pero no en matriz)
  console.log('🔍 Verificando elementos a eliminar...');
  
  Object.keys(canvasAnalysis.roles).forEach(roleName => {
    const isInMatrix = Object.values(matrix).some(taskRoles => 
      Object.keys(taskRoles).includes(roleName)
    );
    if (!isInMatrix) {
      console.log(`🗑️ Rol ${roleName} está en canvas pero no en matriz - se eliminará`);
      result.elementsToRemove.push({
        type: 'role',
        name: roleName,
        element: canvasAnalysis.roles[roleName].element
      });
    }
  });
  
  Object.keys(canvasAnalysis.approvalTasks).forEach(roleName => {
    const isInMatrix = Object.values(matrix).some(taskRoles => 
      taskRoles[roleName] === 'A'
    );
    if (!isInMatrix) {
      console.log(`🗑️ Aprobación para ${roleName} está en canvas pero no en matriz - se eliminará`);
      result.elementsToRemove.push({
        type: 'approval',
        name: roleName,
        element: canvasAnalysis.approvalTasks[roleName].element
      });
    }
  });
  
  Object.keys(canvasAnalysis.consultEvents).forEach(roleName => {
    const isInMatrix = Object.values(matrix).some(taskRoles => 
      taskRoles[roleName] === 'C'
    );
    if (!isInMatrix) {
      console.log(`🗑️ Consulta para ${roleName} está en canvas pero no en matriz - se eliminará`);
      result.elementsToRemove.push({
        type: 'consult',
        name: roleName,
        element: canvasAnalysis.consultEvents[roleName].element
      });
    }
  });
  
  Object.keys(canvasAnalysis.infoEvents).forEach(roleName => {
    const isInMatrix = Object.values(matrix).some(taskRoles => 
      taskRoles[roleName] === 'I'
    );
    if (!isInMatrix) {
      console.log(`🗑️ Información para ${roleName} está en canvas pero no en matriz - se eliminará`);
      result.elementsToRemove.push({
        type: 'info',
        name: roleName,
        element: canvasAnalysis.infoEvents[roleName].element
      });
    }
  });
  
  console.log(`📊 RESUMEN DE COMPARACIÓN:`);
  console.log(`  - Elementos a mantener: ${result.elementsToKeep.length}`);
  console.log(`  - Elementos a eliminar: ${result.elementsToRemove.length}`);
  console.log(`  - Elementos a añadir: ${result.elementsToAdd.length}`);
  
  // Mostrar detalles
  if (result.elementsToKeep.length > 0) {
    console.log(`✅ MANTENER:`, result.elementsToKeep.map(el => `${el.type}: ${el.name}`));
  }
  if (result.elementsToRemove.length > 0) {
    console.log(`🗑️ ELIMINAR:`, result.elementsToRemove.map(el => `${el.type}: ${el.name}`));
  }
  if (result.elementsToAdd.length > 0) {
    console.log(`➕ AÑADIR:`, result.elementsToAdd.map(el => `${el.type}: ${el.name} (${el.responsibility})`));
  }
  
  return result;
}

// Función para limpiar elementos que no coinciden
function cleanupNonMatchingElements(modeler, elementsToRemove) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🧹 Limpiando ${elementsToRemove.length} elementos que no coinciden...`);
  
  // Agrupar elementos por tarea para restablecer flujos después
  const elementsByTask = {};
  
  elementsToRemove.forEach(item => {
    try {
      console.log(`🗑️ Eliminando ${item.type}: ${item.name}`);
      
      // Encontrar la tarea BPMN asociada a este elemento especial
      const associatedTask = findAssociatedBpmnTask(modeler, item.element);
      if (associatedTask) {
        const taskName = associatedTask.businessObject?.name || associatedTask.id;
        if (!elementsByTask[taskName]) {
          elementsByTask[taskName] = [];
        }
        elementsByTask[taskName].push({
          type: item.type,
          element: item.element,
          name: item.name
        });
      }
      
      // Eliminar conexiones primero
      const connections = elementRegistry.filter(element => 
        element.type === 'bpmn:SequenceFlow' && 
        (element.source?.id === item.element.id || element.target?.id === item.element.id)
      );
      
      connections.forEach(connection => {
        modeling.removeConnection(connection);
        console.log(`🔗 Eliminada conexión: ${connection.id}`);
      });
      
      // Eliminar el elemento
      modeling.removeElements([item.element]);
      console.log(`✅ Eliminado ${item.type}: ${item.name}`);
      
    } catch (error) {
      console.error(`❌ Error eliminando ${item.type} ${item.name}:`, error);
    }
  });
  
  // Restablecer flujos para cada tarea afectada
  Object.keys(elementsByTask).forEach(taskName => {
    console.log(`🔗 Restableciendo flujo para tarea: ${taskName}`);
    console.log(`📋 Elementos eliminados para esta tarea:`, elementsByTask[taskName].map(el => `${el.type}: ${el.name}`));
    restoreFlowForTask(modeler, taskName, elementsByTask[taskName]);
  });
  
  console.log(`✅ Limpieza completada. Flujos restablecidos para ${Object.keys(elementsByTask).length} tareas`);
}

// Función para marcar elementos que se mantienen
function markElementsToKeep(modeler, elementsToKeep) {
  console.log(`✅ Marcando ${elementsToKeep.length} elementos que se mantienen...`);
  
  elementsToKeep.forEach(item => {
    console.log(`✅ Manteniendo ${item.type}: ${item.name}`);
    // Marcar el elemento como procesado para evitar duplicados
    item.element.processed = true;
  });
}

// Función para encontrar la tarea BPMN correspondiente a un rol
function findTaskForRole(matrix, roleName) {
  for (const taskName in matrix) {
    const taskRoles = matrix[taskName];
    if (taskRoles[roleName]) {
      return taskName;
    }
  }
  return null;
}

// Función para encontrar la tarea BPMN asociada a un elemento especial
function findAssociatedBpmnTask(modeler, specialElement) {
  const elementRegistry = modeler.get('elementRegistry');
  
  // Buscar conexiones que conecten este elemento especial con una tarea BPMN
  const connections = elementRegistry.filter(element => 
    element.type === 'bpmn:SequenceFlow' && 
    (element.source?.id === specialElement.id || element.target?.id === specialElement.id)
  );
  
  for (const connection of connections) {
    const otherElement = connection.source?.id === specialElement.id ? connection.target : connection.source;
    if (otherElement && otherElement.type === 'bpmn:Task' && !otherElement.businessObject?.name?.startsWith('Aprobar ')) {
      return otherElement;
    }
  }
  
  // Si no se encuentra por conexión directa, buscar en el flujo
  return findBpmnTaskInFlow(modeler, specialElement);
}

// Función para encontrar la tarea BPMN en el flujo de un elemento especial
function findBpmnTaskInFlow(modeler, specialElement) {
  const elementRegistry = modeler.get('elementRegistry');
  
  // Buscar hacia atrás en el flujo para encontrar la tarea BPMN original
  const visited = new Set();
  const queue = [specialElement];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    // Si encontramos una tarea BPMN que no es de aprobación, la retornamos
    if (current.type === 'bpmn:Task' && !current.businessObject?.name?.startsWith('Aprobar ')) {
      return current;
    }
    
    // Buscar elementos anteriores en el flujo
    const incomingConnections = elementRegistry.filter(element => 
      element.type === 'bpmn:SequenceFlow' && element.target?.id === current.id
    );
    
    incomingConnections.forEach(connection => {
      if (connection.source && !visited.has(connection.source.id)) {
        queue.push(connection.source);
      }
    });
  }
  
  return null;
}

// Función para restablecer el flujo de una tarea después de eliminar elementos especiales
function restoreFlowForTask(modeler, taskName, removedElements) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔗 Restableciendo flujo para tarea: ${taskName}`);
  console.log(`📋 Elementos eliminados:`, removedElements.map(el => `${el.type}: ${el.name}`));
  
  // Encontrar la tarea BPMN
  const bpmnTask = findBpmnTaskByName(modeler, taskName);
  if (!bpmnTask) {
    console.log(`⚠️ No se encontró la tarea BPMN: ${taskName}`);
    return;
  }
  
  console.log(`✅ Tarea BPMN encontrada: ${bpmnTask.businessObject?.name || bpmnTask.id}`);
  
  // PASO 1: Eliminar TODAS las conexiones salientes de la tarea BPMN
  const outgoingConnections = elementRegistry.filter(element => 
    element.type === 'bpmn:SequenceFlow' && 
    element.source?.id === bpmnTask.id
  );
  
  console.log(`🔍 Eliminando ${outgoingConnections.length} conexiones salientes de ${taskName}:`);
  outgoingConnections.forEach(conn => {
    const targetName = conn.target?.businessObject?.name || conn.target?.id;
    console.log(`  - Eliminando conexión a: ${targetName}`);
    try {
      modeling.removeConnection(conn);
      console.log(`  ✅ Conexión eliminada: ${conn.id}`);
    } catch (error) {
      console.error(`  ❌ Error eliminando conexión ${conn.id}:`, error);
    }
  });
  
  // PASO 2: Buscar el siguiente elemento real en el flujo (ignorando elementos especiales)
  const nextElement = findNextRealTaskInFlow(modeler, bpmnTask);
  if (!nextElement) {
    console.log(`ℹ️ No hay siguiente elemento real para conectar en: ${taskName}`);
    return;
  }
  
  console.log(`🎯 Siguiente elemento real encontrado: ${nextElement.businessObject?.name || nextElement.id} (${nextElement.type})`);
  
  // PASO 3: Crear nueva conexión directa
  try {
    modeling.connect(bpmnTask, nextElement);
    console.log(`🔗 Conexión restablecida exitosamente: ${taskName} → ${nextElement.businessObject?.name || nextElement.id}`);
  } catch (error) {
    console.error(`❌ Error restableciendo conexión: ${error.message}`);
    console.error(`Stack:`, error.stack);
  }
}

// Nueva función para encontrar el siguiente elemento real (ignorando elementos especiales)
function findNextRealTaskInFlow(modeler, currentTask) {
  const elementRegistry = modeler.get('elementRegistry');
  const visited = new Set();
  
  console.log(`🔍 Buscando siguiente elemento real para: ${currentTask.businessObject?.name || currentTask.id}`);
  
  function findNextRecursive(task) {
    if (visited.has(task.id)) {
      console.log(`⚠️ Ciclo detectado, evitando: ${task.businessObject?.name || task.id}`);
      return null;
    }
    visited.add(task.id);
    
    console.log(`🔍 Procesando elemento: ${task.businessObject?.name || task.id} (${task.type})`);
    
    // Buscar conexiones salientes
    const outgoingConnections = elementRegistry.filter(element => 
      element.type === 'bpmn:SequenceFlow' && 
      element.source?.id === task.id
    );
    
    console.log(`🔍 Encontradas ${outgoingConnections.length} conexiones salientes`);
    
    for (const connection of outgoingConnections) {
      const target = connection.target;
      const targetName = target.businessObject?.name || target.id;
      const targetType = target.type;
      
      console.log(`🔍 Analizando conexión a: ${targetName} (${targetType})`);
      
      // IGNORAR elementos especiales (C, I, A)
      if (targetName.startsWith('Aprobar ') || 
          targetName.startsWith('Consultar ') || 
          targetName.startsWith('Informar ') ||
          targetType === 'RALph:RoleRALph' ||
          targetType === 'ralph:Role') {
        console.log(`⚠️ Saltando elemento especial: ${targetName}, continuando búsqueda...`);
        const nextElement = findNextRecursive(target);
        if (nextElement) {
          return nextElement;
        }
        continue;
      }
      
      // Si es una tarea BPMN real, retornarla
      if (targetType && (
        targetType === 'bpmn:Task' ||
        targetType === 'bpmn:UserTask' ||
        targetType === 'bpmn:ServiceTask' ||
        targetType === 'bpmn:ScriptTask' ||
        targetType === 'bpmn:ManualTask' ||
        targetType === 'bpmn:BusinessRuleTask' ||
        targetType === 'bpmn:SendTask' ||
        targetType === 'bpmn:ReceiveTask' ||
        targetType === 'bpmn:CallActivity' ||
        targetType === 'bpmn:SubProcess'
      )) {
        console.log(`✅ Encontrada siguiente tarea real: ${targetName}`);
        return target;
      }
      
      // Si es un gateway, continuar recursivamente
      if (targetType && targetType.includes('Gateway')) {
        console.log(`🔀 Gateway encontrado: ${targetName}, continuando búsqueda...`);
        const nextElement = findNextRecursive(target);
        if (nextElement) {
          return nextElement;
        }
      }
    }
    
    console.log(`❌ No se encontró siguiente elemento real para: ${task.businessObject?.name || task.id}`);
    return null;
  }
  
  const nextElement = findNextRecursive(currentTask);
  
  if (nextElement) {
    console.log(`✅ Siguiente elemento real encontrado: ${nextElement.businessObject?.name || nextElement.id}`);
  } else {
    console.log(`❌ No se encontró siguiente elemento real en el flujo`);
  }
  
  return nextElement;
}

// Función para encontrar el siguiente elemento en el flujo
function findNextElementInFlow(modeler, currentElement) {
  const elementRegistry = modeler.get('elementRegistry');
  
  // Buscar conexiones salientes
  const outgoingConnections = elementRegistry.filter(element => 
    element.type === 'bpmn:SequenceFlow' && element.source?.id === currentElement.id
  );
  
  if (outgoingConnections.length > 0) {
    // Tomar la primera conexión saliente
    return outgoingConnections[0].target;
  }
  
  // Si no hay conexiones salientes, buscar el siguiente elemento en el flujo original
  return findNextTaskInFlow(modeler, currentElement);
}

// Función para verificar si un elemento está en el flujo de una tarea
function isElementInTaskFlow(modeler, bpmnTask, element) {
  const elementRegistry = modeler.get('elementRegistry');
  
  // Verificar conexión directa
  const directConnection = elementRegistry.find(conn => 
    conn.type === 'bpmn:SequenceFlow' && 
    ((conn.source?.id === bpmnTask.id && conn.target?.id === element.id) ||
     (conn.source?.id === element.id && conn.target?.id === bpmnTask.id))
  );
  
  if (directConnection) {
    return true;
  }
  
  // Verificar conexión indirecta (en el flujo)
  const visited = new Set();
  const queue = [bpmnTask];
  
  while (queue.length > 0) {
    const current = queue.shift();
    
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    // Si encontramos el elemento, está en el flujo
    if (current.id === element.id) {
      return true;
    }
    
    // Buscar conexiones salientes
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && 
      conn.source && 
      conn.source.id === current.id
    );
    
    // Agregar elementos destino a la cola
    outgoingConnections.forEach(conn => {
      if (conn.target && !visited.has(conn.target.id)) {
        queue.push(conn.target);
      }
    });
  }
  
  return false;
}

// Función para ordenar elementos por su posición en el flujo
function sortElementsByFlowOrder(modeler, bpmnTask, elements) {
  if (elements.length <= 1) {
    return elements;
  }
  
  const elementRegistry = modeler.get('elementRegistry');
  const flowOrder = [];
  const visited = new Set();
  const queue = [bpmnTask];
  
  // Recorrer el flujo desde la tarea base
  while (queue.length > 0) {
    const current = queue.shift();
    
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    // Si es un elemento especial, agregarlo al orden
    if (elements.some(el => el.id === current.id)) {
      flowOrder.push(current);
    }
    
    // Buscar conexiones salientes
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && 
      conn.source && 
      conn.source.id === current.id
    );
    
    // Agregar elementos destino a la cola
    outgoingConnections.forEach(conn => {
      if (conn.target && !visited.has(conn.target.id)) {
        queue.push(conn.target);
      }
    });
  }
  
  // Ordenar elementos según el orden encontrado en el flujo
  const sortedElements = [];
  flowOrder.forEach(elementInFlow => {
    const matchingElement = elements.find(el => el.id === elementInFlow.id);
    if (matchingElement) {
      sortedElements.push(matchingElement);
    }
  });
  
  // Agregar elementos que no se encontraron en el flujo al final
  elements.forEach(element => {
    if (!sortedElements.some(el => el.id === element.id)) {
      sortedElements.push(element);
    }
  });
  
  console.log(`📊 Elementos ordenados por flujo:`, sortedElements.map(el => el.businessObject?.name || el.id));
  
  return sortedElements;
}

// Función para limpiar elementos duplicados
export function cleanupAllDuplicateElements(modeler) {
  if (!modeler) {
    console.warn('⚠️ Modeler no disponible para limpieza de duplicados');
    return;
  }
  
  console.log('🧹 Iniciando limpieza de elementos duplicados...');
  
  const elementRegistry = modeler.get('elementRegistry');
  
  // Limpiar tareas de aprobación duplicadas
  const approvalTasks = [];
  elementRegistry.forEach(element => {
    if (element.type === 'bpmn:UserTask' && 
        element.businessObject?.name && 
        element.businessObject.name.startsWith('Aprobar ')) {
      approvalTasks.push(element);
    }
  });
  
  console.log(`📊 Encontradas ${approvalTasks.length} tareas de aprobación`);
  
  // Agrupar por nombre para identificar duplicados
  const approvalGroups = {};
  approvalTasks.forEach(task => {
    const name = task.businessObject.name;
    if (!approvalGroups[name]) {
      approvalGroups[name] = [];
    }
    approvalGroups[name].push(task);
  });
  
  // Eliminar duplicados
  Object.keys(approvalGroups).forEach(name => {
    const tasks = approvalGroups[name];
    if (tasks.length > 1) {
      console.log(`🗑️ Eliminando ${tasks.length - 1} tareas de aprobación duplicadas: ${name}`);
      // Mantener la primera y eliminar las demás
      for (let i = 1; i < tasks.length; i++) {
        try {
          modeler.get('modeling').removeElements([tasks[i]]);
        } catch (error) {
          console.error(`❌ Error eliminando tarea duplicada: ${error.message}`);
        }
      }
    }
  });
  
  console.log('✅ Limpieza de elementos duplicados completada');
}

// ============================================================================
// GLOBAL FUNCTIONS FOR EXTERNAL USE
// ============================================================================

// Función global para mapeo automático
window.executeRasciToRalphMapping = function() {
  console.log('🔄 Ejecutando mapeo manual RASCI a RALph...');
  
  if (!window.bpmnModeler) {
    console.error('❌ BPMN Modeler no disponible');
    alert('❌ BPMN Modeler no disponible. Asegúrate de tener un diagrama BPMN abierto.');
    return;
  }

  if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
    console.error('❌ No hay datos en la matriz RASCI para mapear');
    alert('❌ No hay datos en la matriz RASCI para mapear. Primero agrega algunos roles en la matriz.');
    return;
  }

  try {
    console.log('📋 Datos de matriz RASCI:', window.rasciMatrixData);
    
    // Mostrar información inicial en el log
    const logElement = document.getElementById('mapping-log');
    if (logElement) {
      logElement.innerHTML = '';
      logElement.innerHTML += '🔄 Iniciando Mapeo Manual RASCI → RALph\n';
      logElement.innerHTML += '📋 Procesando eliminaciones y adiciones...\n';
      logElement.innerHTML += `📊 Tareas en matriz: ${Object.keys(window.rasciMatrixData).join(', ')}\n`;
      logElement.innerHTML += '⏳ Ejecutando mapeo...\n';
    }
    
    // Usar la función de mapeo consolidado
    const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
    console.log('✅ Mapeo manual completado:', results);
    
    // Mostrar resultados detallados en el log
    if (logElement) {
      logElement.innerHTML = '';
      logElement.innerHTML += '✅ Mapeo Manual RASCI → RALph Completado\n';
      logElement.innerHTML += '📊 Resumen de cambios:\n';
      logElement.innerHTML += `👥 Roles creados: ${results.rolesCreated}\n`;
      logElement.innerHTML += `🔗 Asignaciones de roles: ${results.roleAssignments || 0}\n`;
      logElement.innerHTML += `✅ Tareas de aprobación: ${results.approvalTasks}\n`;
      logElement.innerHTML += `📢 Flujos de mensaje (Consultas): ${results.messageFlows}\n`;
      logElement.innerHTML += `ℹ️ Eventos informativos: ${results.infoEvents}\n`;
      logElement.innerHTML += `🗑️ Elementos eliminados: ${results.elementsRemoved || 0}\n`;
      logElement.innerHTML += '\n🎉 Mapeo manual completado exitosamente!\n';
      logElement.innerHTML += '💡 Los elementos se procesan en orden: Tarea → Consulta → Aprobación → Información\n';
    }
    
    // Mostrar éxito en consola
    console.log('✅ Mapeo manual completado exitosamente! Resultados:', results);
    
  } catch (error) {
    console.error('❌ Error en mapeo manual:', error);
    
    // Mostrar error en el log si existe
    const logElement = document.getElementById('mapping-log');
    if (logElement) {
      logElement.innerHTML = '';
      logElement.innerHTML += '❌ Error en Mapeo Manual\n';
      logElement.innerHTML += `Error: ${error.message}\n`;
      logElement.innerHTML += `Stack: ${error.stack}\n`;
    }
    
    // Mostrar error en consola
    console.error('❌ Error en mapeo manual:', error.message);
  }
};

// Función de prueba simple para verificar C e I roles
window.testSimpleCandI = function() {
  console.log('🧪 Probando C e I roles con diagrama simple...');
  
  if (!window.bpmnModeler) {
    console.error('❌ BPMN Modeler no disponible');
    alert('❌ BPMN Modeler no disponible. Asegúrate de tener un diagrama BPMN abierto.');
    return;
  }

  // Crear una matriz de prueba simple
  const testMatrix = {
    'Activity_0il3zqg': {
      'Consultor': 'C',
      'Informado': 'I'
    }
  };
  
  console.log('📋 Matriz de prueba simple:', testMatrix);
  
  try {
    console.log('🔄 Ejecutando mapeo simple con roles C e I...');
    const results = executeSimpleRasciMapping(window.bpmnModeler, testMatrix);
    console.log('✅ Prueba simple completada:', results);
    
    // Mostrar resultados
    alert(`✅ Prueba simple completada!\n\n📊 Resultados:\n- Consultas (C): ${results.messageFlows}\n- Informaciones (I): ${results.infoEvents}\n- Roles creados: ${results.rolesCreated}`);
    
  } catch (error) {
    console.error('❌ Error en prueba simple:', error);
    alert(`❌ Error en prueba simple: ${error.message}`);
  }
};

// Función de prueba para verificar C e I roles específicamente
window.testCandIRoles = function() {
  console.log('🧪 Probando específicamente roles C e I...');
  
  if (!window.bpmnModeler) {
    console.error('❌ BPMN Modeler no disponible');
    alert('❌ BPMN Modeler no disponible. Asegúrate de tener un diagrama BPMN abierto.');
    return;
  }

  // Verificar si hay datos en la matriz RASCI
  if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
    console.error('❌ No hay datos en la matriz RASCI');
    alert('❌ No hay datos en la matriz RASCI. Primero agrega algunos roles C o I en la matriz.');
    return;
  }

  console.log('📋 Datos actuales de la matriz RASCI:', window.rasciMatrixData);
  
  // Filtrar solo tareas que tienen roles C o I
  const tasksWithCandI = {};
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    const hasCorI = Object.values(taskRoles).some(role => role === 'C' || role === 'I');
    
    if (hasCorI) {
      tasksWithCandI[taskName] = taskRoles;
      console.log(`✅ Tarea ${taskName} tiene roles C o I:`, taskRoles);
    }
  });

  if (Object.keys(tasksWithCandI).length === 0) {
    console.error('❌ No se encontraron tareas con roles C o I');
    alert('❌ No se encontraron tareas con roles C o I. Agrega algunos roles C (Consult) o I (Inform) en la matriz RASCI.');
    return;
  }

  try {
    console.log('🔄 Ejecutando mapeo con roles C e I...');
    const results = executeSimpleRasciMapping(window.bpmnModeler, tasksWithCandI);
    console.log('✅ Prueba C e I completada:', results);
    
    // Mostrar resultados en el log si existe
    const logElement = document.getElementById('mapping-log');
    if (logElement) {
      logElement.innerHTML = '';
      logElement.innerHTML += '🧪 Prueba Específica de Roles C e I\n';
      logElement.innerHTML += `📋 Tareas con C/I: ${Object.keys(tasksWithCandI).join(', ')}\n`;
      logElement.innerHTML += `📊 Datos de matriz: ${JSON.stringify(tasksWithCandI, null, 2)}\n`;
      logElement.innerHTML += `👥 Roles creados: ${results.rolesCreated}\n`;
      logElement.innerHTML += `🔗 Asignaciones de roles: ${results.roleAssignments || 0}\n`;
      logElement.innerHTML += `✅ Tareas de aprobación: ${results.approvalTasks}\n`;
      logElement.innerHTML += `📢 Flujos de mensaje (Consultas): ${results.messageFlows}\n`;
      logElement.innerHTML += `ℹ️ Eventos informativos: ${results.infoEvents}\n`;
      logElement.innerHTML += '✅ Prueba C e I completada exitosamente\n';
    }
    
    // Mostrar alerta de éxito
    alert(`✅ Prueba C e I completada exitosamente!\n\n📊 Resultados:\n- Consultas (C): ${results.messageFlows}\n- Informaciones (I): ${results.infoEvents}\n- Roles creados: ${results.rolesCreated}`);
    
  } catch (error) {
    console.error('❌ Error en prueba C e I:', error);
    alert(`❌ Error en prueba C e I: ${error.message}`);
  }
};

// Función de prueba para verificar el mapeo
window.testInfoRoleMapping = function() {
  console.log('🧪 Probando mapeo con roles de información...');
  
  if (!window.bpmnModeler) {
    console.error('❌ BPMN Modeler no disponible');
    return;
  }

  // Crear matriz de prueba con roles de información
  const testMatrix = {
    'Activity_1n5er89': {
      'Rol1': 'R',
      'Rol2': 'I',  // Rol con responsabilidad de información
      'Rol3': 'A',
      'Rol4': 'C'
    }
  };
  
  console.log('📋 Matriz de prueba:', testMatrix);
  
  try {
    const results = executeSimpleRasciMapping(window.bpmnModeler, testMatrix);
    console.log('✅ Prueba completada:', results);
    
    // Mostrar resultados en el log si existe
    const logElement = document.getElementById('mapping-log');
    if (logElement) {
      logElement.innerHTML = '';
      logElement.innerHTML += '🧪 Prueba de Mapeo con Roles de Información\n';
      logElement.innerHTML += `📋 Matriz de prueba: ${JSON.stringify(testMatrix)}\n`;
      logElement.innerHTML += `👥 Roles creados: ${results.rolesCreated}\n`;
      logElement.innerHTML += `🔗 Asignaciones de roles: ${results.roleAssignments || 0}\n`;
      logElement.innerHTML += `✅ Tareas de aprobación: ${results.approvalTasks}\n`;
      logElement.innerHTML += `📢 Flujos de mensaje: ${results.messageFlows}\n`;
      logElement.innerHTML += `ℹ️ Eventos informativos: ${results.infoEvents}\n`;
      logElement.innerHTML += '✅ Prueba completada exitosamente\n';
    }
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
};

// Función de prueba para verificar todos los tipos de roles
window.testAllRoleTypes = function() {
  console.log('🧪 Probando mapeo con todos los tipos de roles...');
  
  if (!window.bpmnModeler) {
    console.error('❌ BPMN Modeler no disponible');
    return;
  }

  // Crear matriz de prueba con todos los tipos de roles
  const testMatrix = {
    'Activity_1n5er89': {
      'Responsable': 'R',    // Responsible
      'Soporte': 'S',        // Support
      'Consultor': 'C',      // Consult
      'Aprobador': 'A',      // Approve
      'Informado': 'I'       // Inform
    }
  };
  
  console.log('📋 Matriz de prueba completa:', testMatrix);
  
  try {
    const results = executeSimpleRasciMapping(window.bpmnModeler, testMatrix);
    console.log('✅ Prueba completa:', results);
    
    // Mostrar resultados en el log si existe
    const logElement = document.getElementById('mapping-log');
    if (logElement) {
      logElement.innerHTML = '';
      logElement.innerHTML += '🧪 Prueba de Mapeo con Todos los Tipos de Roles\n';
      logElement.innerHTML += `📋 Matriz de prueba: ${JSON.stringify(testMatrix)}\n`;
      logElement.innerHTML += `👥 Roles creados: ${results.rolesCreated}\n`;
      logElement.innerHTML += `🔗 Asignaciones de roles: ${results.roleAssignments || 0}\n`;
      logElement.innerHTML += `✅ Tareas de aprobación: ${results.approvalTasks}\n`;
      logElement.innerHTML += `📢 Flujos de mensaje: ${results.messageFlows}\n`;
      logElement.innerHTML += `ℹ️ Eventos informativos: ${results.infoEvents}\n`;
      logElement.innerHTML += '✅ Prueba completa exitosamente\n';
    }
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
};

// Función de inicialización
export function initRasciMapping(panel) {
  console.log('🚀 Inicializando módulo de mapeo RASCI consolidado...');
  
  // Add event listeners to mapping buttons if they exist
  setTimeout(() => {
    const mappingButtons = document.querySelectorAll('[onclick*="executeRasciToRalphMapping"]');
    console.log('🔍 Botones de mapeo encontrados:', mappingButtons.length);
    
    mappingButtons.forEach(button => {
      console.log('🔗 Configurando botón:', button.textContent || button.innerHTML);
      // Remove onclick and add proper event listener
      button.removeAttribute('onclick');
      button.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🖱️ Botón de mapeo clickeado');
        window.executeRasciToRalphMapping();
      });
    });
  }, 1000);
  
  console.log('✅ Módulo de mapeo consolidado inicializado');
}

// === NUEVA FUNCIÓN: Detectar eliminación manual de elementos especiales ===
function setupManualElementRemovalListener(modeler) {
  const eventBus = modeler.get('eventBus');
  
  eventBus.on('elements.delete', (event) => {
    console.log(`🗑️ Detectada eliminación manual de elementos:`, event);
    
    const deletedElements = event.elements || [];
    let specialElementsRemoved = false;
    
    deletedElements.forEach(element => {
      const elementName = element.businessObject?.name || '';
      
      if (elementName.startsWith('Consultar ') || elementName.startsWith('Aprobar ') || elementName.startsWith('Informar ')) {
        console.log(`🔍 Elemento especial eliminado manualmente: ${elementName}`);
        specialElementsRemoved = true;
        
        // Extraer información del elemento eliminado
        const roleName = extractRoleNameFromElementName(elementName);
        const elementType = extractElementTypeFromElementName(elementName);
        
        console.log(`🔍 Rol: ${roleName}, Tipo: ${elementType}`);
        
        // Encontrar la tarea BPMN asociada
        const associatedTask = findAssociatedBpmnTaskForRemovedElement(modeler, element);
        
        if (associatedTask) {
          console.log(`🔍 Tarea asociada encontrada: ${associatedTask.businessObject?.name || associatedTask.id}`);
          
          // Actualizar la matriz para reflejar la eliminación
          updateMatrixAfterManualRemoval(roleName, elementType, associatedTask);
          
          // Restaurar el flujo
          restoreFlowAfterElementRemoval(modeler, associatedTask);
        } else {
          console.warn(`⚠️ No se pudo encontrar la tarea asociada para: ${elementName}`);
        }
      }
    });
    
    if (specialElementsRemoved) {
      console.log(`🔄 Procesamiento de eliminación manual completado`);
    }
  });
}

// === FUNCIÓN AUXILIAR: Extraer nombre del rol del nombre del elemento ===
function extractRoleNameFromElementName(elementName) {
  // Ejemplos: "Consultar Consultor" -> "Consultor"
  //          "Aprobar Gerente" -> "Gerente"
  //          "Informar Cliente" -> "Cliente"
  const parts = elementName.split(' ');
  if (parts.length >= 2) {
    return parts.slice(1).join(' '); // Toma todo después del primer espacio
  }
  return '';
}

// === FUNCIÓN AUXILIAR: Extraer tipo de elemento del nombre ===
function extractElementTypeFromElementName(elementName) {
  if (elementName.startsWith('Consultar ')) return 'C';
  if (elementName.startsWith('Aprobar ')) return 'A';
  if (elementName.startsWith('Informar ')) return 'I';
  return '';
}

// === NUEVA FUNCIÓN: Verificar estado de la matriz antes del mapeo ===
function verifyMatrixStateBeforeMapping() {
  console.log(`🔍 Verificando estado de la matriz antes del mapeo...`);
  
  const matrix = window.currentRasciMatrix;
  if (!matrix) {
    console.warn('⚠️ No hay matriz RASCI disponible para verificar');
    return;
  }
  
  console.log(`📊 Estado actual de la matriz:`, matrix);
  
  // Verificar si hay inconsistencias
  matrix.forEach((row, index) => {
    const taskName = row.task;
    const roles = Object.keys(row).filter(key => key !== 'task');
    
    console.log(`📊 Tarea ${index + 1}: "${taskName}"`);
    roles.forEach(role => {
      const responsibilities = row[role];
      console.log(`  - Rol "${role}": ${responsabilities}`);
    });
  });
  
  // Verificar si hay elementos especiales en el canvas que no están en la matriz
  const modeler = window.bpmnModeler;
  if (modeler) {
    const elementRegistry = modeler.get('elementRegistry');
    const canvasSpecialElements = [];
    
    elementRegistry.forEach(element => {
      const elementName = element.businessObject?.name || '';
      if (elementName.startsWith('Consultar ') || elementName.startsWith('Aprobar ') || elementName.startsWith('Informar ')) {
        canvasSpecialElements.push({
          name: elementName,
          type: element.type,
          id: element.id
        });
      }
    });
    
    console.log(`🔍 Elementos especiales en el canvas:`, canvasSpecialElements);
    
    // Verificar si hay elementos en el canvas que no están en la matriz
    canvasSpecialElements.forEach(element => {
      const roleName = extractRoleNameFromElementName(element.name);
      const elementType = extractElementTypeFromElementName(element.name);
      
      // Buscar si este rol y tipo están en la matriz
      let found = false;
      matrix.forEach(row => {
        if (row[roleName] && row[roleName].includes(elementType)) {
          found = true;
        }
      });
      
      if (!found) {
        console.warn(`⚠️ Elemento en canvas pero no en matriz: ${element.name} (Rol: ${roleName}, Tipo: ${elementType})`);
      }
    });
  }
}

// === FUNCIÓN AUXILIAR: Encontrar tarea BPMN asociada a elemento eliminado ===
function findAssociatedBpmnTaskForRemovedElement(modeler, deletedElement) {
  const elementRegistry = modeler.get('elementRegistry');
  
  // Buscar elementos que tengan conexiones hacia o desde el elemento eliminado
  const connectedElements = elementRegistry.filter(element => {
    if (element.type === 'bpmn:SequenceFlow') {
      return element.source?.id === deletedElement.id || element.target?.id === deletedElement.id;
    }
    return false;
  });
  
  // Buscar la tarea BPMN base (no elementos especiales)
  for (const connection of connectedElements) {
    const source = connection.source;
    const target = connection.target;
    
    // Verificar si source es una tarea BPMN base
    if (source && source.type === 'bpmn:UserTask' && 
        !source.businessObject?.name?.startsWith('Aprobar ')) {
      return source;
    }
    
    // Verificar si target es una tarea BPMN base
    if (target && target.type === 'bpmn:UserTask' && 
        !target.businessObject?.name?.startsWith('Aprobar ')) {
      return target;
    }
  }
  
  return null;
}

// === FUNCIÓN AUXILIAR: Actualizar matriz después de eliminación manual ===
function updateMatrixAfterManualRemoval(roleName, elementType, bpmnTask) {
  console.log(`📊 Actualizando matriz después de eliminación manual: Rol=${roleName}, Tipo=${elementType}`);
  
  // Obtener la matriz actual del panel
  const matrix = window.currentRasciMatrix; // Asumiendo que está disponible globalmente
  
  if (!matrix) {
    console.warn('⚠️ No se encontró la matriz RASCI actual');
    return;
  }
  
  console.log(`📊 Matriz actual:`, matrix);
  
  // Encontrar la tarea en la matriz - buscar por nombre Y por ID
  const taskName = bpmnTask.businessObject?.name || '';
  const taskId = bpmnTask.id;
  
  console.log(`📊 Buscando tarea: Nombre="${taskName}", ID="${taskId}"`);
  
  let taskRow = matrix.find(row => row.task === taskName);
  
  if (!taskRow) {
    // Si no se encuentra por nombre, buscar por ID
    taskRow = matrix.find(row => row.task === taskId);
    console.log(`📊 Tarea no encontrada por nombre, buscando por ID...`);
  }
  
  if (!taskRow) {
    // Si aún no se encuentra, buscar en todas las filas que contengan el nombre o ID
    taskRow = matrix.find(row => 
      row.task && (
        row.task.includes(taskName) || 
        row.task.includes(taskId) ||
        taskName.includes(row.task) ||
        taskId.includes(row.task)
      )
    );
    console.log(`📊 Búsqueda flexible por nombre/ID...`);
  }
  
  if (taskRow) {
    console.log(`📊 Tarea encontrada en matriz:`, taskRow);
    
    // Remover la responsabilidad del rol
    if (taskRow[roleName]) {
      const currentResponsibilities = taskRow[roleName].split(',').map(r => r.trim());
      console.log(`📊 Responsabilidades actuales para ${roleName}:`, currentResponsibilities);
      
      const updatedResponsibilities = currentResponsibilities.filter(r => r !== elementType);
      console.log(`📊 Responsabilidades después de filtrar ${elementType}:`, updatedResponsibilities);
      
      if (updatedResponsibilities.length > 0) {
        taskRow[roleName] = updatedResponsibilities.join(', ');
        console.log(`📊 Rol ${roleName} actualizado con responsabilidades: ${taskRow[roleName]}`);
      } else {
        // Si no quedan responsabilidades, remover el rol completamente
        delete taskRow[roleName];
        console.log(`📊 Rol ${roleName} eliminado completamente de la tarea`);
      }
      
      console.log(`✅ Matriz actualizada: Rol ${roleName} ya no tiene responsabilidad ${elementType} en tarea ${taskRow.task}`);
      
      // Guardar la matriz actualizada globalmente
      window.currentRasciMatrix = matrix;
      console.log(`📊 Matriz actualizada guardada globalmente`);
    } else {
      console.log(`📊 El rol ${roleName} no tenía responsabilidades en la tarea ${taskRow.task}`);
    }
  } else {
    console.warn(`⚠️ No se encontró la tarea "${taskName}" (ID: ${taskId}) en la matriz`);
    console.warn(`⚠️ Tareas disponibles en la matriz:`, matrix.map(row => ({ task: row.task, roles: Object.keys(row).filter(k => k !== 'task') })));
  }
}

// === FUNCIÓN: Crear botones para eliminar elementos especiales ===
function createRemovalButtons(panel) {
  console.log('🔧 Creando botones de eliminación para elementos especiales...');
  
  // Crear contenedor para botones si no existe
  let removalContainer = panel.querySelector('.removal-buttons-container');
  if (!removalContainer) {
    removalContainer = document.createElement('div');
    removalContainer.className = 'removal-buttons-container';
    removalContainer.style.cssText = `
      margin: 10px 0;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      background: #f8f9fa;
    `;
    
    const title = document.createElement('h4');
    title.textContent = '🗑️ Eliminar Elementos Especiales';
    title.style.margin = '0 0 10px 0';
    removalContainer.appendChild(title);
    
    panel.appendChild(removalContainer);
  }
  
  // Crear formulario para eliminación manual
  const form = document.createElement('div');
  form.innerHTML = `
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tarea BPMN:</label>
      <input type="text" id="removal-task-name" placeholder="Ej: Activity_0il3zqg" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Rol:</label>
      <input type="text" id="removal-role-name" placeholder="Ej: Consultor" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
    </div>
    <div style="margin-bottom: 10px;">
      <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tipo de Elemento:</label>
      <select id="removal-element-type" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        <option value="C">C - Consulta</option>
        <option value="A">A - Aprobación</option>
        <option value="I">I - Información</option>
      </select>
    </div>
    <div style="display: flex; gap: 5px;">
      <button id="remove-element-btn" style="flex: 1; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">
        🗑️ Eliminar
      </button>
      <button id="debug-state-btn" style="flex: 1; padding: 8px; background: #ffc107; color: #212529; border: none; border-radius: 3px; cursor: pointer;">
        🔍 Debug
      </button>
    </div>
  `;
  
  removalContainer.appendChild(form);
  
  // Agregar event listeners
  const removeBtn = form.querySelector('#remove-element-btn');
  const debugBtn = form.querySelector('#debug-state-btn');
  
  removeBtn.addEventListener('click', () => {
    const taskName = form.querySelector('#removal-task-name').value;
    const roleName = form.querySelector('#removal-role-name').value;
    const elementType = form.querySelector('#removal-element-type').value;
    
    if (!taskName || !roleName) {
      alert('❌ Por favor, completa todos los campos');
      return;
    }
    
    if (typeof window.removeSpecialElementAndRestoreFlow === 'function') {
      window.removeSpecialElementAndRestoreFlow(taskName, roleName, elementType);
    } else {
      alert('❌ Función de eliminación no disponible');
    }
  });
  
  debugBtn.addEventListener('click', () => {
    const taskName = form.querySelector('#removal-task-name').value;
    
    if (!taskName) {
      alert('❌ Por favor, ingresa el nombre de la tarea');
      return;
    }
    
    if (typeof window.debugCurrentFlowState === 'function') {
      const modeler = window.bpmnModeler;
      if (modeler) {
        const bpmnTask = window.findBpmnTaskByName(modeler, taskName);
        if (bpmnTask) {
          window.debugCurrentFlowState(modeler, bpmnTask);
        } else {
          console.error(`❌ No se encontró la tarea: ${taskName}`);
        }
      } else {
        console.error('❌ No se encontró el modeler BPMN');
      }
    } else {
      alert('❌ Función de debug no disponible');
    }
  });
  
  console.log('✅ Botones de eliminación creados');
}

// === FUNCIONES GLOBALES EXPUESTAS ===
// Exponer función global para eliminación
window.removeSpecialElementAndRestoreFlow = function(taskName, roleName, elementType) {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    console.error('❌ No se encontró el modeler BPMN');
    return;
  }
  
  const bpmnTask = findBpmnTaskByName(modeler, taskName);
  if (!bpmnTask) {
    console.error(`❌ No se encontró la tarea: ${taskName}`);
    return;
  }
  
  console.log(`🗑️ Eliminando elemento ${elementType} para rol ${roleName} en tarea ${taskName}`);
  
  if (elementType === 'C' || elementType === 'I') {
    removeConsultOrInfoEventAndRestoreFlow(modeler, bpmnTask, roleName, elementType);
  } else if (elementType === 'A') {
    removeApprovalTaskAndRestoreFlow(modeler, bpmnTask, roleName);
  } else {
    console.error(`❌ Tipo de elemento no válido: ${elementType}`);
  }
};

// Exponer función global para debug
window.debugCurrentFlowState = debugCurrentFlowState;
window.findBpmnTaskByName = findBpmnTaskByName;

// === NUEVA FUNCIÓN: Prueba simple de eliminación ===
window.testSimpleRemoval = function(taskName, roleName, elementType) {
  console.log(`🧪 Prueba simple de eliminación para ${elementType} en tarea ${taskName}`);
  
  const modeler = window.bpmnModeler;
  if (!modeler) {
    console.error('❌ No se encontró el modeler BPMN');
    return;
  }
  
  const bpmnTask = findBpmnTaskByName(modeler, taskName);
  if (!bpmnTask) {
    console.error(`❌ No se encontró la tarea: ${taskName}`);
    return;
  }
  
  console.log(`✅ Tarea encontrada: ${bpmnTask.businessObject?.name || bpmnTask.id}`);
  
  // Ejecutar eliminación simple
  if (elementType === 'C' || elementType === 'I') {
    removeConsultOrInfoEventAndRestoreFlow(modeler, bpmnTask, roleName, elementType);
  } else if (elementType === 'A') {
    removeApprovalTaskAndRestoreFlow(modeler, bpmnTask, roleName);
  }
  
  console.log(`✅ Prueba de eliminación completada`);
};

// === NUEVA FUNCIÓN: Restauración de flujo simplificada ===
window.testSimpleFlowRestoration = function(taskName) {
  console.log(`🧪 Prueba de restauración de flujo simplificada para ${taskName}`);
  
  const modeler = window.bpmnModeler;
  if (!modeler) {
    console.error('❌ No se encontró el modeler BPMN');
    return;
  }
  
  const bpmnTask = findBpmnTaskByName(modeler, taskName);
  if (!bpmnTask) {
    console.error(`❌ No se encontró la tarea: ${taskName}`);
    return;
  }
  
  console.log(`✅ Tarea encontrada: ${bpmnTask.businessObject?.name || bpmnTask.id}`);
  
  // Restauración simplificada
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  // 1. Buscar elementos especiales restantes
  const specialElements = [];
  elementRegistry.forEach(element => {
    const elementName = element.businessObject?.name || '';
    if (elementName.startsWith('Consultar ') || elementName.startsWith('Aprobar ') || elementName.startsWith('Informar ')) {
      specialElements.push(element);
      console.log(`🔍 Elemento especial encontrado: ${elementName}`);
    }
  });
  
  console.log(`📊 Total de elementos especiales: ${specialElements.length}`);
  
  // 2. Buscar siguiente tarea real (simplificado)
  let nextRealTask = null;
  elementRegistry.forEach(element => {
    const elementName = element.businessObject?.name || '';
    const elementType = element.type;
    
    // Buscar tareas que no sean especiales
    if ((elementType === 'bpmn:Task' || elementType === 'bpmn:UserTask') && 
        !elementName.startsWith('Aprobar ') && 
        elementName !== bpmnTask.businessObject?.name) {
      nextRealTask = element;
      console.log(`✅ Siguiente tarea real encontrada: ${elementName}`);
    }
  });
  
  if (!nextRealTask) {
    console.warn(`⚠️ No se encontró siguiente tarea real`);
    return;
  }
  
  // 3. Limpiar conexiones existentes
  console.log(`🧹 Limpiando conexiones existentes...`);
  elementRegistry.forEach(conn => {
    if (conn.type === 'bpmn:SequenceFlow' && conn.source?.id === bpmnTask.id) {
      try {
        modeling.removeConnection(conn);
        console.log(`🗑️ Eliminada conexión: ${bpmnTask.businessObject?.name} → ${conn.target?.businessObject?.name || conn.target?.id}`);
      } catch (e) {
        console.warn('⚠️ Error al eliminar conexión:', e.message);
      }
    }
  });
  
  // 4. Reconstruir flujo
  if (specialElements.length > 0) {
    console.log(`🔗 Reconstruyendo flujo con ${specialElements.length} elementos especiales...`);
    
    // Conectar tarea base → primer elemento especial
    try {
      modeling.connect(bpmnTask, specialElements[0], { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Conectado: ${bpmnTask.businessObject?.name} → ${specialElements[0].businessObject?.name}`);
    } catch (e) {
      console.error(`❌ Error conectando tarea base → primer elemento: ${e.message}`);
    }
    
    // Conectar elementos especiales entre sí
    for (let i = 0; i < specialElements.length - 1; i++) {
      try {
        modeling.connect(specialElements[i], specialElements[i + 1], { type: 'bpmn:SequenceFlow' });
        console.log(`✅ Conectado: ${specialElements[i].businessObject?.name} → ${specialElements[i + 1].businessObject?.name}`);
      } catch (e) {
        console.error(`❌ Error conectando elementos especiales: ${e.message}`);
      }
    }
    
    // Conectar último elemento especial → siguiente tarea real
    try {
      modeling.connect(specialElements[specialElements.length - 1], nextRealTask, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Conectado: ${specialElements[specialElements.length - 1].businessObject?.name} → ${nextRealTask.businessObject?.name}`);
    } catch (e) {
      console.error(`❌ Error conectando último elemento → siguiente tarea: ${e.message}`);
    }
  } else {
    console.log(`🔗 Conectando directamente con siguiente tarea...`);
    try {
      modeling.connect(bpmnTask, nextRealTask, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Conectado: ${bpmnTask.businessObject?.name} → ${nextRealTask.businessObject?.name}`);
    } catch (e) {
      console.error(`❌ Error conectando directamente: ${e.message}`);
    }
  }
  
  console.log(`✅ Restauración de flujo simplificada completada`);
};

// === NUEVA FUNCIÓN: Debug específico para segunda eliminación ===
window.debugSecondRemovalIssue = function(taskName, roleName, elementType) {
  console.log(`🔍 DEBUG: Problema de segunda eliminación para ${elementType} en tarea ${taskName}`);
  
  const modeler = window.bpmnModeler;
  if (!modeler) {
    console.error('❌ No se encontró el modeler BPMN');
    return;
  }
  
  const bpmnTask = findBpmnTaskByName(modeler, taskName);
  if (!bpmnTask) {
    console.error(`❌ No se encontró la tarea: ${taskName}`);
    return;
  }
  
  console.log(`🔍 DEBUG: Estado antes de eliminar ${elementType} por segunda vez...`);
  
  // 1. Verificar estado del flujo
  debugCurrentFlowState(modeler, bpmnTask);
  
  // 2. Verificar elementos especiales existentes
  const existing = findExistingSpecialElements(modeler, bpmnTask);
  console.log(`🔍 DEBUG: Elementos especiales antes de eliminar:`, {
    consultEvents: existing.consultEvents.length,
    approvalTasks: existing.approvalTasks.length,
    infoEvents: existing.infoEvents.length
  });
  
  // 3. Verificar conexiones específicas
  const elementRegistry = modeler.get('elementRegistry');
  const outgoingConnections = elementRegistry.filter(conn => 
    conn.type === 'bpmn:SequenceFlow' && 
    conn.source?.id === bpmnTask.id
  );
  
  console.log(`🔍 DEBUG: Conexiones salientes antes de eliminar: ${outgoingConnections.length}`);
  outgoingConnections.forEach(conn => {
    console.log(`  → ${conn.target?.businessObject?.name || conn.target?.id} (${conn.target?.type})`);
  });
  
  // 4. Verificar si el elemento a eliminar existe
  const elementToRemoveName = elementType === 'C' ? `Consultar ${roleName}` : 
                             elementType === 'A' ? `Aprobar ${roleName}` : 
                             elementType === 'I' ? `Informar ${roleName}` : '';
  
  const elementToRemove = elementRegistry.find(element => 
    element.businessObject?.name === elementToRemoveName
  );
  
  if (elementToRemove) {
    console.log(`🔍 DEBUG: Elemento a eliminar encontrado:`, {
      name: elementToRemove.businessObject?.name,
      id: elementToRemove.id,
      type: elementToRemove.type
    });
    
    // Verificar conexiones del elemento a eliminar
    const elementConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && 
      (conn.source?.id === elementToRemove.id || conn.target?.id === elementToRemove.id)
    );
    
    console.log(`🔍 DEBUG: Conexiones del elemento a eliminar: ${elementConnections.length}`);
    elementConnections.forEach(conn => {
      console.log(`  ${conn.source?.businessObject?.name || conn.source?.id} → ${conn.target?.businessObject?.name || conn.target?.id}`);
    });
  } else {
    console.warn(`⚠️ DEBUG: Elemento a eliminar no encontrado: ${elementToRemoveName}`);
  }
  
  // 5. Ejecutar la eliminación
  console.log(`🔍 DEBUG: Ejecutando eliminación...`);
  if (elementType === 'C' || elementType === 'I') {
    removeConsultOrInfoEventAndRestoreFlow(modeler, bpmnTask, roleName, elementType);
  } else if (elementType === 'A') {
    removeApprovalTaskAndRestoreFlow(modeler, bpmnTask, roleName);
  }
  
  // 6. Verificar estado después de eliminar
  setTimeout(() => {
    console.log(`🔍 DEBUG: Estado después de eliminar ${elementType}...`);
    debugCurrentFlowState(modeler, bpmnTask);
    
    const existingAfter = findExistingSpecialElements(modeler, bpmnTask);
    console.log(`🔍 DEBUG: Elementos especiales después de eliminar:`, {
      consultEvents: existingAfter.consultEvents.length,
      approvalTasks: existingAfter.approvalTasks.length,
      infoEvents: existingAfter.infoEvents.length
    });
    
    const outgoingConnectionsAfter = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && 
      conn.source?.id === bpmnTask.id
    );
    
    console.log(`🔍 DEBUG: Conexiones salientes después de eliminar: ${outgoingConnectionsAfter.length}`);
    outgoingConnectionsAfter.forEach(conn => {
      console.log(`  → ${conn.target?.businessObject?.name || conn.target?.id} (${conn.target?.type})`);
    });
  }, 1000);
}; 

// Función de prueba para verificar adición incremental
window.testIncrementalAddition = function() {
  console.log('🧪 Probando adición incremental de roles...');
  
  if (!window.bpmnModeler) {
    console.error('❌ BPMN Modeler no disponible');
    alert('❌ BPMN Modeler no disponible. Asegúrate de tener un diagrama BPMN abierto.');
    return;
  }

  // Crear una matriz de prueba con adición incremental
  const testMatrix = {
    'Activity_0il3zqg': {
      'Consultor': 'C'
    }
  };
  
  console.log('📋 Matriz de prueba inicial (solo C):', testMatrix);
  
  try {
    console.log('🔄 Ejecutando mapeo con solo rol C...');
    const results1 = executeSimpleRasciMapping(window.bpmnModeler, testMatrix);
    console.log('✅ Primera ejecución completada:', results1);
    
    // Agregar rol I
    testMatrix['Activity_0il3zqg']['Informado'] = 'I';
    console.log('📋 Matriz de prueba con C + I:', testMatrix);
    
    console.log('🔄 Ejecutando mapeo con roles C + I...');
    const results2 = executeSimpleRasciMapping(window.bpmnModeler, testMatrix);
    console.log('✅ Segunda ejecución completada:', results2);
    
    // Agregar rol A
    testMatrix['Activity_0il3zqg']['Aprobador'] = 'A';
    console.log('📋 Matriz de prueba con C + I + A:', testMatrix);
    
    console.log('🔄 Ejecutando mapeo con roles C + I + A...');
    const results3 = executeSimpleRasciMapping(window.bpmnModeler, testMatrix);
    console.log('✅ Tercera ejecución completada:', results3);
    
    // Mostrar resultados en el log si existe
    const logElement = document.getElementById('mapping-log');
    if (logElement) {
      logElement.innerHTML = '';
      logElement.innerHTML += '🧪 Prueba de Adición Incremental\n';
      logElement.innerHTML += '📋 Fase 1 (solo C):\n';
      logElement.innerHTML += `  - Consultas: ${results1.messageFlows}\n`;
      logElement.innerHTML += `  - Informaciones: ${results1.infoEvents}\n`;
      logElement.innerHTML += `  - Aprobaciones: ${results1.approvalTasks}\n`;
      logElement.innerHTML += '📋 Fase 2 (C + I):\n';
      logElement.innerHTML += `  - Consultas: ${results2.messageFlows}\n`;
      logElement.innerHTML += `  - Informaciones: ${results2.infoEvents}\n`;
      logElement.innerHTML += `  - Aprobaciones: ${results2.approvalTasks}\n`;
      logElement.innerHTML += '📋 Fase 3 (C + I + A):\n';
      logElement.innerHTML += `  - Consultas: ${results3.messageFlows}\n`;
      logElement.innerHTML += `  - Informaciones: ${results3.infoEvents}\n`;
      logElement.innerHTML += `  - Aprobaciones: ${results3.approvalTasks}\n`;
      logElement.innerHTML += '✅ Prueba incremental completada\n';
    }
    
    // Mostrar alerta de éxito
    alert(`✅ Prueba incremental completada!\n\n📊 Resultados:\n- Fase 1 (C): ${results1.messageFlows} consultas\n- Fase 2 (C+I): ${results2.messageFlows} consultas, ${results2.infoEvents} informaciones\n- Fase 3 (C+I+A): ${results3.messageFlows} consultas, ${results3.infoEvents} informaciones, ${results3.approvalTasks} aprobaciones`);
    
  } catch (error) {
    console.error('❌ Error en prueba incremental:', error);
    alert(`❌ Error en prueba incremental: ${error.message}`);
  }
}; 

// === FUNCIÓN: Eliminar evento C/I y restablecer flujo ===
function removeConsultOrInfoEventAndRestoreFlow(modeler, bpmnTask, roleName, type) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  let eventName = '';
  if (type === 'C') eventName = `Consultar ${roleName}`;
  if (type === 'I') eventName = `Informar ${roleName}`;
  
  console.log(`🗑️ Eliminando evento ${type} para rol: ${roleName}`);
  
  const eventsToRemove = [];
  elementRegistry.forEach(element => {
    if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
        element.businessObject &&
        element.businessObject.name === eventName) {
      eventsToRemove.push(element);
    }
  });
  
  if (eventsToRemove.length > 0) {
    eventsToRemove.forEach(event => {
      modeling.removeElement(event);
    });
    console.log(`✅ Eliminado evento ${type} para rol: ${roleName}`);
    
    // Restaurar flujo después de eliminar elemento
    restoreFlowAfterElementRemoval(modeler, bpmnTask);
  } else {
    console.log(`ℹ️ No se encontró evento ${type} para eliminar`);
  }
}

// === NUEVA FUNCIÓN: Eliminar tarea de aprobación y restablecer flujo ===
function removeApprovalTaskAndRestoreFlow(modeler, bpmnTask, roleName) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  const approvalTaskName = `Aprobar ${roleName}`;
  
  console.log(`🗑️ Eliminando tarea de aprobación para rol: ${roleName}`);
  
  const approvalTasksToRemove = [];
  elementRegistry.forEach(element => {
    if (element.type === 'bpmn:UserTask' &&
        element.businessObject &&
        element.businessObject.name === approvalTaskName) {
      approvalTasksToRemove.push(element);
    }
  });
  
  if (approvalTasksToRemove.length > 0) {
    approvalTasksToRemove.forEach(task => {
      modeling.removeElement(task);
    });
    console.log(`✅ Eliminada tarea de aprobación para rol: ${roleName}`);
    
    // Restaurar flujo después de eliminar elemento
    restoreFlowAfterElementRemoval(modeler, bpmnTask);
  } else {
    console.log(`ℹ️ No se encontró tarea de aprobación para eliminar`);
  }
}

// === NUEVA FUNCIÓN: Restaurar flujo después de eliminar elemento ===
function restoreFlowAfterElementRemoval(modeler, bpmnTask) {
  console.log(`🔄 Restaurando flujo después de eliminar elemento para: ${bpmnTask.businessObject?.name || bpmnTask.id}`);
  
  // Verificar si quedan otros elementos especiales
  const remainingSpecialElements = findExistingSpecialElements(modeler, bpmnTask);
  const totalRemaining = remainingSpecialElements.consultEvents.length + 
                        remainingSpecialElements.approvalTasks.length + 
                        remainingSpecialElements.infoEvents.length;
  
  console.log(`🔍 Elementos especiales restantes: ${totalRemaining} (C: ${remainingSpecialElements.consultEvents.length}, A: ${remainingSpecialElements.approvalTasks.length}, I: ${remainingSpecialElements.infoEvents.length})`);
  
  if (totalRemaining > 0) {
    // Quedan elementos especiales, reconstruir el flujo con los restantes
    console.log(`🔄 Reconstruyendo flujo con elementos especiales restantes`);
    rebuildSpecialFlowSafely(modeler, bpmnTask);
  } else {
    // No quedan elementos especiales, restaurar flujo original
    console.log(`🔄 No quedan elementos especiales, restaurando flujo original`);
    restoreOriginalFlowSafely(modeler, bpmnTask);
  }
}

// === NUEVA FUNCIÓN: Debug del estado actual del flujo ===
function debugCurrentFlowState(modeler, bpmnTask) {
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔍 DEBUG: Estado actual del flujo para: ${bpmnTask.businessObject?.name || bpmnTask.id}`);
  
  // Verificar conexiones salientes de la tarea base
  const outgoingConnections = elementRegistry.filter(conn => 
    conn.type === 'bpmn:SequenceFlow' && 
    conn.source?.id === bpmnTask.id
  );
  
  console.log(`🔍 DEBUG: Conexiones salientes de la tarea base: ${outgoingConnections.length}`);
  outgoingConnections.forEach(conn => {
    console.log(`  → ${conn.target?.businessObject?.name || conn.target?.id} (${conn.target?.type})`);
  });
  
  // Verificar todos los elementos especiales en el canvas
  const allSpecialElements = [];
  elementRegistry.forEach(element => {
    const elementName = element.businessObject?.name || '';
    if (elementName.startsWith('Consultar ') || elementName.startsWith('Aprobar ') || elementName.startsWith('Informar ')) {
      allSpecialElements.push({
        name: elementName,
        id: element.id,
        type: element.type
      });
    }
  });
  
  console.log(`🔍 DEBUG: Todos los elementos especiales en el canvas: ${allSpecialElements.length}`);
  allSpecialElements.forEach(el => {
    console.log(`  - ${el.name} (${el.type}) - ID: ${el.id}`);
  });
}


// === FUNCIÓN: Reconstruir el flujo lineal de elementos especiales (C, A, I) ===
function rebuildSpecialFlow(modeler, bpmnTask) {
  rebuildSpecialFlowSafely(modeler, bpmnTask);
}

// === NUEVA FUNCIÓN: Reconstruir flujo especial de forma segura ===
function rebuildSpecialFlowSafely(modeler, bpmnTask) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');

  console.log(`🔄 Reconstruyendo flujo especial de forma segura para: ${bpmnTask.businessObject?.name || bpmnTask.id}`);

  // Utilizar findExistingSpecialElements para obtener los eventos especiales
  const existing = findExistingSpecialElements(modeler, bpmnTask);
  const orderedSpecials = [
    ...existing.consultEvents,
    ...existing.approvalTasks,
    ...existing.infoEvents
  ];

  console.log(`🔍 Elementos especiales encontrados: ${orderedSpecials.length} (C: ${existing.consultEvents.length}, A: ${existing.approvalTasks.length}, I: ${existing.infoEvents.length})`);

  // Si no quedan eventos/tareas especiales, conectar la tarea base con la siguiente tarea real
  if (orderedSpecials.length === 0) {
    console.log(`ℹ️ No hay elementos especiales, restaurando flujo original`);
    restoreOriginalFlowSafely(modeler, bpmnTask);
    return;
  }

  // Buscar la siguiente tarea real
  const nextTask = findNextTaskInOriginalFlow(modeler, bpmnTask);
  if (!nextTask) {
    console.warn(`⚠️ No se encontró siguiente tarea real para conectar`);
    return;
  }

  console.log(`✅ Siguiente tarea real encontrada: ${nextTask.businessObject?.name || nextTask.id}`);

  // PASO 1: Limpiar TODAS las conexiones salientes de la tarea base y elementos especiales
  console.log(`🧹 Limpiando todas las conexiones salientes...`);
  
  // Limpiar conexiones salientes de la tarea base
  elementRegistry.forEach(conn => {
    if (conn.type === 'bpmn:SequenceFlow' && conn.source?.id === bpmnTask.id) {
      try {
        modeling.removeConnection(conn);
        console.log(`🗑️ Eliminada conexión saliente de tarea base: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${conn.target?.businessObject?.name || conn.target?.id}`);
      } catch (e) {
        console.warn('⚠️ Error al eliminar conexión saliente de tarea base:', e.message);
      }
    }
  });
  
  // Limpiar conexiones salientes de elementos especiales
  orderedSpecials.forEach(special => {
    elementRegistry.forEach(conn => {
      if (conn.type === 'bpmn:SequenceFlow' && conn.source?.id === special.id) {
        try {
          modeling.removeConnection(conn);
          console.log(`🗑️ Eliminada conexión saliente de elemento especial: ${special.businessObject?.name || special.id} → ${conn.target?.businessObject?.name || conn.target?.id}`);
        } catch (e) {
          console.warn('⚠️ Error al eliminar conexión saliente de elemento especial:', e.message);
        }
      }
    });
  });
  
  console.log(`🔍 Limpieza completada, reconstruyendo flujo...`);

  // PASO 2: Reconstruir la cadena secuencial desde cero
  console.log(`🔗 Reconstruyendo cadena secuencial desde cero...`);
  
  // Conectar tarea base → primer elemento especial
  if (orderedSpecials.length > 0) {
    const firstSpecial = orderedSpecials[0];
    try {
      modeling.connect(bpmnTask, firstSpecial, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Conectado: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${firstSpecial.businessObject?.name || firstSpecial.id}`);
    } catch (e) {
      console.error(`❌ Error conectando tarea base → primer elemento: ${e.message}`);
    }
  }

  // Conectar elementos especiales entre sí
  for (let i = 0; i < orderedSpecials.length - 1; i++) {
    const current = orderedSpecials[i];
    const next = orderedSpecials[i + 1];
    
    try {
      modeling.connect(current, next, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Conectado: ${current.businessObject?.name || current.id} → ${next.businessObject?.name || next.id}`);
    } catch (e) {
      console.error(`❌ Error conectando elementos especiales: ${e.message}`);
    }
  }

  // Conectar último elemento especial → siguiente tarea real
  if (orderedSpecials.length > 0) {
    const lastSpecial = orderedSpecials[orderedSpecials.length - 1];
    try {
      modeling.connect(lastSpecial, nextTask, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Conectado: ${lastSpecial.businessObject?.name || lastSpecial.id} → ${nextTask.businessObject?.name || nextTask.id}`);
    } catch (e) {
      console.error(`❌ Error conectando último elemento → siguiente tarea: ${e.message}`);
    }
  }

  console.log(`✅ Flujo especial reconstruido exitosamente`);
}

// === NUEVA FUNCIÓN: Verificar conexiones del flujo ===
function verifyFlowConnections(modeler, bpmnTask, orderedSpecials, nextTask) {
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔍 Verificando flujo: ${bpmnTask.businessObject?.name || bpmnTask.id} → [elementos especiales] → ${nextTask.businessObject?.name || nextTask.id}`);
  
  // Verificar conexión tarea base → primer elemento especial
  if (orderedSpecials.length > 0) {
    const firstSpecial = orderedSpecials[0];
    const connection = elementRegistry.find(conn => 
      conn.type === 'bpmn:SequenceFlow' &&
      conn.source?.id === bpmnTask.id &&
      conn.target?.id === firstSpecial.id
    );
    
    if (connection) {
      console.log(`✅ Conexión verificada: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${firstSpecial.businessObject?.name || firstSpecial.id}`);
    } else {
      console.warn(`⚠️ Conexión faltante: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${firstSpecial.businessObject?.name || firstSpecial.id}`);
    }
  }
  
  // Verificar conexiones entre elementos especiales
  for (let i = 0; i < orderedSpecials.length - 1; i++) {
    const current = orderedSpecials[i];
    const next = orderedSpecials[i + 1];
    
    const connection = elementRegistry.find(conn => 
      conn.type === 'bpmn:SequenceFlow' &&
      conn.source?.id === current.id &&
      conn.target?.id === next.id
    );
    
    if (connection) {
      console.log(`✅ Conexión verificada: ${current.businessObject?.name || current.id} → ${next.businessObject?.name || next.id}`);
    } else {
      console.warn(`⚠️ Conexión faltante: ${current.businessObject?.name || current.id} → ${next.businessObject?.name || next.id}`);
    }
  }
  
  // Verificar conexión último elemento especial → siguiente tarea
  if (orderedSpecials.length > 0) {
    const lastSpecial = orderedSpecials[orderedSpecials.length - 1];
    const connection = elementRegistry.find(conn => 
      conn.type === 'bpmn:SequenceFlow' &&
      conn.source?.id === lastSpecial.id &&
      conn.target?.id === nextTask.id
    );
    
    if (connection) {
      console.log(`✅ Conexión verificada: ${lastSpecial.businessObject?.name || lastSpecial.id} → ${nextTask.businessObject?.name || nextTask.id}`);
    } else {
      console.warn(`⚠️ Conexión faltante: ${lastSpecial.businessObject?.name || lastSpecial.id} → ${nextTask.businessObject?.name || nextTask.id}`);
    }
  } else {
    // Si no hay elementos especiales, verificar conexión directa
    const connection = elementRegistry.find(conn => 
      conn.type === 'bpmn:SequenceFlow' &&
      conn.source?.id === bpmnTask.id &&
      conn.target?.id === nextTask.id
    );
    
    if (connection) {
      console.log(`✅ Conexión directa verificada: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${nextTask.businessObject?.name || nextTask.id}`);
    } else {
      console.warn(`⚠️ Conexión directa faltante: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${nextTask.businessObject?.name || nextTask.id}`);
    }
  }
}

// === MODIFICAR la restauración de flujo para usar rebuildSpecialFlow ===
function restoreOriginalTaskConnection(bpmnTask, modeler) {
  rebuildSpecialFlowSafely(modeler, bpmnTask);
}

// === FUNCIÓN GLOBAL: Eliminar elemento especial y restaurar flujo ===
window.removeSpecialElementAndRestoreFlow = function(taskName, roleName, elementType) {
  console.log(`🗑️ Eliminando elemento especial: ${elementType} para rol ${roleName} en tarea ${taskName}`);
  
  if (!window.bpmnModeler) {
    console.error('❌ BPMN Modeler no disponible');
    alert('❌ BPMN Modeler no disponible. Asegúrate de tener un diagrama BPMN abierto.');
    return;
  }
  
  const modeler = window.bpmnModeler;
  const bpmnTask = findBpmnTaskByName(modeler, taskName);
  
  if (!bpmnTask) {
    console.error(`❌ No se encontró la tarea BPMN: ${taskName}`);
    alert(`❌ No se encontró la tarea BPMN: ${taskName}`);
    return;
  }
  
  try {
    switch (elementType) {
      case 'C':
        removeConsultOrInfoEventAndRestoreFlow(modeler, bpmnTask, roleName, 'C');
        break;
      case 'A':
        removeApprovalTaskAndRestoreFlow(modeler, bpmnTask, roleName);
        break;
      case 'I':
        removeConsultOrInfoEventAndRestoreFlow(modeler, bpmnTask, roleName, 'I');
        break;
      default:
        console.error(`❌ Tipo de elemento no válido: ${elementType}`);
        alert(`❌ Tipo de elemento no válido: ${elementType}`);
        return;
    }
    
    console.log(`✅ Elemento especial eliminado y flujo restaurado`);
    alert(`✅ Elemento especial ${elementType} eliminado y flujo restaurado correctamente`);
    
  } catch (error) {
    console.error(`❌ Error eliminando elemento especial: ${error.message}`);
    alert(`❌ Error eliminando elemento especial: ${error.message}`);
  }
};

// === NUEVA FUNCIÓN: Crear elementos especiales secuencialmente ===
function createSequentialSpecialElements(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔍 Creando elementos especiales secuencialmente para: ${bpmnTask.businessObject && bpmnTask.businessObject.name ? bpmnTask.businessObject.name : bpmnTask.id}`);
  
  // Buscar la siguiente tarea real (ignorando elementos especiales)
  const nextRealTask = findNextTaskInOriginalFlow(modeler, bpmnTask);
  if (!nextRealTask) {
    console.warn(`⚠️ No se encontró siguiente tarea real para conectar elementos especiales`);
    return;
  }
  
  console.log(`✅ Siguiente tarea real encontrada: ${nextRealTask.businessObject && nextRealTask.businessObject.name ? nextRealTask.businessObject.name : nextRealTask.id}`);

  // PASO 1: Limpieza selectiva de conexiones problemáticas
  console.log(`🧹 Limpiando conexiones problemáticas...`);
  try {
    // Solo eliminar la conexión directa de la tarea base a la siguiente tarea real
    // (si existe) para evitar flujos paralelos
    const directConnection = elementRegistry.find(conn => 
      conn.type === 'bpmn:SequenceFlow' &&
      conn.source?.id === bpmnTask.id &&
      conn.target?.id === nextRealTask.id
    );
    
    if (directConnection) {
      try {
        modeling.removeConnection(directConnection);
        console.log(`🗑️ Eliminada conexión directa problemática: ${bpmnTask.businessObject?.name || bpmnTask.id} → ${nextRealTask.businessObject?.name || nextRealTask.id}`);
      } catch (e) {
        console.warn('⚠️ Error al eliminar conexión directa:', e.message);
      }
    }
    
    // NO eliminar otras conexiones de la tarea base (como las que van a elementos especiales existentes)
    // Esto preserva el flujo anterior y solo elimina la conexión que causaría flujos paralelos
  } catch (e) {
    console.warn('⚠️ Error al limpiar conexiones problemáticas:', e.message);
  }
  
  // PASO 2: Crear elementos especiales en orden secuencial
  let currentSource = bpmnTask;
  const flowElements = [];
  
  // 1. PRIMERO: Crear eventos de consulta (C)
  if (consultRoles.length > 0) {
    console.log(`🔍 Procesando ${consultRoles.length} roles de consulta...`);
    for (const roleName of consultRoles) {
      console.log(`🔄 Creando consulta para rol: ${roleName}`);
      
      // Crear evento de consulta
      const consultEvent = createConsultEventSequential(modeler, currentSource, roleName, results);
      if (consultEvent) {
        flowElements.push(consultEvent);
        currentSource = consultEvent;
        console.log(`✅ Consulta creada y conectada: ${consultEvent.businessObject && consultEvent.businessObject.name ? consultEvent.businessObject.name : consultEvent.id}`);
      }
    }
  }
  
  // 2. SEGUNDO: Crear tareas de aprobación (A)
  if (approveRoles.length > 0) {
    console.log(`🔍 Procesando ${approveRoles.length} roles de aprobación...`);
    for (const roleName of approveRoles) {
      console.log(`🔄 Creando aprobación para rol: ${roleName}`);
      
      // Crear rol RALph para aprobación
      createRalphRole(modeler, roleName, results);
      
      // Crear tarea de aprobación
      const approvalTask = createApprovalTaskSequential(modeler, currentSource, roleName, results);
      if (approvalTask) {
        flowElements.push(approvalTask);
        currentSource = approvalTask;
        console.log(`✅ Aprobación creada y conectada: ${approvalTask.businessObject && approvalTask.businessObject.name ? approvalTask.businessObject.name : approvalTask.id}`);
      }
    }
  }
  
  // 3. TERCERO: Crear eventos de información (I)
  if (informRoles.length > 0) {
    console.log(`🔍 Procesando ${informRoles.length} roles de información...`);
    for (const roleName of informRoles) {
      console.log(`🔄 Creando información para rol: ${roleName}`);
      
      // Crear evento de información
      const infoEvent = createInfoEventSequential(modeler, currentSource, roleName, results);
      if (infoEvent) {
        flowElements.push(infoEvent);
        currentSource = infoEvent;
        console.log(`✅ Información creada y conectada: ${infoEvent.businessObject && infoEvent.businessObject.name ? infoEvent.businessObject.name : infoEvent.id}`);
      }
    }
  }
  
  // PASO 3: Conectar el último elemento a la siguiente tarea real
  if (flowElements.length > 0) {
    const lastElement = flowElements[flowElements.length - 1];
    try {
      modeling.connect(lastElement, nextRealTask, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Flujo completo conectado: ${lastElement.businessObject && lastElement.businessObject.name ? lastElement.businessObject.name : lastElement.id} → ${nextRealTask.businessObject && nextRealTask.businessObject.name ? nextRealTask.businessObject.name : nextRealTask.id}`);
    } catch (e) {
      console.error(`❌ Error al conectar último elemento: ${e.message}`);
    }
  } else {
    // Si no hay elementos especiales, restaurar conexión directa
    try {
      modeling.connect(bpmnTask, nextRealTask, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Conexión directa restaurada: ${bpmnTask.businessObject && bpmnTask.businessObject.name ? bpmnTask.businessObject.name : bpmnTask.id} → ${nextRealTask.businessObject && nextRealTask.businessObject.name ? nextRealTask.businessObject.name : nextRealTask.id}`);
    } catch (e) {
      console.error(`❌ Error al restaurar conexión directa: ${e.message}`);
    }
  }

  // PASO 4: Verificar que el flujo se creó correctamente
  console.log(`🔍 Verificando flujo creado...`);
  const finalFlow = [bpmnTask, ...flowElements, nextRealTask];
  const flowNames = finalFlow.map(el => el.businessObject && el.businessObject.name ? el.businessObject.name : el.id);
  console.log(`🔗 Flujo secuencial final: ${flowNames.join(' → ')}`);
  
  // Verificar conexiones
  for (let i = 0; i < finalFlow.length - 1; i++) {
    const source = finalFlow[i];
    const target = finalFlow[i + 1];
    const connection = elementRegistry.find(conn => 
      conn.type === 'bpmn:SequenceFlow' &&
      conn.source?.id === source.id &&
      conn.target?.id === target.id
    );
    if (connection) {
      console.log(`✅ Conexión verificada: ${source.businessObject?.name || source.id} → ${target.businessObject?.name || target.id}`);
    } else {
      console.warn(`⚠️ Conexión faltante: ${source.businessObject?.name || source.id} → ${target.businessObject?.name || target.id}`);
    }
  }
}

// === FUNCIÓN: Crear evento de consulta secuencial ===
function createConsultEventSequential(modeler, sourceElement, roleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔄 Creando evento de consulta secuencial para rol: ${roleName}`);
  
  // Verificar si ya existe un evento de consulta para este rol
  const consultEventName = `Consultar ${roleName}`;
  const existingConsultEvent = elementRegistry.find(element => 
    (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
    element.businessObject && element.businessObject.name === consultEventName
  );
  
  if (existingConsultEvent) {
    console.log(`ℹ️ Evento de consulta ya existe para rol: ${roleName}, reutilizando...`);
    
    // Limpiar conexiones existentes del evento
    elementRegistry.forEach(conn => {
      if (conn.type === 'bpmn:SequenceFlow' &&
          (conn.source?.id === existingConsultEvent.id || conn.target?.id === existingConsultEvent.id)) {
        try {
          modeling.removeConnection(conn);
        } catch (e) {
          // Ignorar errores silenciosos
        }
      }
    });
    
    // Conectar la fuente actual con el evento reutilizado
    try {
      modeling.connect(sourceElement, existingConsultEvent, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Evento de consulta reutilizado y conectado: ${consultEventName}`);
    } catch (e) {
      console.error(`❌ Error al conectar evento de consulta existente: ${e.message}`);
    }
    
    return existingConsultEvent;
  }
  
  try {
    const rootElement = canvas.getRootElement();
    
    // Calcular posición
    const consultPosition = {
      x: sourceElement.x + 150,
      y: sourceElement.y
    };
    
    // Crear el evento de consulta
    const consultEvent = modeling.createShape(
      { type: 'bpmn:IntermediateThrowEvent' },
      consultPosition,
      rootElement
    );
    
    if (!consultEvent) {
      console.error(`❌ Error: No se pudo crear el evento de consulta`);
      return null;
    }
    
    // Configurar el evento de consulta
    modeling.updateProperties(consultEvent, {
      name: consultEventName
    });
    
    // Conectar source → consulta
    try {
      modeling.connect(sourceElement, consultEvent, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Evento de consulta creado y conectado: ${consultEventName}`);
    } catch (e) {
      console.error(`❌ Error al conectar evento de consulta: ${e.message}`);
    }
    
    results.messageFlows++;
    
    return consultEvent;
    
  } catch (error) {
    console.error(`❌ Error creando evento de consulta: ${error.message}`);
    return null;
  }
}

// === FUNCIÓN: Crear tarea de aprobación secuencial ===
function createApprovalTaskSequential(modeler, sourceElement, roleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔄 Creando tarea de aprobación secuencial para rol: ${roleName}`);
  
  // Verificar si ya existe una tarea de aprobación para este rol
  const approvalTaskName = `Aprobar ${roleName}`;
  const existingApprovalTask = elementRegistry.find(element => 
    element.type === 'bpmn:UserTask' && 
    element.businessObject && element.businessObject.name === approvalTaskName
  );
  
  if (existingApprovalTask) {
    console.log(`ℹ️ Tarea de aprobación ya existe para rol: ${roleName}, reutilizando...`);
    
    // Limpiar conexiones existentes de la tarea
    elementRegistry.forEach(conn => {
      if (conn.type === 'bpmn:SequenceFlow' &&
          (conn.source?.id === existingApprovalTask.id || conn.target?.id === existingApprovalTask.id)) {
        try {
          modeling.removeConnection(conn);
        } catch (e) {
          // Silenciar errores
        }
      }
    });
    
    // Conectar la fuente actual con la tarea de aprobación reutilizada
    try {
      modeling.connect(sourceElement, existingApprovalTask, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Tarea de aprobación reutilizada y conectada: ${approvalTaskName}`);
    } catch (e) {
      console.error(`❌ Error al conectar tarea de aprobación existente: ${e.message}`);
    }
    
    // Comprobar si la asignación de recurso (tarea → rol) existe; si no, crearla
    const existingAssignment = elementRegistry.find(element =>
      (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association') &&
      ((element.source?.id === existingApprovalTask.id && element.target?.businessObject?.name === roleName) ||
       (element.target?.id === existingApprovalTask.id && element.source?.businessObject?.name === roleName))
    );
    if (!existingAssignment) {
      createSimpleAssignment(modeler, existingApprovalTask, roleName, results);
    }
    
    return existingApprovalTask;
  }
  
  try {
    const rootElement = canvas.getRootElement();
    
    // Calcular posición
    const approvalPosition = {
      x: sourceElement.x + 150,
      y: sourceElement.y
    };
    
    // Crear la tarea de aprobación
    const approvalTask = modeling.createShape(
      { type: 'bpmn:UserTask' },
      approvalPosition,
      rootElement
    );
    
    if (!approvalTask) {
      console.error(`❌ Error: No se pudo crear la tarea de aprobación`);
      return null;
    }
    
    // Configurar la tarea de aprobación
    modeling.updateProperties(approvalTask, {
      name: approvalTaskName
    });
    
    // Conectar source → aprobación
    try {
      modeling.connect(sourceElement, approvalTask, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Tarea de aprobación creada y conectada: ${approvalTaskName}`);
    } catch (e) {
      console.error(`❌ Error al conectar tarea de aprobación: ${e.message}`);
    }
    
    // Conectar la tarea de aprobación al rol
    createSimpleAssignment(modeler, approvalTask, roleName, results);
    
    results.approvalTasks++;
    
    return approvalTask;
    
  } catch (error) {
    console.error(`❌ Error creando tarea de aprobación: ${error.message}`);
    return null;
  }
}

// === FUNCIÓN: Crear evento de información secuencial ===
function createInfoEventSequential(modeler, sourceElement, roleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔄 Creando evento de información secuencial para rol: ${roleName}`);
  
  // Verificar si ya existe un evento de información para este rol
  const infoEventName = `Informar ${roleName}`;
  const existingInfoEvent = elementRegistry.find(element => 
    (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
    element.businessObject && element.businessObject.name === infoEventName
  );
  
  if (existingInfoEvent) {
    console.log(`ℹ️ Evento de información ya existe para rol: ${roleName}, reutilizando...`);
    
    // Limpiar conexiones existentes del evento
    elementRegistry.forEach(conn => {
      if (conn.type === 'bpmn:SequenceFlow' &&
          (conn.source?.id === existingInfoEvent.id || conn.target?.id === existingInfoEvent.id)) {
        try {
          modeling.removeConnection(conn);
        } catch (e) {
          // Silenciar errores
        }
      }
    });
    
    // Conectar la fuente actual con el evento de información reutilizado
    try {
      modeling.connect(sourceElement, existingInfoEvent, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Evento de información reutilizado y conectado: ${infoEventName}`);
    } catch (e) {
      console.error(`❌ Error al conectar evento de información existente: ${e.message}`);
    }
    
    // Comprobar si la asignación de recurso (evento → rol) existe; los eventos de información
    // se conectan a los roles mediante ResourceArc; si falta, crearla.
    const existingAssignment = elementRegistry.find(element =>
      (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association') &&
      ((element.source?.id === existingInfoEvent.id && element.target?.businessObject?.name === roleName) ||
       (element.target?.id === existingInfoEvent.id && element.source?.businessObject?.name === roleName))
    );
    if (!existingAssignment) {
      createSimpleAssignment(modeler, existingInfoEvent, roleName, results);
    }
    
    return existingInfoEvent;
  }
  
  try {
    const rootElement = canvas.getRootElement();
    
    // Calcular posición
    const infoPosition = {
      x: sourceElement.x + 150,
      y: sourceElement.y
    };
    
    // Crear el evento de información
    const infoEvent = modeling.createShape(
      { type: 'bpmn:IntermediateThrowEvent' },
      infoPosition,
      rootElement
    );
    
    if (!infoEvent) {
      console.error(`❌ Error: No se pudo crear el evento de información`);
      return null;
    }
    
    // Configurar el evento de información
    modeling.updateProperties(infoEvent, {
      name: infoEventName
    });
    
    // Conectar source → información
    try {
      modeling.connect(sourceElement, infoEvent, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Evento de información creado y conectado: ${infoEventName}`);
    } catch (e) {
      console.error(`❌ Error al conectar evento de información: ${e.message}`);
    }
    
    results.infoEvents++;
    
    return infoEvent;
    
  } catch (error) {
    console.error(`❌ Error creando evento de información: ${error.message}`);
    return null;
  }
}

