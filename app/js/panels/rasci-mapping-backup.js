// RASCI Mapping Consolidated - Clean Version

let originalFlowMap = new Map();
let pendingReconnections = new Map(); // Store reconnection info when approval tasks are deleted

function getElementName(element) {
  if (!element) return 'undefined';
  if (element.businessObject && element.businessObject.name) return element.businessObject.name;
  if (element.name) return element.name;
  if (element.id) return element.id;
  return 'unnamed';
}

function saveOriginalFlow(modeler) {
  const elementRegistry = modeler.get('elementRegistry');
  if (!elementRegistry) return;
  
  if (originalFlowMap.size === 0) {
    const bpmnTasks = elementRegistry.filter(element => 
      ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 
       'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateThrowEvent', 
       'bpmn:IntermediateCatchEvent'].includes(element.type)
    );
    
    bpmnTasks.forEach(task => {
      const taskId = task.id;
      const taskName = getElementName(task);
      const outgoingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === task.id
      );
      
      const nextTasks = outgoingConnections
        .map(conn => conn.target)
        .filter(target => {
          const validTypes = ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 
                             'bpmn:ManualTask', 'bpmn:BusinessRuleTask', 'bpmn:SendTask', 'bpmn:ReceiveTask',
                             'bpmn:CallActivity', 'bpmn:SubProcess', 'bpmn:StartEvent', 'bpmn:EndEvent',
                             'bpmn:IntermediateThrowEvent', 'bpmn:IntermediateCatchEvent'];
          return validTypes.includes(target.type) && getElementName(target);
        });
      
      if (nextTasks.length > 0) {
        originalFlowMap.set(taskId, nextTasks);
        originalFlowMap.set(taskName, nextTasks);
      }
    });
  }
}

function findBpmnTaskByName(modeler, taskName) {
  const elementRegistry = modeler.get('elementRegistry');
  
  const foundTask = elementRegistry.get(taskName);
  if (foundTask && foundTask.type === 'bpmn:Task') return foundTask;
  
  return elementRegistry.find(element => 
    element.type === 'bpmn:Task' && element.businessObject && element.businessObject.name === taskName
  );
}



