// RASCI Mapping Elements - Clean Version
// Special element creation and flow restoration functionality

import { rasciManager } from '../core/matrix-manager.js';
import { getElementName, originalFlowMap, saveOriginalFlow } from './core-functions.js';

function findNextTaskInOriginalFlow(modeler, currentTask) {
  const elementRegistry = modeler.get('elementRegistry');
  
  function findNextElementRecursive(task, visited = new Set()) {
    if (visited.has(task.id)) {
      return null;
    }
    visited.add(task.id);
    
    const outgoingConnections = elementRegistry.filter(connection => 
      connection.type === 'bpmn:SequenceFlow' && connection.source && connection.source.id === task.id
    );
    
    for (const connection of outgoingConnections) {
      const target = connection.target;
      const targetName = getElementName(target);
      const targetType = target.type;
      
      // Saltar elementos especiales (Aprobar, Consultar, Informar)
      if (targetName && ['Aprobar ', 'Consultar ', 'Informar '].some(prefix => targetName.startsWith(prefix))) {
        const nextElement = findNextElementRecursive(target, visited);
        if (nextElement) return nextElement;
        continue;
      }
      
      // Aceptar cualquier elemento BPMN válido como destino (no solo tareas)
      const validTypes = [
        // Tareas
        'bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 
        'bpmn:ManualTask', 'bpmn:BusinessRuleTask', 'bpmn:SendTask', 'bpmn:ReceiveTask',
        // Actividades
        'bpmn:CallActivity', 'bpmn:SubProcess',
        // Eventos
        'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateCatchEvent', 'bpmn:IntermediateThrowEvent',
        'bpmn:BoundaryEvent', 'bpmn:TerminateEndEvent',
        // Gateways
        'bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:InclusiveGateway', 
        'bpmn:ComplexGateway', 'bpmn:EventBasedGateway'
      ];
      
      if (validTypes.includes(targetType)) {
        return target;
      }
      
      // Si es otro tipo de gateway o elemento, continuar buscando
      if (targetType && (targetType.includes('Gateway') || targetType.includes('Event'))) {
        const nextElement = findNextElementRecursive(target, visited);
        if (nextElement) return nextElement;
      }
    }
    
    return null;
  }
  
  return findNextElementRecursive(currentTask);
}

