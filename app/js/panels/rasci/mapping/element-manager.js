// RASCI Mapping Elements - Clean Version
// Special element creation and flow restoration functionality

import { getElementName, originalFlowMap, saveOriginalFlow } from './core-functions.js';

function findNextTaskInOriginalFlow(modeler, currentTask) {
  const elementRegistry = modeler.get('elementRegistry');
  
  function findNextTaskRecursive(task, visited = new Set()) {
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
      
      if (targetName && ['Aprobar ', 'Consultar ', 'Informar '].some(prefix => targetName.startsWith(prefix))) {
        const nextTask = findNextTaskRecursive(target, visited);
        if (nextTask) return nextTask;
        continue;
      }
      
      const validTypes = ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 
                         'bpmn:ManualTask', 'bpmn:BusinessRuleTask', 'bpmn:SendTask', 'bpmn:ReceiveTask',
                         'bpmn:CallActivity', 'bpmn:SubProcess'];
      
      if (validTypes.includes(targetType)) {
        return target;
      }
      
      if (targetType && targetType.includes('Gateway')) {
        const nextTask = findNextTaskRecursive(target, visited);
        if (nextTask) return nextTask;
      }
    }
    
    return null;
  }
  
  return findNextTaskRecursive(currentTask);
}

function createSpecialElement(modeler, sourceElement, roleName, elementType, eventType, results, sourceTaskName = null) {
  console.log(`🔨 Creando elemento especial: ${eventType} ${roleName}${sourceTaskName ? ` para ${sourceTaskName}` : ''}`);
  
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
  
  console.log(`📝 Nombre del elemento: ${elementName}`);
  
  // Para tareas de aprobación con nombre específico, siempre crear nuevos elementos
  // Para otros tipos o tareas genéricas, verificar si existe uno reutilizable
  if (eventType !== 'Aprobar') {
    const existingElement = elementRegistry.find(element => 
      element.type === elementType && 
      element.businessObject && element.businessObject.name === elementName
    );
    
    if (existingElement) {
      console.log(`♻️ Reutilizando elemento existente: ${elementName}`);
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
    
    let position = { x: sourceElement.x + 150, y: sourceElement.y };
    
    let attempts = 0;
    const maxAttempts = 10;
    const elementWidth = 120;
    const elementHeight = 80;
    const margin = 50;
    
    while (attempts < maxAttempts) {
      const isOccupied = existingSpecialElements.some(element => {
        const distance = Math.sqrt(
          Math.pow(element.x - position.x, 2) + Math.pow(element.y - position.y, 2)
        );
        return distance < (elementWidth + margin);
      });
      
      if (!isOccupied) break;
      
      if (attempts % 2 === 0) {
        position.x += elementWidth + margin;
      } else {
        position.y += elementHeight + margin;
        position.x = sourceElement.x + 150;
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
    
    console.log(`✅ Elemento creado exitosamente: ${elementName}, ID: ${element.id}`);
    return element;
  } catch (error) {
    console.error(`❌ Error creando elemento ${elementName}:`, error);
    return null;
  }
}

function createSequentialSpecialElements(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results) {
  console.log(`🚀 Iniciando createSequentialSpecialElements para tarea: ${getElementName(bpmnTask)}`);
  console.log(`Roles: C=${consultRoles}, A=${approveRoles}, I=${informRoles}`);
  
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
    console.log(`⚠️ Ya existen elementos especiales para ${taskName}, saltando creación`);
    return;
  }
  
  const nextRealTask = findNextTaskInOriginalFlow(modeler, bpmnTask);
  console.log(`🎯 Próxima tarea encontrada:`, nextRealTask ? getElementName(nextRealTask) : 'NINGUNA');
  
  // Eliminar conexión directa existente
  const directConnection = elementRegistry.find(conn => 
    conn.type === 'bpmn:SequenceFlow' &&
    conn.source && conn.source.id === bpmnTask.id &&
    conn.target && conn.target && 
    (nextRealTask ? conn.target.id === nextRealTask.id : ['bpmn:EndEvent', 'bpmn:TerminateEndEvent'].includes(conn.target.type))
  );
  
  if (directConnection) {
    console.log(`🔌 Removiendo conexión directa existente`);
    try {
      modeling.removeConnection(directConnection);
    } catch (e) {
      console.error(`❌ Error removiendo conexión:`, e);
    }
  }
  
  let currentSource = bpmnTask;
  const flowElements = [];
  
  // 📝 CREAR ELEMENTOS EN ORDEN: Consultar -> Aprobar -> Informar
  
  // 1. Elementos de Consulta (uno por rol)
  consultRoles.forEach(roleName => {
    const element = createSpecialElement(modeler, currentSource, roleName, 'bpmn:IntermediateThrowEvent', 'Consultar', results, taskName);
    if (element) {
      console.log(`🔗 Consulta: ${getElementName(currentSource)} -> ${getElementName(element)}`);
      flowElements.push(element);
      currentSource = element;
    }
  });
  
  // 2. UN SOLO elemento de Aprobación para la tarea (independientemente del número de roles)
  if (approveRoles.length > 0) {
    const element = createSpecialElement(modeler, currentSource, approveRoles[0], 'bpmn:UserTask', 'Aprobar', results, taskName);
    if (element) {
      console.log(`🔗 Aprobación: ${getElementName(currentSource)} -> ${getElementName(element)}`);
      flowElements.push(element);
      currentSource = element;
      results.approvalTasks++;
    }
  }
  
  // 3. Elementos de Información (uno por rol)
  informRoles.forEach(roleName => {
    const element = createSpecialElement(modeler, currentSource, roleName, 'bpmn:IntermediateThrowEvent', 'Informar', results, taskName);
    if (element) {
      console.log(`🔗 Información: ${getElementName(currentSource)} -> ${getElementName(element)}`);
      flowElements.push(element);
      currentSource = element;
    }
  });
  
  // 4. Conectar al siguiente elemento o EndEvent
  if (!nextRealTask) {
    console.log(`⚠️ No se encontró próxima tarea, buscando EndEvent...`);
    const allElements = elementRegistry.filter(element => 
      ['bpmn:EndEvent', 'bpmn:TerminateEndEvent'].includes(element.type)
    );
    
    if (allElements.length > 0) {
      const endEvent = allElements[0];
      console.log(`🏁 Conectando último elemento ${getElementName(currentSource)} -> EndEvent`);
      try {
        modeling.connect(currentSource, endEvent, { type: 'bpmn:SequenceFlow' });
        console.log(`✅ Conexión a EndEvent exitosa`);
      } catch (e) {
        console.error(`❌ Error conectando a EndEvent:`, e);
      }
    }
  } else {
    console.log(`🔄 Conectando último elemento ${getElementName(currentSource)} -> ${getElementName(nextRealTask)}`);
    try {
      modeling.connect(currentSource, nextRealTask, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Flujo restaurado correctamente`);
    } catch (e) {
      console.error(`❌ Error restaurando flujo:`, e);
    }
  }
  
  console.log(`🏁 createSequentialSpecialElements completado para ${taskName}`);
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
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  const bpmnTasks = elementRegistry.filter(element => 
    ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 
     'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateThrowEvent', 
     'bpmn:IntermediateCatchEvent'].includes(element.type)
  );
  
  bpmnTasks.forEach(task => {
    const taskName = getElementName(task);
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === task.id
    );
    
    if (outgoingConnections.length === 0) {
      if (taskName && taskName.startsWith('Aprobar ')) {
        // Para tareas de aprobación, buscar la tarea original y conectar a su siguiente tarea
        const roleName = taskName.replace('Aprobar ', '');
        let originalTaskName = null;
        
        if (window.rasciMatrixData) {
          Object.keys(window.rasciMatrixData).forEach(taskKey => {
            const taskRoles = window.rasciMatrixData[taskKey];
            if (taskRoles && taskRoles[roleName] === 'A') {
              originalTaskName = taskKey;
            }
          });
        }
        
        if (originalTaskName) {
          const originalNextTasks = originalFlowMap.get(originalTaskName);
          if (originalNextTasks && originalNextTasks.length > 0) {
            for (const originalNextTask of originalNextTasks) {
              const originalNextTaskName = getElementName(originalNextTask);
              const currentNextTask = elementRegistry.find(element => 
                element.id === originalNextTask.id || 
                (element.businessObject && element.businessObject.name === originalNextTaskName)
              );
              
              if (currentNextTask) {
                // Verificar que no exista ya una conexión a esta tarea
                const existingConnection = elementRegistry.find(conn => 
                  conn.type === 'bpmn:SequenceFlow' && 
                  conn.target && conn.target.id === currentNextTask.id
                );
                
                if (!existingConnection) {
                  try {
                    modeling.connect(task, currentNextTask, { type: 'bpmn:SequenceFlow' });
                    break;
                  } catch (e) {
                    // Handle error silently
                  }
                }
              }
            }
          }
        }
      } else if (!taskName.startsWith('Consultar ') && !taskName.startsWith('Informar ')) {
        // Solo reconectar tareas normales (no especiales)
        const originalNextTasks = originalFlowMap.get(taskName);
        if (originalNextTasks && originalNextTasks.length > 0) {
          for (const originalNextTask of originalNextTasks) {
            const originalNextTaskName = getElementName(originalNextTask);
            const currentNextTask = elementRegistry.find(element => 
              element.id === originalNextTask.id || 
              (element.businessObject && element.businessObject.name === originalNextTaskName)
            );
            
            if (currentNextTask) {
              // Verificar que no exista ya una conexión a esta tarea
              const existingConnection = elementRegistry.find(conn => 
                conn.type === 'bpmn:SequenceFlow' && 
                conn.target && conn.target.id === currentNextTask.id
              );
              
              if (!existingConnection) {
                try {
                  modeling.connect(task, currentNextTask, { type: 'bpmn:SequenceFlow' });
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
  });
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