function createRalphRole(modeler, roleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  const existingRole = elementRegistry.find(element => 
    (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
    element.businessObject && element.businessObject.name === roleName
  );
  
  if (existingRole) return existingRole;
  
  try {
    const rootElement = canvas.getRootElement();
    const position = { x: 100 + (results.rolesCreated * 200), y: 100 };
    
    const role = modeling.createShape(
      { type: 'RALph:RoleRALph' },
      position,
      rootElement
    );

    modeling.updateProperties(role, { name: roleName });
    results.rolesCreated++;
    
    return role;
  } catch (error) {
    return null;
  }
}

function findExistingAndGate(modeler, bpmnTask) {
  const elementRegistry = modeler.get('elementRegistry');
  
  return elementRegistry.find(element => 
    element.type === 'RALph:Complex-Assignment-AND' &&
    elementRegistry.some(conn => 
      conn.type === 'RALph:ResourceArc' &&
      conn.source && conn.source.id === bpmnTask.id &&
      conn.target && conn.target.id === element.id
    )
  );
}

function createAndGate(modeler, bpmnTask, roles, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  const existingAndGate = findExistingAndGate(modeler, bpmnTask);
  if (existingAndGate) {
    roles.forEach(roleName => {
      const role = elementRegistry.find(element => 
        (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
        element.businessObject && element.businessObject.name === roleName
      );
      
      if (role) {
        const isConnected = elementRegistry.some(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          conn.source && conn.source.id === role.id &&
          conn.target && conn.target.id === existingAndGate.id
        );
        
        if (!isConnected) {
          modeling.connect(role, existingAndGate, { type: 'RALph:ResourceArc' });
          results.roleAssignments++;
        }
      }
    });
    
    return existingAndGate;
  }
  
  try {
    const rootElement = canvas.getRootElement();
    const position = { x: bpmnTask.x + 200, y: bpmnTask.y };
    
    const andGate = modeling.createShape(
      { type: 'RALph:Complex-Assignment-AND' },
      position,
      rootElement
    );

    if (!andGate) return null;

    modeling.connect(bpmnTask, andGate, { type: 'RALph:ResourceArc' });

    roles.forEach(roleName => {
      let role = elementRegistry.find(element => 
        (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
        element.businessObject && element.businessObject.name === roleName
      );
      
      if (!role) {
        role = createRalphRole(modeler, roleName, results);
      }
      
      if (role) {
        modeling.connect(role, andGate, { type: 'RALph:ResourceArc' });
        results.roleAssignments++;
      }
    });
    
    return andGate;
  } catch (error) {
    return null;
  }
}

function createSimpleAssignment(modeler, bpmnTask, roleName, results) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  try {
    let role = elementRegistry.find(element => 
      (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
      element.businessObject && element.businessObject.name === roleName
    );
    
    if (!role) {
      role = createRalphRole(modeler, roleName, results);
    }
    
    if (!role) return null;
    
    const existingAssignment = elementRegistry.find(element => 
      (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association') &&
      element.source && element.target &&
      ((element.source.id === bpmnTask.id && element.target.id === role.id) ||
       (element.source.id === role.id && element.target.id === bpmnTask.id))
    );
    
    if (existingAssignment) return existingAssignment;
    
    const assignment = modeling.connect(bpmnTask, role, { type: 'RALph:ResourceArc' });
    results.roleAssignments++;
    
    return assignment;
  } catch (error) {
    return null;
  }
}

function cleanupOrphanedElements(modeler) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  const elementsToRemove = [];
  
  elementRegistry.forEach(element => {
    const elementName = element.businessObject && element.businessObject.name;
    
    if (!elementName) return;
    
    const isSpecialElement = ['Consultar ', 'Aprobar ', 'Informar '].some(prefix => 
      elementName.startsWith(prefix)
    );
    
    if (isSpecialElement) {
      const incomingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
      );
      
      const outgoingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === element.id
      );
      
      if (incomingConnections.length === 0 && outgoingConnections.length === 0) {
        elementsToRemove.push(element);
      }
    }
  });
  
  if (elementsToRemove.length > 0) {
    try {
      modeling.removeElements(elementsToRemove);
    } catch (e) {
      console.error(`Error limpiando elementos huérfanos: ${e.message}`);
    }
  }
}

function restoreFlowAfterApprovalRemoval(modeler) {
  console.log('🔄 Restaurando flujo después de eliminar tarea de aprobación...');
  console.log(`🗂️ Flujo original disponible (${originalFlowMap.size} entradas):`, originalFlowMap);
  
  if (originalFlowMap.size === 0) {
    console.warn('⚠️ El mapa de flujo original está vacío! No se puede restaurar.');
    console.log('🔍 Intentando regenerar el flujo original desde el estado actual...');
    saveOriginalFlow(modeler);
    console.log(`🔍 Después de regenerar: ${originalFlowMap.size} entradas`);
    
    // If still empty after regeneration, try alternative approach
    if (originalFlowMap.size === 0) {
      console.log('🔄 Intentando restauración basada en nombres de elementos...');
      restoreFlowByElementNames(modeler);
      return;
    }
  }
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  // Strategy: Find disconnected elements that should be connected based on original flow
  for (const [sourceTaskId, targets] of originalFlowMap.entries()) {
    console.log(`🔍 Procesando flujo para: ${sourceTaskId} -> ${targets.map(t => getElementName(t)).join(', ')}`);
    
    // Find the source element (by ID first, then by name)
    let sourceElement = elementRegistry.get(sourceTaskId);
    if (!sourceElement) {
      sourceElement = elementRegistry.find(element => getElementName(element) === sourceTaskId);
    }
    
    if (!sourceElement) {
      console.log(`❌ No se encontró elemento fuente: ${sourceTaskId}`);
      continue;
    }
    
    // Check if source has outgoing connections
    const sourceConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === sourceElement.id
    );
    
    console.log(`🔍 Elemento ${getElementName(sourceElement)}: ${sourceConnections.length} conexiones salientes`);
    
    // If no outgoing connections, try to restore them
    if (sourceConnections.length === 0) {
      console.log(`� Restaurando conexiones para: ${getElementName(sourceElement)}`);
      
      for (const originalTarget of targets) {
        console.log(`🔍 Buscando elemento destino: ${getElementName(originalTarget)} (${originalTarget.id})`);
        
        // Find the target element (by ID first, then by name)
        let targetElement = elementRegistry.get(originalTarget.id);
        if (!targetElement) {
          targetElement = elementRegistry.find(element => 
            getElementName(element) === getElementName(originalTarget)
          );
        }
        
        if (targetElement) {
          console.log(`✅ Conectando ${getElementName(sourceElement)} -> ${getElementName(targetElement)}`);
          try {
            modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
            console.log(`🎉 Conexión restaurada exitosamente!`);
            
            break; // Only connect to the first valid target
          } catch (e) {
            console.error(`❌ Error conectando: ${e.message}`);
          }
        } else {
          console.log(`❌ No se encontró el elemento destino: ${getElementName(originalTarget)}`);
        }
      }
    }
  }
  
  console.log('✅ Proceso de restauración de flujo completado');
}