function createSpecialElement(modeler, sourceElement, roleName, elementType, eventType, results, sourceTaskName = null) {
  
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  let elementName;
  if (eventType === 'Consultar') {
    elementName = `Consultar ${roleName}`;
  } else if (eventType === 'Informar') {
    elementName = `Informar ${roleName}`;
  } else if (eventType === 'Aprobar') {
    // Usar el formato simplificado "Aprobar Tarea X"
    if (sourceTaskName) {
      elementName = `Aprobar ${sourceTaskName}`;
    } else {
      elementName = `Aprobar ${roleName}`;
    }
  } else {
    elementName = `${eventType} ${roleName}`;
  }
  
  
  // Para tareas de aprobación con nombre específico, siempre crear nuevos elementos
  // Para otros tipos o tareas genéricas, verificar si existe uno reutilizable
  if (eventType !== 'Aprobar') {
    const existingElement = elementRegistry.find(element => 
      element.type === elementType && 
      element.businessObject && element.businessObject.name === elementName
    );
    
    if (existingElement) {
      elementRegistry.forEach(conn => {
        if (conn.type === 'bpmn:SequenceFlow' &&
            (conn.source && conn.source.id === existingElement.id || conn.target && conn.target.id === existingElement.id)) {
          try {
            modeling.removeConnection(conn);
          } catch (e) {
            // Handle error silently
          }
        }
      });
      
      try {
        modeling.connect(sourceElement, existingElement, { type: 'bpmn:SequenceFlow' });
      } catch (e) {
        // Handle error silently
      }
      
      return existingElement;
    }
  }
  
  try {
    const rootElement = canvas.getRootElement();
    
    const existingSpecialElements = elementRegistry.filter(element => 
      (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:UserTask') &&
      element.businessObject && element.businessObject.name &&
      (element.businessObject.name.startsWith('Consultar ') || 
       element.businessObject.name.startsWith('Aprobar ') || 
       element.businessObject.name.startsWith('Informar '))
    );
    
    const sourceX = sourceElement.x || (sourceElement.bounds && sourceElement.bounds.x) || 0;
    const sourceY = sourceElement.y || (sourceElement.bounds && sourceElement.bounds.y) || 0;
    let position = { x: sourceX + 150, y: sourceY };
    
    let attempts = 0;
    const maxAttempts = 10;
    const elementWidth = 120;
    const elementHeight = 80;
    const margin = 50;
    
    while (attempts < maxAttempts) {
      const isOccupied = existingSpecialElements.some(element => {
        const elementX = element.x || (element.bounds && element.bounds.x) || 0;
        const elementY = element.y || (element.bounds && element.bounds.y) || 0;
        const distance = Math.sqrt(
          Math.pow(elementX - position.x, 2) + Math.pow(elementY - position.y, 2)
        );
        return distance < (elementWidth + margin);
      });
      
      if (!isOccupied) break;
      
      if (attempts % 2 === 0) {
        position.x += elementWidth + margin;
      } else {
        position.y += elementHeight + margin;
        position.x = sourceX + 150;
      }
      attempts++;
    }
    
    const elementData = { type: elementType };
    const element = modeling.createShape(elementData, position, rootElement);
    
    if (!element) return null;
    
    try {
      if (elementType === 'bpmn:IntermediateThrowEvent') {
        const moddle = modeler.get('moddle');
        if (!element.businessObject.eventDefinitions) {
          const messageEventDefinition = moddle.create('bpmn:MessageEventDefinition');
          element.businessObject.eventDefinitions = [messageEventDefinition];
        }
      }
      
      if (element.businessObject) {
        modeling.updateProperties(element, { name: elementName });
      } else {
        const moddle = modeler.get('moddle');
        element.businessObject = moddle.create(elementType, { name: elementName });
      }
      
      if (element.businessObject && !element.businessObject.name) {
        element.businessObject.name = elementName;
      }
      
    } catch (immediateError) {
      // Handle error silently
    }
    
    setTimeout(() => {
      try {
        if (!element.businessObject || !element.businessObject.name || element.businessObject.name !== elementName) {
          if (element.businessObject) {
            modeling.updateProperties(element, { name: elementName });
            element.businessObject.name = elementName;
          } else {
            const moddle = modeler.get('moddle');
            element.businessObject = moddle.create(elementType, { name: elementName });
          }
        }
        
        const canvas = modeler.get('canvas');
        if (canvas && typeof canvas.zoom === 'function') {
          const currentZoom = canvas.zoom();
          canvas.zoom(currentZoom, 'auto');
        }
        
      } catch (labelError) {
        // Handle error silently
      }
    }, 150);
    
    try {
      modeling.connect(sourceElement, element, { type: 'bpmn:SequenceFlow' });
    } catch (e) {
      // Handle error silently
    }
    
    if (eventType === 'Aprobar') results.approvalTasks++;
    else if (eventType === 'Consultar') results.messageFlows++;
    else results.infoEvents++;
    
    return element;
  } catch (error) {
    return null;
  }
}

function createSequentialSpecialElements(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results) {
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  const taskName = getElementName(bpmnTask);
  
  // 🛡️ VERIFICAR SI YA EXISTEN ELEMENTOS ESPECIALES PARA ESTA TAREA
  const existingSpecialElements = elementRegistry.filter(element => {
    if (!element.businessObject || !element.businessObject.name) return false;
    const name = element.businessObject.name;
    
    // Verificar si es un elemento especial relacionado con esta tarea
    return (name.startsWith('Consultar ') && consultRoles.some(role => name.includes(role))) ||
           (name.startsWith('Aprobar ') && name.includes(taskName)) ||
           (name.startsWith('Informar ') && informRoles.some(role => name.includes(role)));
  });
  
  if (existingSpecialElements.length > 0) {
    return;
  }
  
  const nextRealTask = findNextTaskInOriginalFlow(modeler, bpmnTask);
  
  // Eliminar conexión directa existente
  let targetForConnection = nextRealTask;
  let directConnection = null;
  
  if (nextRealTask) {
    directConnection = elementRegistry.find(conn => 
      conn.type === 'bpmn:SequenceFlow' &&
      conn.source && conn.source.id === bpmnTask.id &&
      conn.target && conn.target.id === nextRealTask.id
    );
  } else {
    // Si no hay próximo elemento, buscar cualquier conexión saliente
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' &&
      conn.source && conn.source.id === bpmnTask.id
    );
    
    if (outgoingConnections.length > 0) {
      directConnection = outgoingConnections[0];
      targetForConnection = directConnection.target;
    }
  }
  
  if (directConnection) {
    try {
      modeling.removeConnection(directConnection);
    } catch (e) {
    }
  }
  
  let currentSource = bpmnTask;
  const flowElements = [];
  
  // 📝 CREAR ELEMENTOS EN ORDEN: Consultar -> Aprobar -> Informar
  
  // 1. Elementos de Consulta (uno por rol)
  consultRoles.forEach(roleName => {
    const element = createSpecialElement(modeler, currentSource, roleName, 'bpmn:IntermediateThrowEvent', 'Consultar', results, taskName);
    if (element) {
      flowElements.push(element);
      currentSource = element;
    }
  });
  
  // 2. UN SOLO elemento de Aprobación para la tarea (independientemente del número de roles)
  if (approveRoles.length > 0) {
    const element = createSpecialElement(modeler, currentSource, approveRoles[0], 'bpmn:UserTask', 'Aprobar', results, taskName);
    if (element) {
      flowElements.push(element);
      currentSource = element;
      results.approvalTasks++;
    }
  }
  
  // 3. Elementos de Información (uno por rol)
  informRoles.forEach(roleName => {
    const element = createSpecialElement(modeler, currentSource, roleName, 'bpmn:IntermediateThrowEvent', 'Informar', results, taskName);
    if (element) {
      flowElements.push(element);
      currentSource = element;
    }
  });
  
  // 4. Conectar al siguiente elemento o mantener sin conexión si no hay nada
  if (targetForConnection) {
    try {
      modeling.connect(currentSource, targetForConnection, { type: 'bpmn:SequenceFlow' });
    } catch (e) {
    }
  } else {
  }
  
}

