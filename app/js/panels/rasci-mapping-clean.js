// RASCI Mapping - Clean Version

let originalFlowMap = new Map();
let pendingReconnections = new Map();

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
          try {
            modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
            break;
          } catch (e) {
            console.error(`Error conectando: ${e.message}`);
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
                try {
                  modeling.connect(task, currentNextTask, { type: 'bpmn:SequenceFlow' });
                  break;
                } catch (e) {
                  console.error(`Error conectando: ${e.message}`);
                }
              }
            }
          }
        }
      } else {
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
  
  try {
    const rootElement = canvas.getRootElement();
    const position = { x: sourceElement.x + 150, y: sourceElement.y };
    
    const elementData = { type: elementType };
    const element = modeling.createShape(elementData, position, rootElement);
    
    if (!element) {
      console.error(`No se pudo crear el elemento de tipo: ${elementType}`);
      return null;
    }
    
    setTimeout(() => {
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
        } else if (element.businessObject === undefined) {
          const moddle = modeler.get('moddle');
          element.businessObject = moddle.create(elementType, { name: elementName });
        }
        
        if (element.businessObject && !element.businessObject.name) {
          element.businessObject.name = elementName;
        }
        
        const canvas = modeler.get('canvas');
        if (canvas && typeof canvas.zoom === 'function') {
          const currentZoom = canvas.zoom();
          canvas.zoom(currentZoom, 'auto');
        }
        
      } catch (labelError) {
        console.error(`Error asignando label: ${labelError.message}`);
      }
    }, 50);
    
    try {
      modeling.connect(sourceElement, element, { type: 'bpmn:SequenceFlow' });
    } catch (e) {
      console.error(`Error conectando elementos: ${e.message}`);
    }
    
    if (eventType === 'Aprobar') results.approvalTasks++;
    else if (eventType === 'Consultar') results.messageFlows++;
    else results.infoEvents++;
    
    return element;
  } catch (error) {
    console.error(`Error creando elemento especial: ${error.message}`);
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
  
  const hasSpecialElements = elementRegistry.filter(element => {
    const name = getElementName(element);
    return name && (['Consultar ', 'Aprobar ', 'Informar '].some(prefix => name.startsWith(prefix)));
  }).length > 0;
  
  if (!hasSpecialElements) {
    originalFlowMap.clear();
    saveOriginalFlow(modeler);
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
  
  saveOriginalFlow(modeler);
  handleRolesAndAssignments(modeler, matrix, results);
  cleanupOrphanedElements(modeler);
  restoreBpmnFlow(modeler);
  
  setTimeout(() => {
    fixMissingLabels(modeler);
  }, 200);
  
  try {
    localStorage.setItem('previousRasciMatrixData', JSON.stringify(matrix));
  } catch (error) {
    // Handle error silently
  }
  
  setTimeout(() => {
    setupElementDeletionListener();
  }, 500);
  
  return results;
}

function fixMissingLabels(modeler) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  const specialElements = elementRegistry.filter(element => {
    return (element.type === 'bpmn:IntermediateThrowEvent' || 
            element.type === 'bpmn:UserTask') &&
           (!element.businessObject || !element.businessObject.name ||
            element.businessObject.name === '' || 
            element.businessObject.name === 'undefined');
  });
  
  specialElements.forEach(element => {
    const incomingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
    );
    
    if (incomingConnections.length > 0) {
      const sourceElement = incomingConnections[0].source;
      const sourceName = getElementName(sourceElement);
      
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
                try {
                  modeling.updateProperties(element, { name: labelName });
                  
                  if (element.businessObject) {
                    element.businessObject.name = labelName;
                  }
                } catch (e) {
                  console.error(`Error asignando etiqueta corregida: ${e.message}`);
                }
              }
            });
          }
        });
      }
    }
  });
  
  try {
    const canvas = modeler.get('canvas');
    if (canvas && typeof canvas.zoom === 'function') {
      const currentZoom = canvas.zoom();
      canvas.zoom(currentZoom, 'auto');
    }
  } catch (refreshError) {
    console.error('Error refrescando canvas:', refreshError.message);
  }
}