function restoreBpmnFlow(modeler) {
  console.log('🔄 Iniciando restoreBpmnFlow...');
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  const bpmnTasks = elementRegistry.filter(element => 
    ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 
     'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateThrowEvent', 
     'bpmn:IntermediateCatchEvent'].includes(element.type)
  );
  
  console.log(`🔄 Encontradas ${bpmnTasks.length} tareas BPMN:`, bpmnTasks.map(t => getElementName(t)));
  
  bpmnTasks.forEach(task => {
    const taskName = getElementName(task);
    console.log(`🔄 Procesando tarea: ${taskName} (tipo: ${task.type})`);
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === task.id
    );
    
    console.log(`🔄 Conexiones salientes para ${taskName}: ${outgoingConnections.length}`);
    
    if (outgoingConnections.length === 0) {
      console.log(`🔄 Tarea sin conexiones salientes: ${taskName}`);
      // Check if this is an approval task created dynamically
      if (taskName && taskName.startsWith('Aprobar ')) {
        console.log(`🔍 Procesando tarea de aprobación: ${taskName}`);
        // For approval tasks, find the original task that created this approval
        const roleName = taskName.replace('Aprobar ', '');
        console.log(`🔍 Rol extraído: ${roleName}`);
        let originalTaskName = null;
        
        // Look for the original task in the matrix that has this role as 'A'
        if (window.rasciMatrixData) {
          console.log(`🔍 Matriz RASCI disponible:`, Object.keys(window.rasciMatrixData));
          Object.keys(window.rasciMatrixData).forEach(taskKey => {
            const taskRoles = window.rasciMatrixData[taskKey];
            console.log(`🔍 Verificando tarea: ${taskKey}, roles:`, taskRoles);
            if (taskRoles && taskRoles[roleName] === 'A') {
              originalTaskName = taskKey;
              console.log(`✅ Encontrada tarea original: ${originalTaskName} para rol: ${roleName}`);
            }
          });
        }
        
        if (originalTaskName) {
          console.log(`🔍 Buscando flujo original para: ${originalTaskName}`);
          const originalNextTasks = originalFlowMap.get(originalTaskName);
          console.log(`🔍 Tareas siguientes originales:`, originalNextTasks);
          if (originalNextTasks && originalNextTasks.length > 0) {
            for (const originalNextTask of originalNextTasks) {
              const originalNextTaskName = getElementName(originalNextTask);
              console.log(`🔍 Buscando tarea siguiente: ${originalNextTaskName}`);
              const currentNextTask = elementRegistry.find(element => 
                element.id === originalNextTask.id || 
                (element.businessObject && element.businessObject.name === originalNextTaskName)
              );
              
              if (currentNextTask) {
                console.log(`✅ Conectando ${taskName} -> ${originalNextTaskName}`);
                try {
                  modeling.connect(task, currentNextTask, { type: 'bpmn:SequenceFlow' });
                  break;
                } catch (e) {
                  console.error(`❌ Error conectando: ${e.message}`);
                }
              } else {
                console.log(`❌ No se encontró la tarea siguiente: ${originalNextTaskName}`);
              }
            }
          } else {
            console.log(`❌ No hay tareas siguientes para: ${originalTaskName}`);
          }
        } else {
          console.log(`❌ No se encontró tarea original para rol: ${roleName}`);
        }
      } else {
        // Original logic for regular tasks
        const originalNextTasks = originalFlowMap.get(taskName);
        if (originalNextTasks && originalNextTasks.length > 0) {
          for (const originalNextTask of originalNextTasks) {
            const originalNextTaskName = getElementName(originalNextTask);
            const currentNextTask = elementRegistry.find(element => 
              element.id === originalNextTask.id || 
              (element.businessObject && element.businessObject.name === originalNextTaskName)
            );
            
            if (currentNextTask) {
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
  });
}

function findNextTaskInOriginalFlow(modeler, currentTask) {
  const elementRegistry = modeler.get('elementRegistry');
  
  function findNextTaskRecursive(task, visited = new Set()) {
    if (visited.has(task.id)) return null;
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
      
      if (validTypes.includes(targetType)) return target;
      
      if (targetType && targetType.includes('Gateway')) {
        const nextTask = findNextTaskRecursive(target, visited);
        if (nextTask) return nextTask;
      }
    }
    
    return null;
  }
  
  return findNextTaskRecursive(currentTask);

}

function createSequentialSpecialElements(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  const nextRealTask = findNextTaskInOriginalFlow(modeler, bpmnTask);
  if (!nextRealTask) return;
  
  const directConnection = elementRegistry.find(conn => 
    conn.type === 'bpmn:SequenceFlow' &&
    conn.source && conn.source.id === bpmnTask.id &&
    conn.target && conn.target.id === nextRealTask.id
  );
  
  if (directConnection) {
    try {
      modeling.removeConnection(directConnection);
    } catch (e) {
      // Handle error silently
    }
  }
  
  let currentSource = bpmnTask;
  const flowElements = [];
  
  [...consultRoles, ...approveRoles, ...informRoles].forEach((roleName) => {
    let elementType, eventType;
    
    if (consultRoles.includes(roleName)) {
      elementType = 'bpmn:IntermediateThrowEvent';
      eventType = 'Consultar';
    } else if (approveRoles.includes(roleName)) {
      elementType = 'bpmn:UserTask';
      eventType = 'Aprobar';
    } else {
      elementType = 'bpmn:IntermediateThrowEvent';
      eventType = 'Informar';
    }
    
    const element = createSpecialElement(modeler, currentSource, roleName, elementType, eventType, results);
    if (element) {
      flowElements.push(element);
      currentSource = element;
    }
  });
  
  if (flowElements.length > 0) {
    try {
      modeling.connect(currentSource, nextRealTask, { type: 'bpmn:SequenceFlow' });
    } catch (e) {
      // Handle error silently
    }
  } else {
    try {
      modeling.connect(bpmnTask, nextRealTask, { type: 'bpmn:SequenceFlow' });
    } catch (e) {
      // Handle error silently
    }
  }
}

function createSpecialElement(modeler, sourceElement, roleName, elementType, eventType, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  // Create proper label format: "Consultar RolX", "Informar RolX", "Aprobar RolX" 
  let elementName;
  if (eventType === 'Consultar') {
    elementName = `Consultar ${roleName}`;
  } else if (eventType === 'Informar') {
    elementName = `Informar ${roleName}`;
  } else if (eventType === 'Aprobar') {
    elementName = `Aprobar ${roleName}`;
  } else {
    elementName = `${eventType} ${roleName}`;
  }
  
  console.log(`🏗️ Creando elemento especial: ${elementName} (${elementType})`);
  
  const existingElement = elementRegistry.find(element => 
    element.type === elementType && 
    element.businessObject && element.businessObject.name === elementName
  );
  
  if (existingElement) {
    console.log(`♻️ Elemento existente encontrado: ${elementName}`);
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
  
  try {
    const rootElement = canvas.getRootElement();
    const position = { x: sourceElement.x + 150, y: sourceElement.y };
    
    // Create the element with proper businessObject
    const elementData = { type: elementType };
    const element = modeling.createShape(elementData, position, rootElement);
    
    if (!element) {
      console.error(`❌ No se pudo crear el elemento de tipo: ${elementType}`);
      return null;
    }
    
    console.log(`🏷️ Asignando label: ${elementName}`);
    
    // Wait a bit for the element to be fully created
    setTimeout(() => {
      try {
        // For intermediate events, set up proper event definitions
        if (elementType === 'bpmn:IntermediateThrowEvent') {
          const moddle = modeler.get('moddle');
          if (!element.businessObject.eventDefinitions) {
            const messageEventDefinition = moddle.create('bpmn:MessageEventDefinition');
            element.businessObject.eventDefinitions = [messageEventDefinition];
          }
        }
        
        // Multiple attempts to set the name
        if (element.businessObject) {
          modeling.updateProperties(element, { name: elementName });
          console.log(`✅ Label asignado con updateProperties: ${elementName}`);
        } else if (element.businessObject === undefined) {
          // Force create businessObject if it doesn't exist
          const moddle = modeler.get('moddle');
          element.businessObject = moddle.create(elementType, { name: elementName });
          console.log(`✅ Label asignado creando businessObject: ${elementName}`);
        }
        
        // Additional fallback - direct assignment
        if (element.businessObject && !element.businessObject.name) {
          element.businessObject.name = elementName;
          console.log(`✅ Label asignado directamente: ${elementName}`);
        }
        
        // Verify the label was set
        if (element.businessObject && element.businessObject.name === elementName) {
          console.log(`🎉 Verificación exitosa - Label visible: ${elementName}`);
        } else {
          console.error(`❌ Fallo en verificación - Label no asignado correctamente`);
        }
        
        // Force canvas refresh to show the label
        const canvas = modeler.get('canvas');
        if (canvas && typeof canvas.zoom === 'function') {
          const currentZoom = canvas.zoom();
          canvas.zoom(currentZoom, 'auto');
        }
        
      } catch (labelError) {
        console.error(`❌ Error asignando label: ${labelError.message}`);
      }
    }, 50);
    
    try {
      modeling.connect(sourceElement, element, { type: 'bpmn:SequenceFlow' });
    } catch (e) {
      console.warn(`⚠️ Error conectando elementos: ${e.message}`);
    }
    
    if (eventType === 'Aprobar') results.approvalTasks++;
    else if (eventType === 'Consultar') results.messageFlows++;
    else results.infoEvents++;
    
    console.log(`✅ Elemento especial creado: ${elementName}`);
    return element;
  } catch (error) {
    console.error(`❌ Error creando elemento especial: ${error.message}`);
    return null;
  }
}

function handleRolesAndAssignments(modeler, matrix, results) {
  const elementRegistry = modeler.get('elementRegistry');
  
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    
    if (!bpmnTask) return;
    
    const responsibleRoles = [];
    const supportRoles = [];
    const approveRoles = [];
    
    Object.keys(taskRoles).forEach(roleKey => {
      const responsibility = taskRoles[roleKey];
      
      switch (responsibility) {
        case 'R':
          responsibleRoles.push(roleKey);
          break;
        case 'S':
          supportRoles.push(roleKey);
          break;
        case 'A':
          approveRoles.push(roleKey);
          break;
      }
    });
    
    if (responsibleRoles.length === 0 && supportRoles.length === 0) {
      // No R or S roles to process
    } else if (responsibleRoles.length === 1 && supportRoles.length === 0) {
      const roleName = responsibleRoles[0];
      const existingAndGate = findExistingAndGate(modeler, bpmnTask);
      
      if (existingAndGate) {
        const modeling = modeler.get('modeling');
        try {
          modeling.removeElements([existingAndGate]);
          createSimpleAssignment(modeler, bpmnTask, roleName, results);
        } catch (error) {
          // Handle error silently
        }
      } else {
        createRalphRole(modeler, roleName, results);
        createSimpleAssignment(modeler, bpmnTask, roleName, results);
      }
    } else {
      const allRoles = [...responsibleRoles, ...supportRoles];
      const existingAndGate = findExistingAndGate(modeler, bpmnTask);
      
      if (existingAndGate) {
        allRoles.forEach(roleName => {
          createRalphRole(modeler, roleName, results);
        });
      } else {
        if (responsibleRoles.length === 1) {
          const responsibleRole = responsibleRoles[0];
          const isConnected = elementRegistry.some(conn => 
            (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
            conn.source && conn.source.id === bpmnTask.id &&
            conn.target && conn.target.businessObject && conn.target.businessObject.name === responsibleRole
          );
          
          if (isConnected) {
            const modeling = modeler.get('modeling');
            const connection = elementRegistry.find(conn => 
              (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
              conn.source && conn.source.id === bpmnTask.id &&
              conn.target && conn.target.businessObject && conn.target.businessObject.name === responsibleRole
            );
            if (connection) {
              modeling.removeElements([connection]);
            }
          }
        }
        
        allRoles.forEach(roleName => {
          createRalphRole(modeler, roleName, results);
        });
        
        createAndGate(modeler, bpmnTask, allRoles, results);
      }
    }
    
    if (approveRoles.length > 0) {
      for (const roleName of approveRoles) {
        createRalphRole(modeler, roleName, results);
        
        const approvalTaskName = `Aprobar ${roleName}`;
        const approvalTask = elementRegistry.find(element => 
          element.type === 'bpmn:UserTask' && 
          element.businessObject && element.businessObject.name === approvalTaskName
        );
        
        if (approvalTask) {
          createSimpleAssignment(modeler, approvalTask, roleName, results);
        }
      }
    }
  });
}

export function executeSimpleRasciMapping(modeler, matrix) {
  if (!modeler) return { error: 'Modeler no disponible' };
  
  const elementRegistry = modeler.get('elementRegistry');
  if (!elementRegistry) return { error: 'elementRegistry no disponible' };
  
  // Only clear if we're starting fresh (no existing special elements)
  const hasSpecialElements = elementRegistry.filter(element => {
    const name = getElementName(element);
    return name && (['Consultar ', 'Aprobar ', 'Informar '].some(prefix => name.startsWith(prefix)));
  }).length > 0;
  
  if (!hasSpecialElements) {
    console.log('🔄 Iniciando mapeo RASCI - primer mapeo, guardando flujo original');
    originalFlowMap.clear();
    saveOriginalFlow(modeler);
  } else {
    console.log('🔄 Remapeando RASCI - conservando flujo original existente');
    console.log(`🗂️ Flujo original conservado (${originalFlowMap.size} entradas)`);
  }
  
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: 0
  };
  
  const taskMappings = {};
  Object.keys(matrix).forEach(taskName => {
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    if (bpmnTask) {
      taskMappings[taskName] = bpmnTask;
    }
  });
  
  // Phase 1: Create sequential elements
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    const bpmnTask = taskMappings[taskName];
    
    if (!bpmnTask) return;
    
    const consultRoles = [];
    const approveRoles = [];
    const informRoles = [];
    
    Object.keys(taskRoles).forEach(roleKey => {
      const responsibility = taskRoles[roleKey];
      
      switch (responsibility) {
        case 'C':
          consultRoles.push(roleKey);
          break;
        case 'A':
          approveRoles.push(roleKey);
          break;
        case 'I':
          informRoles.push(roleKey);
          break;
      }
    });
    
    if (consultRoles.length > 0 || approveRoles.length > 0 || informRoles.length > 0) {
      createSequentialSpecialElements(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results);
    }
  });
  
  // Re-save original flow after creating special elements
  console.log('🔄 Volviendo a guardar flujo original después de crear elementos especiales...');
  saveOriginalFlow(modeler);
  
  // Phase 2: Handle roles and assignments
  handleRolesAndAssignments(modeler, matrix, results);
  
  // Cleanup
  cleanupOrphanedElements(modeler);
  restoreBpmnFlow(modeler);
  
  // Fix any missing labels after all elements are created
  setTimeout(() => {
    fixMissingLabels(modeler);
  }, 200);
  
  try {
    localStorage.setItem('previousRasciMatrixData', JSON.stringify(matrix));
  } catch (error) {
    // Handle error silently
  }
  
  // Ensure event listener is set up after mapping
  setTimeout(() => {
    setupElementDeletionListener();
  }, 500);
  
  return results;
}