function restoreFlowAfterApprovalRemoval(modeler) {
  if (originalFlowMap.size === 0) {
    saveOriginalFlow(modeler);
    
    if (originalFlowMap.size === 0) {
      restoreFlowByElementNames(modeler);
      return;
    }
  }
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  for (const [sourceTaskId, targets] of originalFlowMap.entries()) {
    let sourceElement = elementRegistry.get(sourceTaskId);
    if (!sourceElement) {
      sourceElement = elementRegistry.find(element => getElementName(element) === sourceTaskId);
    }
    
    if (!sourceElement) continue;
    
    const sourceConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === sourceElement.id
    );
    
    if (sourceConnections.length === 0) {
      for (const originalTarget of targets) {
        let targetElement = elementRegistry.get(originalTarget.id);
        if (!targetElement) {
          targetElement = elementRegistry.find(element => 
            getElementName(element) === getElementName(originalTarget)
          );
        }
        
        if (targetElement) {
          // Verificar que no exista ya una conexión a esta tarea
          const existingConnection = elementRegistry.find(conn => 
            conn.type === 'bpmn:SequenceFlow' && 
            conn.source && conn.source.id === sourceElement.id &&
            conn.target && conn.target.id === targetElement.id
          );
          
          if (!existingConnection) {
            try {
              modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
              break;
            } catch (e) {
              // Handle error silently
            }
          }
        }
      }
    }
  }
}

function restoreBpmnFlow(modeler) {
  const elementRegistry = modeler.get('elementRegistry');
  
  
  // Incluir más tipos de elementos BPMN para una restauración más completa
  const bpmnElements = elementRegistry.filter(element => 
    ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 
     'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateThrowEvent', 
     'bpmn:IntermediateCatchEvent', 'bpmn:CallActivity', 'bpmn:SubProcess',
     'bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:InclusiveGateway'].includes(element.type)
  );
  
  bpmnElements.forEach(element => {
    const elementName = getElementName(element);
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === element.id
    );
    
    // Solo intentar restaurar conexiones para elementos que no tienen conexiones salientes
    if (outgoingConnections.length === 0) {
      
      if (elementName && elementName.startsWith('Aprobar ')) {
        // Para tareas de aprobación, buscar la tarea original y conectar a su siguiente elemento
        handleApprovalTaskReconnection(modeler, element, elementName);
      } else if (!elementName || (!elementName.startsWith('Consultar ') && !elementName.startsWith('Informar '))) {
        // Solo reconectar elementos normales (no especiales de consulta/información)
        handleNormalElementReconnection(modeler, element, elementName);
      }
    }
  });
  
}