window.executeRasciToRalphMapping = function() {
  if (!window.bpmnModeler) {
    console.error('BPMN Modeler no disponible. Asegúrate de tener un diagrama BPMN abierto.');
    return;
  }

  if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
    console.error('No hay datos en la matriz RASCI para mapear. Primero agrega algunos roles en la matriz.');
    return;
  }
  
  try {
    executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
  } catch (error) {
    console.error(`Error en el mapeo: ${error.message}`);
  }
};

export function initRasciMapping() {
  setTimeout(() => {
    const mappingButtons = document.querySelectorAll('[onclick*="executeRasciToRalphMapping"]');
    
    mappingButtons.forEach(button => {
      button.removeAttribute('onclick');
      button.addEventListener('click', (e) => {
        e.preventDefault();
        window.executeRasciToRalphMapping();
      });
    });

    setupElementDeletionListener();
  }, 1000);
}

function setupElementDeletionListener() {
  if (window.bpmnModeler && !window.rasciEventListenerConfigured) {
    const eventBus = window.bpmnModeler.get('eventBus');
    const elementRegistry = window.bpmnModeler.get('elementRegistry');
    
    eventBus.on('commandStack.shape.delete.preExecute', (event) => {
      const elementToDelete = event.context.shape;
      if (!elementToDelete) return;
      
      const elementName = getElementName(elementToDelete);
      
      if (elementName && elementName.startsWith('Aprobar ') && elementToDelete.type === 'bpmn:UserTask') {
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === elementToDelete.id
        );
        
        const outgoingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === elementToDelete.id
        );
        
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
        }
      }
    });
    
    const deletionEvents = ['element.removed', 'elements.deleted', 'shape.removed'];
    
    deletionEvents.forEach(eventName => {
      eventBus.on(eventName, (event) => {
        const removedElement = event.element || (event.elements && event.elements[0]);
        if (!removedElement) return;
        
        const elementName = getElementName(removedElement);
        
        if (elementName && elementName.startsWith('Aprobar ') && removedElement.type === 'bpmn:UserTask') {
          setTimeout(() => {
            executeSmartReconnection(window.bpmnModeler, removedElement.id);
          }, 100);
        }
      });
    });
    
    window.rasciEventListenerConfigured = true;
  }
}

function executeSmartReconnection(modeler, deletedElementId) {
  const reconnectionInfo = pendingReconnections.get(deletedElementId);
  if (!reconnectionInfo) {
    restoreFlowAfterApprovalRemoval(modeler);
    return;
  }
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
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
    try {
      modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
      removeAssociatedRole(modeler, reconnectionInfo.approvalTaskName);
      pendingReconnections.delete(deletedElementId);
    } catch (e) {
      console.error(`Error en reconexión: ${e.message}`);
      restoreFlowAfterApprovalRemoval(modeler);
    }
  } else {
    restoreFlowAfterApprovalRemoval(modeler);
  }
}

function removeAssociatedRole(modeler, approvalTaskName) {
  const roleName = approvalTaskName.replace('Aprobar ', '');
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  const roleElement = elementRegistry.find(element => 
    (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
    element.businessObject && element.businessObject.name === roleName
  );
  
  if (roleElement) {
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
      try {
        const roleConnections = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          ((conn.source && conn.source.id === roleElement.id) || 
           (conn.target && conn.target.id === roleElement.id))
        );
        
        if (roleConnections.length > 0) {
          modeling.removeElements(roleConnections);
        }
        
        modeling.removeElements([roleElement]);
      } catch (e) {
        console.error(`Error eliminando rol: ${e.message}`);
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
        try {
          modeling.connect(element, target, { type: 'bpmn:SequenceFlow' });
        } catch (e) {
          console.error(`Error conectando por nombre: ${e.message}`);
        }
      }
    }
  });
}