function fixMissingLabels(modeler) {
  console.log('🔧 Verificando y corrigiendo etiquetas faltantes...');
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  // Find special elements that might be missing labels
  const specialElements = elementRegistry.filter(element => {
    return (element.type === 'bpmn:IntermediateThrowEvent' || 
            element.type === 'bpmn:UserTask') &&
           (!element.businessObject || !element.businessObject.name ||
            element.businessObject.name === '' || 
            element.businessObject.name === 'undefined');
  });
  
  console.log(`🔧 Encontrados ${specialElements.length} elementos sin etiqueta`);
  
  specialElements.forEach(element => {
    // Try to determine what the label should be based on context
    const incomingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
    );
    
    if (incomingConnections.length > 0) {
      const sourceElement = incomingConnections[0].source;
      const sourceName = getElementName(sourceElement);
      
      console.log(`🔧 Elemento sin etiqueta encontrado después de: ${sourceName}`);
      
      // Try to extract role name from RASCI matrix or context
      if (window.rasciMatrixData) {
        Object.keys(window.rasciMatrixData).forEach(taskName => {
          if (sourceName.includes(taskName) || taskName.includes(sourceName)) {
            const taskRoles = window.rasciMatrixData[taskName];
            Object.keys(taskRoles).forEach(roleName => {
              const responsibility = taskRoles[roleName];
              let labelName = '';
              
              if (element.type === 'bpmn:UserTask' && responsibility === 'A') {
                labelName = `Aprobar ${roleName}`;
              } else if (element.type === 'bpmn:IntermediateThrowEvent' && responsibility === 'C') {
                labelName = `Consultar ${roleName}`;
              } else if (element.type === 'bpmn:IntermediateThrowEvent' && responsibility === 'I') {
                labelName = `Informar ${roleName}`;
              }
              
              if (labelName) {
                console.log(`🔧 Asignando etiqueta corregida: ${labelName}`);
                try {
                  // Multiple methods to ensure the label sticks
                  modeling.updateProperties(element, { name: labelName });
                  
                  if (element.businessObject) {
                    element.businessObject.name = labelName;
                  }
                  
                  console.log(`✅ Etiqueta corregida: ${labelName}`);
                } catch (e) {
                  console.error(`❌ Error asignando etiqueta corregida: ${e.message}`);
                }
              }
            });
          }
        });
      }
    }
  });
  
  // Force canvas refresh to show updated labels
  try {
    const canvas = modeler.get('canvas');
    if (canvas && typeof canvas.zoom === 'function') {
      const currentZoom = canvas.zoom();
      canvas.zoom(currentZoom, 'auto');
    }
  } catch (refreshError) {
    console.warn('Error refrescando canvas:', refreshError.message);
  }
}