function handleApprovalTaskReconnection(modeler, approvalTask, approvalTaskName) {
  // Extraer el nombre de la tarea original del nombre de aprobación
  let originalTaskName = null;
  
  if (approvalTaskName.includes(' ')) {
    // Formato: "Aprobar TaskName" o "Aprobar Rol para TaskName"
    if (approvalTaskName.includes(' para ')) {
      originalTaskName = approvalTaskName.split(' para ')[1];
    } else {
      originalTaskName = approvalTaskName.replace('Aprobar ', '');
    }
  }
  
  if (originalTaskName && rasciManager.rasciMatrixData && rasciManager.rasciMatrixData[originalTaskName]) {
    const originalNextElements = originalFlowMap.get(originalTaskName);
    if (originalNextElements && originalNextElements.length > 0) {
      attemptReconnection(modeler, approvalTask, originalNextElements);
    } else {
    }
  }
}

function handleNormalElementReconnection(modeler, element, elementName) {
  if (!elementName) return;
  
  const originalNextElements = originalFlowMap.get(elementName);
  if (originalNextElements && originalNextElements.length > 0) {
    attemptReconnection(modeler, element, originalNextElements);
  } else {
  }
}

function attemptReconnection(modeler, sourceElement, targetElements) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  for (const originalTargetElement of targetElements) {
    const originalTargetName = getElementName(originalTargetElement);
    const currentTargetElement = elementRegistry.find(element => 
      element.id === originalTargetElement.id || 
      (element.businessObject && element.businessObject.name === originalTargetName)
    );
    
    if (currentTargetElement) {
      // Verificar que no exista ya una conexión hacia este elemento
      const existingConnection = elementRegistry.find(conn => 
        conn.type === 'bpmn:SequenceFlow' && 
        conn.source && conn.source.id === sourceElement.id &&
        conn.target && conn.target.id === currentTargetElement.id
      );
      
      if (!existingConnection) {
        try {
          modeling.connect(sourceElement, currentTargetElement, { type: 'bpmn:SequenceFlow' });
          break; // Solo conectar al primer elemento válido
        } catch (e) {
        }
      } else {
      }
    }
  }
}

function restoreFlowByElementNames(modeler) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  const allElements = elementRegistry.filter(element => 
    ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 
     'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateThrowEvent', 
     'bpmn:IntermediateCatchEvent'].includes(element.type)
  );
  
  allElements.forEach(element => {
    const elementName = getElementName(element);
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === element.id
    );
    
    if (outgoingConnections.length === 0 && !elementName.includes('End')) {
      const potentialTargets = allElements.filter(target => {
        const targetName = getElementName(target);
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === target.id
        );
        
        return target.id !== element.id && 
               !targetName.startsWith('Consultar ') && 
               !targetName.startsWith('Aprobar ') && 
               !targetName.startsWith('Informar ') &&
               incomingConnections.length === 0;
      });
      
      if (potentialTargets.length > 0) {
        const target = potentialTargets[0];
        
        // Verificar que no exista ya una conexión entre estos elementos
        const existingConnection = elementRegistry.find(conn => 
          conn.type === 'bpmn:SequenceFlow' && 
          conn.source && conn.source.id === element.id &&
          conn.target && conn.target.id === target.id
        );
        
        if (!existingConnection) {
          try {
            modeling.connect(element, target, { type: 'bpmn:SequenceFlow' });
          } catch (e) {
            // Handle error silently
          }
        }
      }
    }
  });
}

export {
  findNextTaskInOriginalFlow,
  createSpecialElement,
  createSequentialSpecialElements,
  restoreFlowAfterApprovalRemoval,
  restoreBpmnFlow,
  restoreFlowByElementNames
}; 