window.executeRasciToRalphMapping = function() {
  if (!window.bpmnModeler) {
    console.warn('⚠️ BPMN Modeler no disponible. Asegúrate de tener un diagrama BPMN abierto.');
    return;
  }

  if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
    console.warn('⚠️ No hay datos en la matriz RASCI para mapear. Primero agrega algunos roles en la matriz.');
    return;
  }
  
  try {
    executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
  } catch (error) {
    console.error(`❌ Error en el mapeo: ${error.message}`);
  }
};

export function initRasciMapping() {
  console.log('🚀 Inicializando RASCI mapping...');
  setTimeout(() => {
    const mappingButtons = document.querySelectorAll('[onclick*="executeRasciToRalphMapping"]');
    console.log(`🔍 Botones de mapeo encontrados: ${mappingButtons.length}`);
    
    mappingButtons.forEach(button => {
      button.removeAttribute('onclick');
      button.addEventListener('click', (e) => {
        e.preventDefault();
        window.executeRasciToRalphMapping();
      });
    });

    // Set up element deletion listener
    setupElementDeletionListener();
  }, 1000);
}

function setupElementDeletionListener() {
  if (window.bpmnModeler && !window.rasciEventListenerConfigured) {
    console.log('✅ Configurando event listener para eliminación de elementos...');
    
    const eventBus = window.bpmnModeler.get('eventBus');
    const elementRegistry = window.bpmnModeler.get('elementRegistry');
    
    // Listen for BEFORE deletion to capture connection info
    eventBus.on('commandStack.shape.delete.preExecute', (event) => {
      const elementToDelete = event.context.shape;
      if (!elementToDelete) return;
      
      const elementName = getElementName(elementToDelete);
      console.log(`🔍 [preExecute] Preparando eliminación: ${elementName}`);
      
      // If it's an approval task, store reconnection info
      if (elementName && elementName.startsWith('Aprobar ') && elementToDelete.type === 'bpmn:UserTask') {
        console.log(`📝 Guardando información de reconexión para: ${elementName}`);
        
        // Find incoming connections
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === elementToDelete.id
        );
        
        // Find outgoing connections  
        const outgoingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === elementToDelete.id
        );
        
        console.log(`📝 Conexiones entrantes: ${incomingConnections.length}, salientes: ${outgoingConnections.length}`);
        
        // Store reconnection info
        if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
          const sourceElement = incomingConnections[0].source;
          const targetElement = outgoingConnections[0].target;
          
          pendingReconnections.set(elementToDelete.id, {
            source: {
              id: sourceElement.id,
              name: getElementName(sourceElement)
            },
            target: {
              id: targetElement.id, 
              name: getElementName(targetElement)
            },
            approvalTaskName: elementName
          });
          
          console.log(`📝 Reconexión pendiente: ${getElementName(sourceElement)} -> ${getElementName(targetElement)}`);
        }
      }
    });
    
    // Listen for multiple deletion events to catch all scenarios
    const deletionEvents = ['element.removed', 'elements.deleted', 'shape.removed'];
    
    deletionEvents.forEach(eventName => {
      eventBus.on(eventName, (event) => {
        const removedElement = event.element || (event.elements && event.elements[0]);
        if (!removedElement) return;
        
        const elementName = getElementName(removedElement);
        console.log(`🗑️ [${eventName}] Elemento eliminado: ${elementName} (tipo: ${removedElement.type})`);
        
        // Check if it was an approval task and we have reconnection info
        if (elementName && elementName.startsWith('Aprobar ') && removedElement.type === 'bpmn:UserTask') {
          console.log(`🔄 Tarea de aprobación eliminada, restaurando flujo...`);
          setTimeout(() => {
            executeSmartReconnection(window.bpmnModeler, removedElement.id);
          }, 100);
        }
      });
    });
    
    window.rasciEventListenerConfigured = true;
    console.log('✅ Event listeners configurados para eliminación de elementos');
  } else if (!window.bpmnModeler) {
    console.warn('⚠️ BPMN Modeler no disponible para configurar event listener');
  } else {
    console.log('ℹ️ Event listener ya configurado previamente');
  }
}

function executeSmartReconnection(modeler, deletedElementId) {
  console.log(`🔄 Ejecutando reconexión inteligente para elemento eliminado: ${deletedElementId}`);
  
  const reconnectionInfo = pendingReconnections.get(deletedElementId);
  if (!reconnectionInfo) {
    console.log('❌ No hay información de reconexión disponible, usando método alternativo...');
    restoreFlowAfterApprovalRemoval(modeler);
    return;
  }
  
  console.log(`✅ Información de reconexión encontrada:`, reconnectionInfo);
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  // Find source and target elements
  let sourceElement = elementRegistry.get(reconnectionInfo.source.id);
  if (!sourceElement) {
    sourceElement = elementRegistry.find(element => 
      getElementName(element) === reconnectionInfo.source.name
    );
  }
  
  let targetElement = elementRegistry.get(reconnectionInfo.target.id);
  if (!targetElement) {
    targetElement = elementRegistry.find(element => 
      getElementName(element) === reconnectionInfo.target.name
    );
  }
  
  if (sourceElement && targetElement) {
    console.log(`🔗 Reconectando: ${getElementName(sourceElement)} -> ${getElementName(targetElement)}`);
    
    try {
      modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
      console.log(`🎉 Reconexión exitosa!`);
      
      // Remove associated RALph role for the deleted approval task
      removeAssociatedRole(modeler, reconnectionInfo.approvalTaskName);
      
      // Clean up the pending reconnection
      pendingReconnections.delete(deletedElementId);
    } catch (e) {
      console.error(`❌ Error en reconexión: ${e.message}`);
      // Fallback to original method
      restoreFlowAfterApprovalRemoval(modeler);
    }
  } else {
    console.error(`❌ No se encontraron elementos para reconectar`);
    console.log(`🔍 Source encontrado: ${!!sourceElement}, Target encontrado: ${!!targetElement}`);
    // Fallback to original method
    restoreFlowAfterApprovalRemoval(modeler);
  }
}

function removeAssociatedRole(modeler, approvalTaskName) {
  console.log(`🗑️ Eliminando rol asociado a la tarea: ${approvalTaskName}`);
  
  // Extract role name from approval task name
  const roleName = approvalTaskName.replace('Aprobar ', '');
  console.log(`🔍 Buscando rol para eliminar: ${roleName}`);
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  // Find the RALph role
  const roleElement = elementRegistry.find(element => 
    (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
    element.businessObject && element.businessObject.name === roleName
  );
  
  if (roleElement) {
    console.log(`✅ Rol encontrado: ${getElementName(roleElement)}`);
    
    // Check if this role is used by other tasks
    const isRoleUsedElsewhere = elementRegistry.some(conn => 
      (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
      ((conn.source && conn.source.id === roleElement.id) || 
       (conn.target && conn.target.id === roleElement.id)) &&
      conn.source && conn.target &&
      (conn.source.type === 'bpmn:Task' || conn.target.type === 'bpmn:Task' ||
       conn.source.type === 'bpmn:UserTask' || conn.target.type === 'bpmn:UserTask') &&
      !getElementName(conn.source).startsWith('Aprobar ') &&
      !getElementName(conn.target).startsWith('Aprobar ')
    );
    
    if (!isRoleUsedElsewhere) {
      console.log(`🗑️ Eliminando rol sin usar: ${roleName}`);
      try {
        // Find and remove all connections to this role first
        const roleConnections = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          ((conn.source && conn.source.id === roleElement.id) || 
           (conn.target && conn.target.id === roleElement.id))
        );
        
        if (roleConnections.length > 0) {
          modeling.removeElements(roleConnections);
          console.log(`🗑️ Eliminadas ${roleConnections.length} conexiones del rol`);
        }
        
        // Remove the role element
        modeling.removeElements([roleElement]);
        console.log(`✅ Rol eliminado exitosamente: ${roleName}`);
      } catch (e) {
        console.error(`❌ Error eliminando rol: ${e.message}`);
      }
    } else {
      console.log(`ℹ️ Rol ${roleName} se mantiene porque está siendo usado por otras tareas`);
    }
  } else {
    console.log(`❌ No se encontró el rol: ${roleName}`);
  }
}

function restoreFlowByElementNames(modeler) {
  console.log('🔄 Restauración alternativa por nombres de elementos...');
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  // Find all elements that might need connections
  const allElements = elementRegistry.filter(element => 
    ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 
     'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateThrowEvent', 
     'bpmn:IntermediateCatchEvent'].includes(element.type)
  );
  
  console.log(`🔍 Elementos encontrados para reconexión: ${allElements.length}`);
  
  // Look for disconnected elements
  allElements.forEach(element => {
    const elementName = getElementName(element);
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === element.id
    );
    
    if (outgoingConnections.length === 0 && !elementName.includes('End')) {
      console.log(`🔍 Elemento desconectado encontrado: ${elementName}`);
      
      // Try to find a logical next element
      const potentialTargets = allElements.filter(target => {
        const targetName = getElementName(target);
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === target.id
        );
        
        return target.id !== element.id && 
               !targetName.startsWith('Consultar ') && 
               !targetName.startsWith('Aprobar ') && 
               !targetName.startsWith('Informar ') &&
               incomingConnections.length === 0; // Target should also be disconnected
      });
      
      if (potentialTargets.length > 0) {
        // Connect to the first suitable target
        const target = potentialTargets[0];
        console.log(`🔄 Conectando ${elementName} -> ${getElementName(target)}`);
        try {
          modeling.connect(element, target, { type: 'bpmn:SequenceFlow' });
          console.log(`✅ Conexión restaurada por nombre!`);
        } catch (e) {
          console.error(`❌ Error conectando por nombre: ${e.message}`);
        }
      }
    }
  });
}




