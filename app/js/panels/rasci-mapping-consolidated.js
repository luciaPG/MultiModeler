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
    
    // Find all existing RALph roles to calculate next available position
    const existingRoles = elementRegistry.filter(element => 
      element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
    );
    
    // Calculate position based on existing roles and avoid overlaps
    let position;
    const roleWidth = 150;
    const roleHeight = 80;
    const margin = 50;
    const startX = 100;
    const startY = 100;
    const maxRolesPerRow = 5;
    
    if (existingRoles.length === 0) {
      position = { x: startX, y: startY };
    } else {
      // Find next available position in a grid layout
      const row = Math.floor(existingRoles.length / maxRolesPerRow);
      const col = existingRoles.length % maxRolesPerRow;
      
      position = {
        x: startX + (col * (roleWidth + margin)),
        y: startY + (row * (roleHeight + margin))
      };
      
      // Check if position is already occupied and adjust if needed
      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts) {
        const isOccupied = existingRoles.some(role => {
          const distance = Math.sqrt(
            Math.pow(role.x - position.x, 2) + Math.pow(role.y - position.y, 2)
          );
          return distance < (roleWidth + margin);
        });
        
        if (!isOccupied) break;
        
        // Move to next position
        position.x += roleWidth + margin;
        if (position.x > startX + (maxRolesPerRow * (roleWidth + margin))) {
          position.x = startX;
          position.y += roleHeight + margin;
        }
        attempts++;
      }
    }
    
    const role = modeling.createShape(
      { type: 'RALph:RoleRALph' },
      position,
      rootElement
    );

    modeling.updateProperties(role, { name: roleName });
    results.rolesCreated++;
    
    return role;
  } catch (error) {
    console.error(`Error creating role ${roleName}: ${error.message}`);
    return null;
  }
}

function findExistingAndGate(modeler, bpmnTask) {
  const elementRegistry = modeler.get('elementRegistry');
  
  return elementRegistry.find(element => 
    element.type === 'RALph:Complex-Assignment-AND' &&
    elementRegistry.filter(conn => 
      conn.type === 'RALph:ResourceArc' &&
      conn.source && conn.source.id === bpmnTask.id &&
      conn.target && conn.target.id === element.id
    ).length > 0
  );
}

function createAndGate(modeler, bpmnTask, roles, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  const existingAndGate = findExistingAndGate(modeler, bpmnTask);
  if (existingAndGate) {
    // First, remove connections to roles that are no longer in the list
    const currentConnections = elementRegistry.filter(conn => 
      conn.type === 'RALph:ResourceArc' &&
      conn.source && conn.source.type && 
      (conn.source.type === 'RALph:RoleRALph' || conn.source.type === 'ralph:Role') &&
      conn.target && conn.target.id === existingAndGate.id
    );
    
    currentConnections.forEach(conn => {
      const roleElement = conn.source;
      const roleName = roleElement.businessObject && roleElement.businessObject.name;
      if (roleName && !roles.includes(roleName)) {
        try {
          modeling.removeElements([conn]);
        } catch (error) {
          console.error(`Error removing connection: ${error.message}`);
        }
      }
    });
    
    // Add connections for new roles
    roles.forEach(roleName => {
      const role = elementRegistry.find(element => 
        (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
        element.businessObject && element.businessObject.name === roleName
      );
      
      if (role) {
        const isConnected = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          conn.source && conn.source.id === role.id &&
          conn.target && conn.target.id === existingAndGate.id
        ).length > 0;
        
        if (!isConnected) {
          modeling.connect(role, existingAndGate, { type: 'RALph:ResourceArc' });
          results.roleAssignments++;
        }
      }
    });
    
    // Check if AND gate still has connections, if not remove it
    const remainingConnections = elementRegistry.filter(conn => 
      conn.type === 'RALph:ResourceArc' &&
      conn.target && conn.target.id === existingAndGate.id &&
      conn.source && conn.source.type && 
      (conn.source.type === 'RALph:RoleRALph' || conn.source.type === 'ralph:Role')
    );
    
    if (remainingConnections.length === 0) {
      try {
        modeling.removeElements([existingAndGate]);
        return null;
      } catch (error) {
        console.error(`Error removing AND gate: ${error.message}`);
      }
    } else if (remainingConnections.length === 1) {
      // If only one role remains, convert back to direct connection
      const remainingRole = remainingConnections[0].source;
      try {
        modeling.removeElements([existingAndGate]);
        modeling.connect(bpmnTask, remainingRole, { type: 'RALph:ResourceArc' });
        results.roleAssignments++;
        return null;
      } catch (error) {
        console.error(`Error converting to direct connection: ${error.message}`);
      }
    }
    
    return existingAndGate;
  }
  
  try {
    const rootElement = canvas.getRootElement();
    
    // Calculate position for AND gate avoiding overlaps
    const existingAndGates = elementRegistry.filter(element => 
      element.type === 'RALph:Complex-Assignment-AND'
    );
    
    let position = { x: bpmnTask.x + 200, y: bpmnTask.y };
    
    // Check for overlaps with existing AND gates and adjust position
    let attempts = 0;
    const maxAttempts = 10;
    const gateWidth = 50;
    const gateHeight = 50;
    const margin = 100;
    
    while (attempts < maxAttempts) {
      const isOccupied = existingAndGates.some(gate => {
        const distance = Math.sqrt(
          Math.pow(gate.x - position.x, 2) + Math.pow(gate.y - position.y, 2)
        );
        return distance < (gateWidth + margin);
      });
      
      if (!isOccupied) break;
      
      // Try different positions
      if (attempts % 2 === 0) {
        position.y += gateHeight + margin;
      } else {
        position.x += gateWidth + margin;
        position.y = bpmnTask.y; // Reset Y to original task level
      }
      attempts++;
    }
    
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
  console.log('🧹 Starting cleanup of orphaned elements');
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  const elementsToRemove = [];
  const connectionsToRemove = [];
  
  // Get all roles that should exist based on current matrix
  const activeRoles = new Set();
  if (window.rasciMatrixData) {
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        // Only add roles that have actual responsibilities (not "-" or empty)
        if (responsibility && responsibility !== '-' && responsibility !== '') {
          activeRoles.add(roleName);
        }
      });
    });
  }
  
  console.log(`🎯 Active roles in matrix: [${Array.from(activeRoles).join(', ')}]`);
  
  // Clean up special elements (C/A/I)
  elementRegistry.forEach(element => {
    const elementName = element.businessObject && element.businessObject.name;
    
    if (!elementName) return;
    
    const isSpecialElement = ['Consultar ', 'Aprobar ', 'Informar '].some(prefix => 
      elementName.startsWith(prefix)
    );
    
    if (isSpecialElement) {
      console.log(`🔍 Checking special element: ${elementName}`);
      
      // Check if this element should exist based on current matrix data
      let shouldExist = false;
      
      if (window.rasciMatrixData) {
        Object.keys(window.rasciMatrixData).forEach(taskName => {
          const taskRoles = window.rasciMatrixData[taskName];
          Object.keys(taskRoles).forEach(roleName => {
            const responsibility = taskRoles[roleName];
            
            // Skip if responsibility is empty, null, undefined, or "-"
            if (!responsibility || responsibility === '-' || responsibility === '') {
              return;
            }
            
            let expectedName = null;
            
            if (responsibility === 'C') expectedName = `Consultar ${roleName}`;
            else if (responsibility === 'A') expectedName = `Aprobar ${roleName}`;
            else if (responsibility === 'I') expectedName = `Informar ${roleName}`;
            
            if (expectedName === elementName) {
              shouldExist = true;
              console.log(`  ✅ Element should exist based on matrix: ${elementName}`);
            }
          });
        });
      }
      
      if (!shouldExist) {
        console.log(`  🗑️ Marking for removal: ${elementName} (not in matrix or has '-' value)`);
        elementsToRemove.push(element);
      }
    }
  });
  
  // Clean up orphaned roles (roles that no longer have responsibilities)
  const allRoleElements = elementRegistry.filter(element => 
    element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
  );
  
  allRoleElements.forEach(roleElement => {
    const roleName = roleElement.businessObject && roleElement.businessObject.name;
    if (roleName && !activeRoles.has(roleName)) {
      console.log(`🗑️ Marking orphaned role for removal: ${roleName} (not in active matrix)`);
      elementsToRemove.push(roleElement);
    }
  });
  
  // Clean up orphaned AND gates
  const allAndGates = elementRegistry.filter(element => 
    element.type === 'RALph:Complex-Assignment-AND'
  );
  
  allAndGates.forEach(andGate => {
    // Check if this AND gate is still connected to any active roles
    const connectedRoles = elementRegistry.filter(conn => 
      conn.type === 'RALph:ResourceArc' &&
      conn.target && conn.target.id === andGate.id &&
      conn.source && (conn.source.type === 'RALph:RoleRALph' || conn.source.type === 'ralph:Role')
    );
    
    const hasActiveRoleConnections = connectedRoles.some(conn => {
      const roleName = conn.source.businessObject && conn.source.businessObject.name;
      return roleName && activeRoles.has(roleName);
    });
    
    if (!hasActiveRoleConnections) {
      console.log(`🗑️ Marking orphaned AND gate for removal (no active role connections)`);
      elementsToRemove.push(andGate);
    }
  });
  
  // Clean up orphaned role connections
  const allConnections = elementRegistry.filter(conn => 
    conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association'
  );
  
  allConnections.forEach(conn => {
    if (conn.source && conn.target) {
      const sourceName = getElementName(conn.source);
      const targetName = getElementName(conn.target);
      
      // Check if connection involves a role that should be removed
      let shouldRemoveConnection = false;
      
      // If target is a role that's no longer active
      if ((conn.target.type === 'RALph:RoleRALph' || conn.target.type === 'ralph:Role') && 
          targetName && !activeRoles.has(targetName)) {
        console.log(`🗑️ Marking connection for removal: ${sourceName} -> ${targetName} (target role not active)`);
        shouldRemoveConnection = true;
      }
      
      // If source is a role that's no longer active  
      if ((conn.source.type === 'RALph:RoleRALph' || conn.source.type === 'ralph:Role') && 
          sourceName && !activeRoles.has(sourceName)) {
        console.log(`🗑️ Marking connection for removal: ${sourceName} -> ${targetName} (source role not active)`);
        shouldRemoveConnection = true;
      }
      
      // If connection involves a task and role, check if that specific responsibility exists
      if (!shouldRemoveConnection && window.rasciMatrixData) {
        const isTaskToRole = (conn.source.type.includes('Task') && 
                             (conn.target.type === 'RALph:RoleRALph' || conn.target.type === 'ralph:Role'));
        
        if (isTaskToRole && sourceName && targetName) {
          const taskRoles = window.rasciMatrixData[sourceName];
          if (taskRoles) {
            const responsibility = taskRoles[targetName];
            // Remove connection if responsibility is "-" or doesn't exist
            if (!responsibility || responsibility === '-' || responsibility === '') {
              console.log(`🗑️ Marking connection for removal: ${sourceName} -> ${targetName} (responsibility is "${responsibility}")`);
              shouldRemoveConnection = true;
            }
          }
        }
      }
      
      if (shouldRemoveConnection) {
        connectionsToRemove.push(conn);
      }
    }
  });
  
  // Remove connections first, then elements
  if (connectionsToRemove.length > 0) {
    console.log(`🧹 Removing ${connectionsToRemove.length} orphaned connections`);
    try {
      modeling.removeElements(connectionsToRemove);
      console.log('✅ Orphaned connections cleanup completed');
    } catch (e) {
      console.error(`❌ Error cleaning orphaned connections: ${e.message}`);
    }
  }
  
  if (elementsToRemove.length > 0) {
    console.log(`🧹 Removing ${elementsToRemove.length} orphaned elements`);
    try {
      modeling.removeElements(elementsToRemove);
      console.log('✅ Orphaned elements cleanup completed');
    } catch (e) {
      console.error(`❌ Error cleaning orphaned elements: ${e.message}`);
    }
  } else {
    console.log('✅ No orphaned elements found');
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
  
  console.log(`    🔍 Finding next task for: ${getElementName(currentTask)}`);
  
  function findNextTaskRecursive(task, visited = new Set()) {
    if (visited.has(task.id)) {
      console.log(`    ⚠️ Circular reference detected for task: ${task.id}`);
      return null;
    }
    visited.add(task.id);
    
    const outgoingConnections = elementRegistry.filter(connection => 
      connection.type === 'bpmn:SequenceFlow' && connection.source && connection.source.id === task.id
    );
    
    console.log(`    📤 Found ${outgoingConnections.length} outgoing connections from ${getElementName(task)}`);
    
    for (const connection of outgoingConnections) {
      const target = connection.target;
      const targetName = getElementName(target);
      const targetType = target.type;
      
      console.log(`    🎯 Checking target: ${targetName} (${targetType})`);
      
      if (targetName && ['Aprobar ', 'Consultar ', 'Informar '].some(prefix => targetName.startsWith(prefix))) {
        console.log(`    ⏭️ Skipping special element: ${targetName}`);
        const nextTask = findNextTaskRecursive(target, visited);
        if (nextTask) return nextTask;
        continue;
      }
      
      const validTypes = ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask', 
                         'bpmn:ManualTask', 'bpmn:BusinessRuleTask', 'bpmn:SendTask', 'bpmn:ReceiveTask',
                         'bpmn:CallActivity', 'bpmn:SubProcess'];
      
      if (validTypes.includes(targetType)) {
        console.log(`    ✅ Found valid next task: ${targetName} (${targetType})`);
        return target;
      }
      
      if (targetType && targetType.includes('Gateway')) {
        console.log(`    🚪 Traversing gateway: ${targetName} (${targetType})`);
        const nextTask = findNextTaskRecursive(target, visited);
        if (nextTask) return nextTask;
      }
    }
    
    console.log(`    🚫 No valid next task found from: ${getElementName(task)}`);
    return null;
  }
  
  const result = findNextTaskRecursive(currentTask);
  console.log(`    🎯 Final result for ${getElementName(currentTask)}: ${result ? getElementName(result) : 'null'}`);
  return result;
}

function createSequentialSpecialElements(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  const taskName = getElementName(bpmnTask);
  console.log(`🔗 Creating sequences for task: ${taskName}`);
  console.log(`  👥 Consult roles: [${consultRoles.join(', ')}]`);
  console.log(`  ✅ Approve roles: [${approveRoles.join(', ')}]`);
  console.log(`  📢 Inform roles: [${informRoles.join(', ')}]`);
  
  const nextRealTask = findNextTaskInOriginalFlow(modeler, bpmnTask);
  if (!nextRealTask) {
    console.warn(`⚠️ No next task found for ${taskName}, this might be the last task in the flow`);
    
    // Check if this is actually the last task by looking for end events
    const allElements = elementRegistry.filter(element => 
      ['bpmn:EndEvent', 'bpmn:TerminateEndEvent'].includes(element.type)
    );
    
    if (allElements.length > 0) {
      console.log(`📍 Found ${allElements.length} end event(s), creating sequence to end event`);
      const endEvent = allElements[0]; // Use the first end event found
      
      let currentSource = bpmnTask;
      const flowElements = [];
      
      [...consultRoles, ...approveRoles, ...informRoles].forEach((roleName, index) => {
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
        
        console.log(`  🔨 Creating element ${index + 1}: ${eventType} ${roleName} (${elementType})`);
        const element = createSpecialElement(modeler, currentSource, roleName, elementType, eventType, results);
        if (element) {
          flowElements.push(element);
          currentSource = element;
          console.log(`  ✅ Created: ${eventType} ${roleName}`);
        } else {
          console.error(`  ❌ Failed to create: ${eventType} ${roleName}`);
        }
      });
      
      if (flowElements.length > 0) {
        console.log(`🔗 Connecting final element to end event: ${getElementName(endEvent)}`);
        try {
          modeling.connect(currentSource, endEvent, { type: 'bpmn:SequenceFlow' });
          console.log(`✅ Sequence chain completed for ${taskName} to end event`);
        } catch (e) {
          console.error(`❌ Error connecting to end event: ${e.message}`);
        }
      }
    } else {
      console.warn(`⚠️ No end events found, skipping sequence creation for last task: ${taskName}`);
    }
    return;
  }
  
  console.log(`🎯 Next task found: ${getElementName(nextRealTask)}`);
  
  const directConnection = elementRegistry.find(conn => 
    conn.type === 'bpmn:SequenceFlow' &&
    conn.source && conn.source.id === bpmnTask.id &&
    conn.target && conn.target.id === nextRealTask.id
  );
  
  if (directConnection) {
    console.log(`🔧 Removing direct connection between ${taskName} and ${getElementName(nextRealTask)}`);
    try {
      modeling.removeConnection(directConnection);
    } catch (e) {
      console.error(`❌ Error removing direct connection: ${e.message}`);
    }
  }
  
  let currentSource = bpmnTask;
  const flowElements = [];
  
  [...consultRoles, ...approveRoles, ...informRoles].forEach((roleName, index) => {
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
    
    console.log(`  🔨 Creating element ${index + 1}: ${eventType} ${roleName}`);
    const element = createSpecialElement(modeler, currentSource, roleName, elementType, eventType, results);
    if (element) {
      flowElements.push(element);
      currentSource = element;
      console.log(`  ✅ Created: ${eventType} ${roleName}`);
    } else {
      console.error(`  ❌ Failed to create: ${eventType} ${roleName}`);
    }
  });
  
  if (flowElements.length > 0) {
    console.log(`🔗 Connecting final element to ${getElementName(nextRealTask)}`);
    try {
      modeling.connect(currentSource, nextRealTask, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Sequence chain completed for ${taskName}`);
    } catch (e) {
      console.error(`❌ Error connecting to next task: ${e.message}`);
    }
  } else {
    console.log(`🔄 No elements created, restoring direct connection`);
    try {
      modeling.connect(bpmnTask, nextRealTask, { type: 'bpmn:SequenceFlow' });
    } catch (e) {
      console.error(`❌ Error restoring direct connection: ${e.message}`);
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
  
  console.log(`    🔧 Creating special element: ${elementName} (${elementType})`);
  
  const existingElement = elementRegistry.find(element => 
    element.type === elementType && 
    element.businessObject && element.businessObject.name === elementName
  );
  
  if (existingElement) {
    console.log(`    ♻️ Found existing element: ${elementName}, reusing`);
    elementRegistry.forEach(conn => {
      if (conn.type === 'bpmn:SequenceFlow' &&
          (conn.source && conn.source.id === existingElement.id || conn.target && conn.target.id === existingElement.id)) {
        try {
          modeling.removeConnection(conn);
        } catch (e) {
          console.error(`    ❌ Error removing old connection: ${e.message}`);
        }
      }
    });
    
    try {
      modeling.connect(sourceElement, existingElement, { type: 'bpmn:SequenceFlow' });
      console.log(`    ✅ Connected to existing element: ${elementName}`);
    } catch (e) {
      console.error(`    ❌ Error connecting to existing element: ${e.message}`);
    }
    
    return existingElement;
  }
  
  try {
    const rootElement = canvas.getRootElement();
    
    // Calculate position avoiding overlaps with existing special elements
    const existingSpecialElements = elementRegistry.filter(element => 
      (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:UserTask') &&
      element.businessObject && element.businessObject.name &&
      (element.businessObject.name.startsWith('Consultar ') || 
       element.businessObject.name.startsWith('Aprobar ') || 
       element.businessObject.name.startsWith('Informar '))
    );
    
    let position = { x: sourceElement.x + 150, y: sourceElement.y };
    
    // Check for overlaps and adjust position
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
      
      // Try different positions - alternate between moving right and down
      if (attempts % 2 === 0) {
        position.x += elementWidth + margin;
      } else {
        position.y += elementHeight + margin;
        position.x = sourceElement.x + 150; // Reset X to original offset
      }
      attempts++;
    }
    
    const elementData = { type: elementType };
    const element = modeling.createShape(elementData, position, rootElement);
    
    if (!element) {
      console.error(`    ❌ Failed to create shape of type: ${elementType} at position (${position.x}, ${position.y})`);
      console.error(`    🔍 Root element:`, rootElement);
      console.error(`    🔍 Element data:`, elementData);
      return null;
    }
    
    console.log(`    🎨 Shape created successfully: ${element.id}, setting properties`);
    
    // Set properties immediately to prevent label loss
    try {
      console.log(`    🏷️ Setting immediate properties for: ${elementName}`);
      
      if (elementType === 'bpmn:IntermediateThrowEvent') {
        const moddle = modeler.get('moddle');
        if (!element.businessObject.eventDefinitions) {
          const messageEventDefinition = moddle.create('bpmn:MessageEventDefinition');
          element.businessObject.eventDefinitions = [messageEventDefinition];
        }
      }
      
      // Set the name immediately using modeling service
      if (element.businessObject) {
        modeling.updateProperties(element, { name: elementName });
        console.log(`    ✅ Name set immediately via modeling: ${elementName}`);
      } else {
        const moddle = modeler.get('moddle');
        element.businessObject = moddle.create(elementType, { name: elementName });
        console.log(`    ✅ BusinessObject created with name: ${elementName}`);
      }
      
      // Double-check the name is set
      if (element.businessObject && !element.businessObject.name) {
        element.businessObject.name = elementName;
        console.log(`    🔧 Name set directly on businessObject: ${elementName}`);
      }
      
    } catch (immediateError) {
      console.error(`    ❌ Error setting immediate properties: ${immediateError.message}`);
    }
    
    // Backup timeout to ensure properties persist
    setTimeout(() => {
      try {
        if (!element.businessObject || !element.businessObject.name || element.businessObject.name !== elementName) {
          console.log(`    🔄 Backup: Restoring name for element: ${element.id}`);
          
          if (element.businessObject) {
            modeling.updateProperties(element, { name: elementName });
            element.businessObject.name = elementName;
          } else {
            const moddle = modeler.get('moddle');
            element.businessObject = moddle.create(elementType, { name: elementName });
          }
          
          console.log(`    ✅ Backup name restore completed: ${elementName}`);
        }
        
        const canvas = modeler.get('canvas');
        if (canvas && typeof canvas.zoom === 'function') {
          const currentZoom = canvas.zoom();
          canvas.zoom(currentZoom, 'auto');
        }
        
      } catch (labelError) {
        console.error(`    ❌ Error in backup label restore: ${labelError.message}`);
      }
    }, 150);
    
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
  const modeling = modeler.get('modeling');
  
  // First, collect all approval roles that should exist according to the matrix
  const expectedApprovalTasks = new Set();
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    Object.keys(taskRoles).forEach(roleKey => {
      const responsibility = taskRoles[roleKey];
      if (responsibility === 'A') {
        expectedApprovalTasks.add(`Aprobar ${roleKey}`);
      }
    });
  });
  
  console.log(`🎯 Expected approval tasks: [${Array.from(expectedApprovalTasks).join(', ')}]`);
  
  // Remove orphaned approval tasks that are no longer in the matrix
  const allApprovalTasks = elementRegistry.filter(element => 
    element.type === 'bpmn:UserTask' && 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  allApprovalTasks.forEach(approvalTask => {
    const taskName = approvalTask.businessObject.name;
    if (!expectedApprovalTasks.has(taskName)) {
      console.log(`🗑️ Removing orphaned approval task: ${taskName}`);
      try {
        // Remove incoming and outgoing connections first
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === approvalTask.id
        );
        const outgoingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === approvalTask.id
        );
        
        // Remove role assignments to this approval task
        const roleConnections = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          conn.source && conn.source.id === approvalTask.id
        );
        
        if (roleConnections.length > 0) {
          modeling.removeElements(roleConnections);
        }
        
        // Reconnect flow if there were connections
        if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
          const sourceElement = incomingConnections[0].source;
          const targetElement = outgoingConnections[0].target;
          
          // Remove the approval task first
          modeling.removeElements([approvalTask]);
          
          // Then reconnect the flow
          setTimeout(() => {
            try {
              modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
            } catch (reconnectError) {
              console.error(`Error reconnecting flow after approval task removal: ${reconnectError.message}`);
            }
          }, 50);
        } else {
          // No connections to handle, just remove the task
          modeling.removeElements([approvalTask]);
        }
        
        results.elementsRemoved++;
      } catch (error) {
        console.error(`Error removing orphaned approval task ${taskName}: ${error.message}`);
      }
    }
  });
  
  // Now handle the regular role assignments
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    
    if (!bpmnTask) return;
    
    const responsibleRoles = [];
    const supportRoles = [];
    const approveRoles = [];
    
    Object.keys(taskRoles).forEach(roleKey => {
      const responsibility = taskRoles[roleKey];
      
      // Skip empty or "-" values to prevent unnecessary canvas modifications
      if (!responsibility || responsibility === '-' || responsibility.trim() === '') {
        return;
      }
      
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
    
    // Handle R and S roles
    if (responsibleRoles.length === 0 && supportRoles.length === 0) {
      // No R or S roles to process - remove any existing AND gates
      const existingAndGate = findExistingAndGate(modeler, bpmnTask);
      if (existingAndGate) {
        try {
          modeling.removeElements([existingAndGate]);
        } catch (error) {
          console.error(`Error removing AND gate: ${error.message}`);
        }
      }
    } else if (responsibleRoles.length === 1 && supportRoles.length === 0) {
      // Only one R role - use direct connection
      const roleName = responsibleRoles[0];
      const existingAndGate = findExistingAndGate(modeler, bpmnTask);
      
      if (existingAndGate) {
        // Remove AND gate and create direct connection
        try {
          modeling.removeElements([existingAndGate]);
        } catch (error) {
          console.error(`Error removing AND gate: ${error.message}`);
        }
      }
      
      // Create or ensure role exists
      createRalphRole(modeler, roleName, results);
      
      // Check if direct connection already exists
      const existingDirectConnection = elementRegistry.filter(conn => 
        (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
        conn.source && conn.source.id === bpmnTask.id &&
        conn.target && conn.target.businessObject && conn.target.businessObject.name === roleName
      );
      
      if (existingDirectConnection.length === 0) {
        createSimpleAssignment(modeler, bpmnTask, roleName, results);
      }
    } else {
      // Multiple roles (R + S) - use AND gate
      const allRoles = [...responsibleRoles, ...supportRoles];
      
      // Remove any existing direct connections for R roles
      responsibleRoles.forEach(roleName => {
        const existingConnections = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          conn.source && conn.source.id === bpmnTask.id &&
          conn.target && conn.target.businessObject && conn.target.businessObject.name === roleName
        );
        
        if (existingConnections.length > 0) {
          try {
            modeling.removeElements(existingConnections);
          } catch (error) {
            console.error(`Error removing direct connections: ${error.message}`);
          }
        }
      });
      
      // Create roles and AND gate
      allRoles.forEach(roleName => {
        createRalphRole(modeler, roleName, results);
      });
      
      createAndGate(modeler, bpmnTask, allRoles, results);
    }
    
    // Handle A roles (approval tasks)
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

// Fixed cleanup function based on working commit pattern
function forceCleanupAElements(modeler, matrix, results) {
  console.log('🧹 Forcing cleanup of A elements with proper flow restoration...');
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // Get all special elements (A, C, I) currently in the diagram
  const allSpecialElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    (element.businessObject.name.startsWith('Aprobar ') ||
     element.businessObject.name.startsWith('Consultar ') ||
     element.businessObject.name.startsWith('Informar '))
  );
  
  console.log(`🔍 Found ${allSpecialElements.length} special elements in diagram`);
  
  // Determine which special elements should exist according to current matrix
  const expectedSpecialElements = new Set();
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        expectedSpecialElements.add(`Aprobar ${roleName}`);
      } else if (responsibility === 'C') {
        expectedSpecialElements.add(`Consultar ${roleName}`);
      } else if (responsibility === 'I') {
        expectedSpecialElements.add(`Informar ${roleName}`);
      }
    });
  });
  
  console.log(`📋 Expected special elements: [${Array.from(expectedSpecialElements).join(', ')}]`);
  
  // Find and remove orphaned special elements
  const orphanedSpecialElements = allSpecialElements.filter(element => {
    const elementName = element.businessObject.name;
    const shouldExist = expectedSpecialElements.has(elementName);
    console.log(`🔍 Checking ${elementName}: should exist = ${shouldExist}`);
    return !shouldExist;
  });
  
  console.log(`🗑️ Found ${orphanedSpecialElements.length} orphaned special elements to remove`);
  
  // Track roles associated with deleted elements for potential cleanup
  const rolesToCheck = new Set();
  
  if (orphanedSpecialElements.length > 0) {
    // Group elements by their parent task to handle flow restoration properly
    const elementsByParentTask = new Map();
    
    orphanedSpecialElements.forEach(element => {
      const elementName = element.businessObject.name;
      
      // Find the incoming connection to determine parent task
      const incomingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
      );
      
      if (incomingConnections.length > 0) {
        const parentTask = incomingConnections[0].source;
        const parentTaskName = getElementName(parentTask);
        
        if (!elementsByParentTask.has(parentTaskName)) {
          elementsByParentTask.set(parentTaskName, {
            parentTask: parentTask,
            elementsToRemove: [],
            lastElement: null
          });
        }
        
        elementsByParentTask.get(parentTaskName).elementsToRemove.push(element);
      }
      
      // Extract role name for potential cleanup
      const roleName = elementName.replace(/^(Aprobar|Consultar|Informar) /, '');
      rolesToCheck.add(roleName);
    });
    
    // Process each parent task group
    elementsByParentTask.forEach((taskInfo, parentTaskName) => {
      console.log(`🔧 Processing task group: ${parentTaskName}`);
      
      // Find the final destination after all special elements
      let finalDestination = null;
      let currentElement = taskInfo.parentTask;
      
      // Traverse the chain to find where it should reconnect
      while (currentElement) {
        const outgoingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === currentElement.id
        );
        
        if (outgoingConnections.length === 0) break;
        
        const nextElement = outgoingConnections[0].target;
        const nextElementName = getElementName(nextElement);
        
        // If next element is a special element that will be removed, continue
        if (taskInfo.elementsToRemove.find(el => el.id === nextElement.id)) {
          currentElement = nextElement;
          continue;
        }
        
        // If next element is NOT a special element, this is our destination
        if (!nextElementName || !['Aprobar ', 'Consultar ', 'Informar '].some(prefix => nextElementName.startsWith(prefix))) {
          finalDestination = nextElement;
          break;
        }
        
        currentElement = nextElement;
      }
      
      // If no final destination found, check original flow
      if (!finalDestination) {
        const originalTargets = originalFlowMap.get(parentTaskName) || originalFlowMap.get(taskInfo.parentTask.id);
        if (originalTargets && originalTargets.length > 0) {
          for (const originalTarget of originalTargets) {
            const targetElement = elementRegistry.get(originalTarget.id) || 
                                elementRegistry.find(el => getElementName(el) === getElementName(originalTarget));
            if (targetElement) {
              finalDestination = targetElement;
              break;
            }
          }
        }
      }
      
      console.log(`🎯 Final destination for ${parentTaskName}: ${finalDestination ? getElementName(finalDestination) : 'none'}`);
      
      // Remove all special elements for this task
      taskInfo.elementsToRemove.forEach(element => {
        const elementName = element.businessObject.name;
        console.log(`🗑️ Removing: ${elementName}`);
        
        try {
          // Remove role connections first
          const roleConnections = elementRegistry.filter(conn => 
            (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
            ((conn.source && conn.source.id === element.id) || 
             (conn.target && conn.target.id === element.id))
          );
          
          if (roleConnections.length > 0) {
            modeling.removeElements(roleConnections);
          }
          
          // Remove the element
          modeling.removeElements([element]);
          results.elementsRemoved++;
          
        } catch (error) {
          console.error(`❌ Error removing ${elementName}: ${error.message}`);
        }
      });
      
      // Reconnect parent task to final destination
      if (finalDestination) {
        setTimeout(() => {
          try {
            // Check if connection already exists
            const existingConnection = elementRegistry.find(conn => 
              conn.type === 'bpmn:SequenceFlow' &&
              conn.source && conn.source.id === taskInfo.parentTask.id &&
              conn.target && conn.target.id === finalDestination.id
            );
            
            if (!existingConnection) {
              modeling.connect(taskInfo.parentTask, finalDestination, { type: 'bpmn:SequenceFlow' });
              console.log(`✅ Reconnected flow: ${parentTaskName} -> ${getElementName(finalDestination)}`);
            } else {
              console.log(`✅ Flow already connected: ${parentTaskName} -> ${getElementName(finalDestination)}`);
            }
          } catch (reconnectError) {
            console.error(`❌ Error reconnecting flow: ${reconnectError.message}`);
          }
        }, 50);
      }
    });
    
    console.log(`✅ Removed ${orphanedSpecialElements.length} orphaned special elements`);
  } else {
    console.log('✅ No orphaned special elements found');
  }
  
  // Clean up roles that are no longer used
  setTimeout(() => {
    console.log('🧹 Checking for unused roles after special element cleanup...');
    
    // Get all roles that should be active according to current matrix
    const activeRoles = new Set();
    Object.keys(matrix).forEach(taskName => {
      const taskRoles = matrix[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        if (responsibility && responsibility !== '-' && responsibility !== '') {
          activeRoles.add(roleName);
        }
      });
    });
    
    console.log(`📋 Active roles according to matrix: [${Array.from(activeRoles).join(', ')}]`);
    
    // Check each role that was associated with deleted elements
    rolesToCheck.forEach(roleName => {
      console.log(`🔍 Checking if role should be removed: ${roleName}`);
      
      // If role is not active in matrix, remove it
      if (!activeRoles.has(roleName)) {
        const roleElement = elementRegistry.find(element => 
          (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
          element.businessObject && element.businessObject.name === roleName
        );
        
        if (roleElement) {
          console.log(`🗑️ Removing unused role: ${roleName}`);
          
          try {
            // Remove all connections to this role first
            const roleConnections = elementRegistry.filter(conn => 
              (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
              ((conn.source && conn.source.id === roleElement.id) || 
               (conn.target && conn.target.id === roleElement.id))
            );
            
            if (roleConnections.length > 0) {
              console.log(`🗑️ Removing ${roleConnections.length} connections for role: ${roleName}`);
              modeling.removeElements(roleConnections);
            }
            
            // Remove the role element
            modeling.removeElements([roleElement]);
            console.log(`✅ Successfully removed unused role: ${roleName}`);
            results.elementsRemoved++;
            
          } catch (error) {
            console.error(`❌ Error removing role ${roleName}: ${error.message}`);
          }
        } else {
          console.log(`⚠️ Role element not found for: ${roleName}`);
        }
      } else {
        console.log(`✅ Role ${roleName} is still active in matrix, keeping it`);
      }
    });
  }, 100);
  
  console.log('✅ Special elements and associated roles cleanup completed');
}

// Enhanced cleanup function that ensures complete removal
function forceCleanupAElementsEnhanced(modeler, matrix, results) {
  console.log('🧹 Enhanced A element cleanup with complete removal...');
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // Improved element removal function
  function forceRemoveElementCompletely(element) {
    console.log(`🗑️ Force removing element: ${getElementName(element)}`);
    
    try {
      // Step 1: Remove all connections first
      const allConnections = elementRegistry.filter(conn => 
        (conn.source && conn.source.id === element.id) || 
        (conn.target && conn.target.id === element.id)
      );
      
      console.log(`🔗 Found ${allConnections.length} connections to remove`);
      
      if (allConnections.length > 0) {
        allConnections.forEach(conn => {
          try {
            modeling.removeConnection(conn);
            console.log(`✅ Removed connection: ${conn.type}`);
          } catch (connError) {
            console.error(`❌ Error removing connection: ${connError.message}`);
          }
        });
      }
      
      // Step 2: Remove the element itself
      modeling.removeShape(element);
      console.log(`✅ Element removed successfully: ${getElementName(element)}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Error in force remove: ${error.message}`);
      return false;
    }
  }
  
  // Get all special elements (A, C, I) currently in the diagram
  const allSpecialElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    (element.businessObject.name.startsWith('Aprobar ') ||
     element.businessObject.name.startsWith('Consultar ') ||
     element.businessObject.name.startsWith('Informar '))
  );
  
  console.log(`🔍 Found ${allSpecialElements.length} special elements in diagram`);
  
  // Determine which special elements should exist according to current matrix
  const expectedSpecialElements = new Set();
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        expectedSpecialElements.add(`Aprobar ${roleName}`);
      } else if (responsibility === 'C') {
        expectedSpecialElements.add(`Consultar ${roleName}`);
      } else if (responsibility === 'I') {
        expectedSpecialElements.add(`Informar ${roleName}`);
      }
    });
  });
  
  console.log(`📋 Expected special elements: [${Array.from(expectedSpecialElements).join(', ')}]`);
  
  // Find and remove orphaned special elements
  const orphanedSpecialElements = allSpecialElements.filter(element => {
    const elementName = element.businessObject.name;
    const shouldExist = expectedSpecialElements.has(elementName);
    console.log(`🔍 Checking ${elementName}: should exist = ${shouldExist}`);
    return !shouldExist;
  });
  
  console.log(`🗑️ Found ${orphanedSpecialElements.length} orphaned special elements to remove`);
  
  if (orphanedSpecialElements.length === 0) {
    console.log('✅ No orphaned special elements found');
    return;
  }
  
  // Group elements by parent task and process flow restoration
  const elementsByParentTask = new Map();
  
  orphanedSpecialElements.forEach(element => {
    // Find the incoming connection to determine parent task
    const incomingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
    );
    
    if (incomingConnections.length > 0) {
      let parentTask = incomingConnections[0].source;
      
      // If parent is another special element, find the real parent
      while (parentTask && parentTask.businessObject && parentTask.businessObject.name &&
             ['Aprobar ', 'Consultar ', 'Informar '].some(prefix => parentTask.businessObject.name.startsWith(prefix))) {
        const parentIncoming = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === parentTask.id
        );
        if (parentIncoming.length > 0) {
          parentTask = parentIncoming[0].source;
        } else {
          break;
        }
      }
      
      const parentTaskName = getElementName(parentTask);
      
      if (!elementsByParentTask.has(parentTaskName)) {
        elementsByParentTask.set(parentTaskName, {
          parentTask: parentTask,
          elementsToRemove: [],
          finalDestination: null
        });
      }
      
      elementsByParentTask.get(parentTaskName).elementsToRemove.push(element);
    }
  });
  
  // Process each parent task group
  elementsByParentTask.forEach((taskInfo, parentTaskName) => {
    console.log(`🔧 Processing task group: ${parentTaskName} (${taskInfo.elementsToRemove.length} elements)`);
    
    // Find final destination by traversing the chain
    let finalDestination = null;
    let currentElement = taskInfo.parentTask;
    const visited = new Set();
    
    while (currentElement && !visited.has(currentElement.id)) {
      visited.add(currentElement.id);
      
      const outgoingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === currentElement.id
      );
      
      if (outgoingConnections.length === 0) break;
      
      const nextElement = outgoingConnections[0].target;
      const nextElementName = getElementName(nextElement);
      
      // If next element will be removed, continue
      if (taskInfo.elementsToRemove.find(el => el.id === nextElement.id)) {
        currentElement = nextElement;
        continue;
      }
      
      // If next element is NOT a special element or is a valid special element, this is our destination
      if (!nextElementName || !['Aprobar ', 'Consultar ', 'Informar '].some(prefix => nextElementName.startsWith(prefix))) {
        finalDestination = nextElement;
        break;
      } else {
        // It's a special element that should stay
        finalDestination = nextElement;
        break;
      }
    }
    
    // If no destination found, check original flow
    if (!finalDestination) {
      const originalTargets = originalFlowMap.get(parentTaskName) || originalFlowMap.get(taskInfo.parentTask.id);
      if (originalTargets && originalTargets.length > 0) {
        for (const originalTarget of originalTargets) {
          const targetElement = elementRegistry.get(originalTarget.id) || 
                              elementRegistry.find(el => getElementName(el) === getElementName(originalTarget));
          if (targetElement) {
            finalDestination = targetElement;
            break;
          }
        }
      }
    }
    
    taskInfo.finalDestination = finalDestination;
    console.log(`🎯 Final destination for ${parentTaskName}: ${finalDestination ? getElementName(finalDestination) : 'none'}`);
    
    // Remove all elements completely
    let removedCount = 0;
    taskInfo.elementsToRemove.forEach(element => {
      console.log(`🗑️ Force removing: ${getElementName(element)}`);
      
      if (forceRemoveElementCompletely(element)) {
        removedCount++;
        results.elementsRemoved++;
      }
    });
    
    console.log(`✅ Removed ${removedCount}/${taskInfo.elementsToRemove.length} elements for ${parentTaskName}`);
    
    // Reconnect parent to destination
    if (finalDestination) {
      setTimeout(() => {
        try {
          // Check if connection already exists
          const existingConnection = elementRegistry.find(conn => 
            conn.type === 'bpmn:SequenceFlow' &&
            conn.source && conn.source.id === taskInfo.parentTask.id &&
            conn.target && conn.target.id === finalDestination.id
          );
          
          if (!existingConnection) {
            modeling.connect(taskInfo.parentTask, finalDestination, { type: 'bpmn:SequenceFlow' });
            console.log(`✅ Reconnected flow: ${parentTaskName} -> ${getElementName(finalDestination)}`);
          } else {
            console.log(`✅ Flow already connected: ${parentTaskName} -> ${getElementName(finalDestination)}`);
          }
        } catch (reconnectError) {
          console.error(`❌ Error reconnecting flow: ${reconnectError.message}`);
        }
      }, 100);
    }
  });
  
  console.log('✅ Enhanced cleanup completed: removed ${orphanedSpecialElements.length} elements');
}

// Diagnostic function to check element removal
function diagnoseAElementRemoval(modeler) {
  console.log('🔍 Diagnosing A element removal...');
  const elementRegistry = modeler.get('elementRegistry');
  
  // Find all A elements in the canvas
  const aElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`📊 Current A elements in canvas: ${aElements.length}`);
  aElements.forEach(element => {
    console.log(`  - ${getElementName(element)} (ID: ${element.id})`);
    console.log(`    Type: ${element.type}`);
    console.log(`    Position: (${element.x}, ${element.y})`);
    console.log(`    Parent: ${element.parent ? getElementName(element.parent) : 'none'}`);
  });
  
  // Check matrix state
  if (window.rasciMatrixData) {
    console.log('📋 Matrix A responsibilities:');
    const expectedAElements = [];
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        if (taskRoles[roleName] === 'A') {
          expectedAElements.push(`Aprobar ${roleName}`);
        }
      });
    });
    
    console.log(`  Expected A elements: [${expectedAElements.join(', ')}]`);
    
    // Compare what should exist vs what exists
    const shouldBeRemoved = aElements.filter(element => 
      !expectedAElements.includes(element.businessObject.name)
    );
    
    console.log(`🗑️ Elements that should be removed: ${shouldBeRemoved.length}`);
    shouldBeRemoved.forEach(element => {
      console.log(`  - ${getElementName(element)} (should not exist)`);
    });
    
    return shouldBeRemoved;
  }
  
  return aElements;
}

// Test function to manually remove A elements
function testAElementRemoval(modeler) {
  console.log('🧪 Testing A element removal...');
  
  const elementsToRemove = diagnoseAElementRemoval(modeler);
  
  if (elementsToRemove.length === 0) {
    console.log('✅ No A elements need to be removed');
    return;
  }
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🗑️ Attempting to remove ${elementsToRemove.length} A elements`);
  
  elementsToRemove.forEach((element, index) => {
    console.log(`\n🔧 Removing element ${index + 1}/${elementsToRemove.length}: ${getElementName(element)}`);
    
    try {
      // Method 1: Try removeShape first
      console.log('  📝 Method 1: Using modeling.removeShape()');
      modeling.removeShape(element);
      console.log('  ✅ removeShape() successful');
      
      // Verify removal
      setTimeout(() => {
        const stillExists = elementRegistry.get(element.id);
        console.log(`  🔍 Element still exists after removeShape: ${!!stillExists}`);
      }, 100);
      
    } catch (error) {
      console.error(`  ❌ removeShape() failed: ${error.message}`);
      
      try {
        // Method 2: Try removeElements as fallback
        console.log('  📝 Method 2: Using modeling.removeElements()');
        modeling.removeElements([element]);
        console.log('  ✅ removeElements() successful');
        
        // Verify removal
        setTimeout(() => {
          const stillExists = elementRegistry.get(element.id);
          console.log(`  🔍 Element still exists after removeElements: ${!!stillExists}`);
        }, 100);
        
      } catch (error2) {
        console.error(`  ❌ removeElements() also failed: ${error2.message}`);
        
        // Method 3: Try direct manipulation
        try {
          console.log('  📝 Method 3: Direct element removal');
          const canvas = modeler.get('canvas');
          canvas.removeShape(element);
          console.log('  ✅ Canvas removeShape() successful');
        } catch (error3) {
          console.error(`  ❌ All removal methods failed: ${error3.message}`);
        }
      }
    }
  });
  
  // Final verification
  setTimeout(() => {
    console.log('\n🔍 Final verification...');
    diagnoseAElementRemoval(modeler);
  }, 200);
}

// Add these functions to window for easy access
window.diagnoseAElementRemoval = (modeler) => {
  if (!modeler) modeler = window.globalModeler;
  return diagnoseAElementRemoval(modeler);
};

window.testAElementRemoval = (modeler) => {
  if (!modeler) modeler = window.globalModeler;
  return testAElementRemoval(modeler);
};

window.forceCleanupAElementsEnhanced = (modeler, matrix, results = {}) => {
  if (!modeler) modeler = window.globalModeler;
  if (!matrix) matrix = window.rasciMatrixData;
  return forceCleanupAElementsEnhanced(modeler, matrix, results);
};

// Auto-mapping specific function that avoids conflicts
function executeAutoMappingWithCleanup(modeler, matrix) {
  console.log('🔄 Executing auto-mapping with aggressive cleanup...');
  
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: 0
  };
  
  // STEP 1: ALWAYS do complete cleanup first
  console.log('🧹 Step 1: Complete RASCI cleanup...');
  const cleanupCount = completeRasciCleanup(modeler, matrix);
  results.elementsRemoved = cleanupCount;
  console.log(`✅ Cleanup removed ${cleanupCount} elements`);
  
  // STEP 2: Check if there are active responsibilities to create
  let hasActiveResponsibilities = false;
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        hasActiveResponsibilities = true;
      }
    });
  });
  
  if (!hasActiveResponsibilities) {
    console.log('📋 No active responsibilities to create, cleanup only');
    return results;
  }
  
  // STEP 3: Handle role assignments without conflicts
  console.log('🔗 Step 2: Creating role assignments...');
  handleRolesAndAssignments(modeler, matrix, results);
  
  // STEP 4: Create C/A/I sequences
  console.log('📋 Step 3: Creating C/A/I sequences...');
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    
    if (!bpmnTask) return;
    
    const consultRoles = [];
    const approveRoles = [];
    const informRoles = [];
    
    Object.keys(taskRoles).forEach(roleKey => {
      const responsibility = taskRoles[roleKey];
      if (!responsibility || responsibility === '-' || responsibility === '') return;
      
      switch (responsibility) {
        case 'C': consultRoles.push(roleKey); break;
        case 'A': approveRoles.push(roleKey); break;
        case 'I': informRoles.push(roleKey); break;
      }
    });
    
    if (consultRoles.length > 0 || approveRoles.length > 0 || informRoles.length > 0) {
      createSequentialSpecialElements(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results);
    }
  });
  
  console.log('✅ Auto-mapping with cleanup completed:', results);
  return results;
}

export function executeSimpleRasciMapping(modeler, matrix) {
  if (!modeler) return { error: 'Modeler no disponible' };
  
  const elementRegistry = modeler.get('elementRegistry');
  if (!elementRegistry) return { error: 'elementRegistry no disponible' };
  
  console.log('🚀 Starting executeSimpleRasciMapping');
  console.log('📋 Matrix:', matrix);
  
  const hasSpecialElements = elementRegistry.filter(element => {
    const name = getElementName(element);
    return name && (['Consultar ', 'Aprobar ', 'Informar '].some(prefix => name.startsWith(prefix)));
  }).length > 0;
  
  console.log('🔍 Existing special elements found:', hasSpecialElements);
  
  // ALWAYS save original flow before any modifications - this is crucial for auto-mapping
  console.log('💾 Saving original flow state...');
  originalFlowMap.clear();
  saveOriginalFlow(modeler);
  console.log('✅ Original flow saved');
  
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
  
  console.log('🎯 Task mappings found:', Object.keys(taskMappings));
  
  // First pass: Create C/A/I sequences
  let sequencesCreated = 0;
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    const bpmnTask = taskMappings[taskName];
    
    if (!bpmnTask) return;
    
    const consultRoles = [];
    const approveRoles = [];
    const informRoles = [];
    
    Object.keys(taskRoles).forEach(roleKey => {
      const responsibility = taskRoles[roleKey];
      
      // Skip if responsibility is empty, null, undefined, or "-"
      if (!responsibility || responsibility === '-' || responsibility === '') {
        return;
      }
      
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
      console.log(`📋 Creating sequences for task ${taskName}: C:${consultRoles.length}, A:${approveRoles.length}, I:${informRoles.length}`);
      createSequentialSpecialElements(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results);
      sequencesCreated++;
    }
  });
  
  console.log(`🔗 Created sequences for ${sequencesCreated} tasks`);
  
  // Save flow state after sequence creation
  saveOriginalFlow(modeler);
  
  // Handle role assignments (R and S roles)
  handleRolesAndAssignments(modeler, matrix, results);
  
  // Clean up orphaned elements (but be careful not to remove valid ones)
  cleanupOrphanedElements(modeler);
  
  // FORCE cleanup of A elements specifically to ensure they're removed
  console.log('🧹 Force cleanup of A elements after mapping...');
  setTimeout(() => {
    forceCleanupAElementsEnhanced(modeler, matrix, results);
  }, 50);
  
  // Restore BPMN flow connections
  restoreBpmnFlow(modeler);
  
  // Check for direct connection restoration opportunities after matrix update
  setTimeout(() => {
    checkAllTasksForDirectConnectionRestoration(modeler);
  }, 100);
  
  // Fix any missing labels
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

// Smart mapping function that only updates role assignments without touching sequences
export function executeSmartRasciMapping(modeler, matrix) {
  if (!modeler) return { error: 'Modeler no disponible' };
  
  const elementRegistry = modeler.get('elementRegistry');
  if (!elementRegistry) return { error: 'elementRegistry no disponible' };
  
  console.log('🧠 Executing smart RASCI mapping (preserving sequences)');
  
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: 0
  };
  
  // Check if we need to preserve existing sequences
  const hasExistingSequences = elementRegistry.filter(element => {
    const name = getElementName(element);
    return name && (['Consultar ', 'Aprobar ', 'Informar '].some(prefix => name.startsWith(prefix)));
  }).length > 0;
  
  if (!hasExistingSequences) {
    // If no existing sequences, we can safely create new ones
    console.log('🧠 No existing sequences found, creating C/A/I sequences');
    
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
    
    // Also restore BPMN flow after creating sequences
    restoreBpmnFlow(modeler);
  } else {
    console.log('🧠 Existing sequences found, preserving them');
  }
  
  // Always handle role assignments (R and S)
  handleRolesAndAssignments(modeler, matrix, results);
  
  // Clean up unused roles
  cleanupUnusedRoles(modeler);
  
  // Check for direct connection restoration opportunities
  setTimeout(() => {
    checkAllTasksForDirectConnectionRestoration(modeler);
  }, 50);
  
  try {
    localStorage.setItem('previousRasciMatrixData', JSON.stringify(matrix));
  } catch (error) {
    // Handle error silently
  }
  
  console.log('🧠 Smart mapping completed:', results);
  return results;
}

function checkAllTasksForDirectConnectionRestoration(modeler) {
  if (!window.rasciMatrixData) return;
  
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    if (bpmnTask) {
      const taskRoles = window.rasciMatrixData[taskName];
      const responsibleRoles = Object.keys(taskRoles).filter(roleName => 
        taskRoles[roleName] === 'R'
      );
      const supportRoles = Object.keys(taskRoles).filter(roleName => 
        taskRoles[roleName] === 'S'
      );
      
      // If there's exactly one R role and no S roles, ensure direct connection
      if (responsibleRoles.length === 1 && supportRoles.length === 0) {
        const existingAndGate = findExistingAndGate(modeler, bpmnTask);
        if (existingAndGate) {
          const modeling = modeler.get('modeling');
          try {
            modeling.removeElements([existingAndGate]);
            console.log(`Removed unnecessary AND gate for task ${taskName}`);
          } catch (error) {
            console.error(`Error removing AND gate: ${error.message}`);
          }
        }
        
        restoreDirectConnectionIfNeeded(modeler, bpmnTask);
      }
    }
  });
}

function preserveElementLabels(modeler, matrix) {
  console.log('🔧 Preserving element labels after auto-mapping');
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  // Find all special elements that should have labels based on matrix
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      let expectedName = null;
      let expectedType = null;
      
      if (responsibility === 'C') {
        expectedName = `Consultar ${roleName}`;
        expectedType = 'bpmn:IntermediateThrowEvent';
      } else if (responsibility === 'A') {
        expectedName = `Aprobar ${roleName}`;
        expectedType = 'bpmn:UserTask';
      } else if (responsibility === 'I') {
        expectedName = `Informar ${roleName}`;
        expectedType = 'bpmn:IntermediateThrowEvent';
      }
      
      if (expectedName && expectedType) {
        // Find the element by type and name
        let element = elementRegistry.find(el => 
          el.type === expectedType && 
          el.businessObject && 
          el.businessObject.name === expectedName
        );
        
        // If not found by exact name, look for elements with missing or wrong names
        if (!element) {
          const candidateElements = elementRegistry.filter(el => 
            el.type === expectedType &&
            (!el.businessObject || !el.businessObject.name || 
             el.businessObject.name === '' || 
             el.businessObject.name === 'undefined')
          );
          
          // Try to match by position or connections
          for (const candidate of candidateElements) {
            const incomingConnections = elementRegistry.filter(conn => 
              conn.type === 'bpmn:SequenceFlow' && 
              conn.target && conn.target.id === candidate.id
            );
            
            if (incomingConnections.length > 0) {
              const sourceElement = incomingConnections[0].source;
              const sourceName = getElementName(sourceElement);
              
              if (sourceName === taskName || sourceName.includes(taskName)) {
                element = candidate;
                break;
              }
            }
          }
        }
        
        if (element) {
          try {
            if (!element.businessObject || element.businessObject.name !== expectedName) {
              modeling.updateProperties(element, { name: expectedName });
              console.log(`✅ Preserved label: ${expectedName}`);
            }
          } catch (error) {
            console.error(`❌ Error preserving label ${expectedName}: ${error.message}`);
          }
        } else {
          console.warn(`⚠️ Could not find element for label: ${expectedName}`);
        }
      }
    });
  });
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

// Add automatic mapping functionality
window.rasciAutoMapping = {
  enabled: false,
  debounceTimer: null,
  smartTimer: null,
  
  enable() {
    this.enabled = true;
    console.log('🔄 RASCI automatic mapping enabled');
    // Perform initial mapping if data is available
    if (window.bpmnModeler && window.rasciMatrixData && Object.keys(window.rasciMatrixData).length > 0) {
      console.log('📋 Performing initial auto-mapping...');
      this.triggerMapping();
    }
  },
  
  disable() {
    this.enabled = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.smartTimer) {
      clearTimeout(this.smartTimer);
      this.smartTimer = null;
    }
    console.log('🛑 RASCI automatic mapping disabled');
  },
  
  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    console.log(`🔄 Auto-mapping toggled: ${this.enabled ? 'ON' : 'OFF'}`);
    return this.enabled;
  },
  
  triggerMapping() {
    if (!this.enabled) {
      console.log('🔇 Auto-mapping disabled, skipping trigger');
      return;
    }
    
    // Clear any existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      console.log('🚀 Auto-mapping timer triggered - calling onRasciMatrixUpdated');
      
      // Simply call the matrix updated function to ensure identical behavior
      window.onRasciMatrixUpdated();
      
    }, 200); // Shorter debounce for faster response
  },
  
  triggerSmartMapping() {
    if (!this.enabled) return;
    
    // Debounce smart mapping to avoid too frequent updates
    if (this.smartTimer) {
      clearTimeout(this.smartTimer);
    }
    
    this.smartTimer = setTimeout(() => {
      if (window.bpmnModeler && window.rasciMatrixData) {
        console.log('Smart auto-mapping triggered (preserving sequences)');
        try {
          // Use the smart mapping that preserves sequences
          const results = executeSmartRasciMapping(window.bpmnModeler, window.rasciMatrixData);
          console.log('Smart mapping results:', results);
        } catch (error) {
          console.error(`Error in smart auto-mapping: ${error.message}`);
        }
      }
    }, 200); // Shorter debounce for smart mapping
  }
};

// Function to completely clean up all RASCI elements that shouldn't exist according to matrix
function completeRasciCleanup(modeler, matrix) {
  console.log('🧹 Performing complete RASCI cleanup with flow restoration...');
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // Get all roles that should be active according to current matrix
  const activeRoles = new Set();
  const expectedApprovalElements = new Set();
  const expectedConsultElements = new Set();
  const expectedInformElements = new Set();
  
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        activeRoles.add(roleName);
        
        // Build expected elements based on responsibility type
        if (responsibility === 'A') {
          expectedApprovalElements.add(`Aprobar ${roleName}`);
        } else if (responsibility === 'C') {
          expectedConsultElements.add(`Consultar ${roleName}`);
        } else if (responsibility === 'I') {
          expectedInformElements.add(`Informar ${roleName}`);
        }
      }
    });
  });
  
  console.log(`📋 Active roles: [${Array.from(activeRoles).join(', ')}]`);
  console.log(`📋 Expected A elements: [${Array.from(expectedApprovalElements).join(', ')}]`);
  console.log(`📋 Expected C elements: [${Array.from(expectedConsultElements).join(', ')}]`);
  console.log(`📋 Expected I elements: [${Array.from(expectedInformElements).join(', ')}]`);
  
  let elementsRemoved = 0;
  
  // Group special elements by parent task for proper flow restoration
  const specialElementsByParent = new Map();
  
  // Find all special elements and group them by parent task
  const allSpecialElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    (element.businessObject.name.startsWith('Aprobar ') ||
     element.businessObject.name.startsWith('Consultar ') ||
     element.businessObject.name.startsWith('Informar '))
  );
  
  allSpecialElements.forEach(element => {
    const elementName = element.businessObject.name;
    let shouldKeep = false;
    
    if (elementName.startsWith('Aprobar ')) {
      shouldKeep = expectedApprovalElements.has(elementName);
    } else if (elementName.startsWith('Consultar ')) {
      shouldKeep = expectedConsultElements.has(elementName);
    } else if (elementName.startsWith('Informar ')) {
      shouldKeep = expectedInformElements.has(elementName);
    }
    
    if (!shouldKeep) {
      // Find parent task for this element
      const incomingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
      );
      
      if (incomingConnections.length > 0) {
        let parentTask = incomingConnections[0].source;
        
        // If parent is another special element, keep looking backwards to find the real parent
        while (parentTask && parentTask.businessObject && parentTask.businessObject.name &&
               ['Aprobar ', 'Consultar ', 'Informar '].some(prefix => parentTask.businessObject.name.startsWith(prefix))) {
          const parentIncoming = elementRegistry.filter(conn => 
            conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === parentTask.id
          );
          if (parentIncoming.length > 0) {
            parentTask = parentIncoming[0].source;
          } else {
            break;
          }
        }
        
        const parentTaskName = getElementName(parentTask);
        
        if (!specialElementsByParent.has(parentTaskName)) {
          specialElementsByParent.set(parentTaskName, {
            parentTask: parentTask,
            elementsToRemove: []
          });
        }
        
        specialElementsByParent.get(parentTaskName).elementsToRemove.push(element);
      }
    }
  });
  
  // Process each parent task group for proper flow restoration
  specialElementsByParent.forEach((taskInfo, parentTaskName) => {
    console.log(`🔧 Processing cleanup for task: ${parentTaskName} (${taskInfo.elementsToRemove.length} elements to remove)`);
    
    // Find the final destination after all elements that will be removed
    let finalDestination = null;
    let currentElement = taskInfo.parentTask;
    
    // Traverse the chain to find where flow should reconnect
    const visited = new Set();
    while (currentElement && !visited.has(currentElement.id)) {
      visited.add(currentElement.id);
      
      const outgoingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === currentElement.id
      );
      
      if (outgoingConnections.length === 0) break;
      
      const nextElement = outgoingConnections[0].target;
      const nextElementName = getElementName(nextElement);
      
      // If next element is a special element that will be removed, continue
      if (taskInfo.elementsToRemove.find(el => el.id === nextElement.id)) {
        currentElement = nextElement;
        continue;
      }
      
      // If next element is a valid special element that should stay, or a regular task, this is our destination
      if (!nextElementName || !['Aprobar ', 'Consultar ', 'Informar '].some(prefix => nextElementName.startsWith(prefix))) {
        finalDestination = nextElement;
        break;
      } else {
        // It's a special element that should stay
        finalDestination = nextElement;
        break;
      }
    }
    
    // If no final destination found, check original flow
    if (!finalDestination) {
      const originalTargets = originalFlowMap.get(parentTaskName) || originalFlowMap.get(taskInfo.parentTask.id);
      if (originalTargets && originalTargets.length > 0) {
        for (const originalTarget of originalTargets) {
          const targetElement = elementRegistry.get(originalTarget.id) || 
                              elementRegistry.find(el => getElementName(el) === getElementName(originalTarget));
          if (targetElement) {
            finalDestination = targetElement;
            break;
          }
        }
      }
    }
    
    console.log(`🎯 Final destination for ${parentTaskName}: ${finalDestination ? getElementName(finalDestination) : 'none'}`);
    
    // Remove the elements
    taskInfo.elementsToRemove.forEach(element => {
      const elementName = element.businessObject.name;
      console.log(`🗑️ Removing orphaned element: ${elementName}`);
      
      try {
        // Remove role connections first
        const roleConnections = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          ((conn.source && conn.source.id === element.id) || 
           (conn.target && conn.target.id === element.id))
        );
        
        if (roleConnections.length > 0) {
          modeling.removeElements(roleConnections);
        }
        
        // Remove the element
        modeling.removeElements([element]);
        elementsRemoved++;
      } catch (error) {
        console.error(`❌ Error removing ${elementName}: ${error.message}`);
      }
    });
    
    // Reconnect parent task to final destination
    if (finalDestination) {
      setTimeout(() => {
        try {
          // Check if connection already exists
          const existingConnection = elementRegistry.find(conn => 
            conn.type === 'bpmn:SequenceFlow' &&
            conn.source && conn.source.id === taskInfo.parentTask.id &&
            conn.target && conn.target.id === finalDestination.id
          );
          
          if (!existingConnection) {
            modeling.connect(taskInfo.parentTask, finalDestination, { type: 'bpmn:SequenceFlow' });
            console.log(`✅ Reconnected flow: ${parentTaskName} -> ${getElementName(finalDestination)}`);
          } else {
            console.log(`✅ Flow already connected: ${parentTaskName} -> ${getElementName(finalDestination)}`);
          }
        } catch (reconnectError) {
          console.error(`❌ Error reconnecting flow: ${reconnectError.message}`);
        }
      }, 50);
    }
  });
  
  // Clean up orphaned roles
  setTimeout(() => {
    const allRoles = elementRegistry.filter(element => 
      element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
    );
    
    allRoles.forEach(role => {
      const roleName = role.businessObject && role.businessObject.name;
      if (roleName && !activeRoles.has(roleName)) {
        console.log(`🗑️ Removing orphaned role: ${roleName}`);
        try {
          // Remove all connections to this role first
          const roleConnections = elementRegistry.filter(conn => 
            (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
            ((conn.source && conn.source.id === role.id) || 
             (conn.target && conn.target.id === role.id))
          );
          
          if (roleConnections.length > 0) {
            modeling.removeElements(roleConnections);
          }
          
          modeling.removeElements([role]);
          elementsRemoved++;
        } catch (error) {
          console.error(`❌ Error removing role ${roleName}: ${error.message}`);
        }
      }
    });
  }, 100);
  
  console.log(`✅ Complete RASCI cleanup finished: ${elementsRemoved} elements removed`);
  return elementsRemoved;
}

// Function to be called when RASCI matrix is updated
window.onRasciMatrixUpdated = function() {
  console.log('📋 RASCI matrix update detected');
  
  if (!window.rasciAutoMapping || !window.rasciAutoMapping.enabled) {
    console.log('� Auto-mapping is disabled, skipping update');
    return;
  }
  
  if (!window.bpmnModeler) {
    console.warn('⚠️ No BPMN modeler available');
    return;
  }
  
  if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
    console.warn('⚠️ No RASCI matrix data available');
    return;
  }
  
  // Check if the matrix has any actual responsibilities (not just "-" values)
  let hasActiveResponsibilities = false;
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        hasActiveResponsibilities = true;
      }
    });
  });
  
  if (!hasActiveResponsibilities) {
    console.log('📋 Matrix only contains "-" values or empty cells, performing complete cleanup...');
    
    // Use complete cleanup when matrix is empty or has only "-" values
    try {
      const elementsRemoved = completeRasciCleanup(window.bpmnModeler, window.rasciMatrixData);
      console.log(`✅ Complete cleanup finished: ${elementsRemoved} elements removed`);
    } catch (error) {
      console.error('❌ Error during complete cleanup:', error.message);
    }
    return;
  }
  
  console.log('� Executing auto-mapping...');
  console.log('📊 Current matrix data:', window.rasciMatrixData);
  
  try {
    // Clear any existing timers first
    if (window.rasciAutoMapping.debounceTimer) {
      clearTimeout(window.rasciAutoMapping.debounceTimer);
    }
    
    // FIRST: Perform complete cleanup to ensure consistency
    console.log('🧹 Phase 1: Complete cleanup before mapping...');
    const cleanupResults = completeRasciCleanup(window.bpmnModeler, window.rasciMatrixData);
    console.log(`✅ Cleanup phase completed: ${cleanupResults} elements removed`);
    
    // SECOND: Execute the mapping
    console.log('� Phase 2: Auto-mapping using IDENTICAL logic as manual mapping');
    const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
    console.log('✅ Auto-mapping completed with results:', results);
    
    // No additional processing that could interfere with the manual logic
    // The executeSimpleRasciMapping function handles everything including flow restoration
    
  } catch (error) {
    console.error('❌ Error in auto-mapping:', error.message);
    console.error('🔍 Error details:', error);
    
    // Recovery: try direct sync
    setTimeout(() => {
      console.log('🔄 Attempting recovery sync...');
      try {
        window.syncRasciConnections();
      } catch (recoveryError) {
        console.error('❌ Recovery sync also failed:', recoveryError.message);
      }
    }, 500);
  }
};

window.executeRasciToRalphMapping = function() {
  if (!window.bpmnModeler) {
    console.error('BPMN Modeler no disponible. Asegúrate de tener un diagrama BPMN abierto.');
    return;
  }

  if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
    console.error('No hay datos en la matriz RASCI para mapear. Primero agrega algunos roles en la matriz.');
    return;
  }
  
  console.log('🚀 Manual mapping triggered');
  console.log('📋 Current matrix data:', window.rasciMatrixData);
  
  try {
    const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
    console.log('✅ Manual mapping completed:', results);
  } catch (error) {
    console.error(`❌ Error in manual mapping: ${error.message}`);
  }
};

// Add a test function to debug the auto-mapping
window.testAutoMapping = function() {
  console.log('🧪 Testing auto-mapping functionality');
  console.log('🔍 Auto-mapping enabled:', window.rasciAutoMapping && window.rasciAutoMapping.enabled);
  console.log('📋 Matrix data available:', !!window.rasciMatrixData);
  console.log('🖥️ Modeler available:', !!window.bpmnModeler);
  
  if (window.rasciMatrixData) {
    console.log('📊 Current matrix:', window.rasciMatrixData);
    console.log('📊 Matrix has tasks:', Object.keys(window.rasciMatrixData).length);
  }
  
  if (window.bpmnModeler) {
    const elementRegistry = window.bpmnModeler.get('elementRegistry');
    if (elementRegistry) {
      const tasks = elementRegistry.filter(element => 
        element.type === 'bpmn:Task' && element.businessObject && element.businessObject.name
      );
      console.log('🎯 BPMN tasks found:', tasks.map(t => t.businessObject.name));
      
      const specialElements = elementRegistry.filter(element => {
        const name = getElementName(element);
        return name && ['Consultar ', 'Aprobar ', 'Informar '].some(prefix => name.startsWith(prefix));
      });
      console.log('⭐ Special elements found:', specialElements.length);
    }
  }
  
  if (window.rasciAutoMapping && window.rasciAutoMapping.enabled) {
    console.log('🔄 Triggering auto-mapping manually...');
    window.onRasciMatrixUpdated();
  } else {
    console.log('❌ Auto-mapping is disabled or not available');
  }
  
  // Also test direct mapping execution
  console.log('🔧 Testing direct mapping execution...');
  if (window.bpmnModeler && window.rasciMatrixData) {
    try {
      const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
      console.log('✅ Direct mapping test completed:', results);
    } catch (error) {
      console.error('❌ Direct mapping test failed:', error.message);
    }
  }
};

// Simple test for A element creation and deletion
window.testAElementLifecycle = function() {
  console.log('🧪 Testing A element lifecycle (creation and deletion)');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  console.log('📊 === INITIAL STATE ===');
  const initialApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  console.log(`Current approval elements: ${initialApprovalElements.length}`);
  initialApprovalElements.forEach(element => {
    console.log(`  - ${element.businessObject.name} (${element.type})`);
  });
  
  // Show current matrix
  console.log('📋 Current matrix A responsibilities:');
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      if (taskRoles[roleName] === 'A') {
        console.log(`  - Task: ${taskName}, Role: ${roleName} -> A`);
      }
    });
  });
  
  // Run complete auto-mapping
  console.log('🚀 Running complete auto-mapping...');
  window.onRasciMatrixUpdated();
  
  // Check final state
  setTimeout(() => {
    console.log('📊 === FINAL STATE ===');
    const finalApprovalElements = elementRegistry.filter(element => 
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    console.log(`Final approval elements: ${finalApprovalElements.length}`);
    finalApprovalElements.forEach(element => {
      console.log(`  - ${element.businessObject.name} (${element.type})`);
    });
    
    // Verify correctness
    const expectedCount = Object.keys(window.rasciMatrixData).reduce((count, taskName) => {
      const taskRoles = window.rasciMatrixData[taskName];
      return count + Object.keys(taskRoles).filter(role => taskRoles[role] === 'A').length;
    }, 0);
    
    console.log(`📋 Expected A elements: ${expectedCount}`);
    console.log(`📊 Actual A elements: ${finalApprovalElements.length}`);
    
    const isCorrect = finalApprovalElements.length === expectedCount;
    console.log(`✅ A element lifecycle working correctly: ${isCorrect}`);
    
    if (!isCorrect) {
      console.error('❌ A element lifecycle has issues');
      console.log('🔧 Running additional cleanup...');
      window.testAElementDeletion();
    } else {
      console.log('🎉 A element lifecycle working PERFECTLY!');
    }
    
  }, 500);
};

// Test specifically the deletion of A elements
window.testAElementDeletion = function() {
  console.log('🧪 Testing A element deletion specifically');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  // Show current approval elements
  const currentApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`📊 Current approval elements: ${currentApprovalElements.length}`);
  currentApprovalElements.forEach(element => {
    console.log(`  - ${element.businessObject.name} (${element.type})`);
  });
  
  // Show what should exist according to matrix
  const expectedApprovalElements = new Set();
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        expectedApprovalElements.add(`Aprobar ${roleName}`);
      }
    });
  });
  
  console.log(`📋 Expected approval elements: [${Array.from(expectedApprovalElements).join(', ')}]`);
  
  // Test force cleanup
  console.log('🧹 Testing force cleanup of A elements...');
  
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: 0
  };
  
  forceCleanupAElements(window.bpmnModeler, window.rasciMatrixData, results);
  
  // Show results after cleanup
  setTimeout(() => {
    console.log(`✅ Cleanup results: ${results.elementsRemoved} elements removed`);
    
    const approvalElementsAfter = elementRegistry.filter(element => 
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    
    console.log(`📊 Approval elements after cleanup: ${approvalElementsAfter.length}`);
    approvalElementsAfter.forEach(element => {
      console.log(`  - ${element.businessObject.name} (${element.type})`);
    });
    
    // Verify correctness
    const correct = approvalElementsAfter.every(element => 
      expectedApprovalElements.has(element.businessObject.name)
    ) && approvalElementsAfter.length === expectedApprovalElements.size;
    
    console.log(`✅ A element deletion working correctly: ${correct}`);
    
    if (!correct) {
      console.error('❌ A element deletion has issues - some elements not properly removed');
    } else {
      console.log('🎉 A element deletion working PERFECTLY!');
    }
    
  }, 100);
};

// Force cleanup of only A elements specifically
window.forceAElementsCleanup = function() {
  console.log('🧹 Forcing cleanup of A elements specifically...');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return false;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const modeling = window.bpmnModeler.get('modeling');
  
  // Get all approval elements
  const allApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`🔍 Found ${allApprovalElements.length} approval elements in diagram`);
  
  // Determine which approval elements should exist
  const expectedApprovalElements = new Set();
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        expectedApprovalElements.add(`Aprobar ${roleName}`);
      }
    });
  });
  
  console.log(`📋 Expected approval elements: [${Array.from(expectedApprovalElements).join(', ')}]`);
  
  // Find and remove orphaned approval elements
  const orphanedApprovalElements = allApprovalElements.filter(element => {
    const elementName = element.businessObject.name;
    return !expectedApprovalElements.has(elementName);
  });
  
  console.log(`🗑️ Found ${orphanedApprovalElements.length} orphaned approval elements to remove`);
  
  orphanedApprovalElements.forEach(element => {
    const elementName = element.businessObject.name;
    console.log(`🗑️ Removing orphaned approval element: ${elementName} (${element.type})`);
    
    try {
      // Remove connections first
      const connections = elementRegistry.filter(conn => 
        (conn.source && conn.source.id === element.id) ||
        (conn.target && conn.target.id === element.id)
      );
      
      if (connections.length > 0) {
        modeling.removeElements(connections);
      }
      
      // Then remove the element
      modeling.removeElements([element]);
      
      console.log(`✅ Successfully removed: ${elementName}`);
    } catch (error) {
      console.error(`❌ Error removing ${elementName}: ${error.message}`);
    }
  });
  
  // Also clean up any orphaned roles related to A responsibilities
  const allRoles = elementRegistry.filter(element => 
    element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
  );
  
  const activeRoles = new Set();
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        activeRoles.add(roleName);
      }
    });
  });
  
  const orphanedRoles = allRoles.filter(role => {
    const roleName = role.businessObject && role.businessObject.name;
    return roleName && !activeRoles.has(roleName);
  });
  
  console.log(`🗑️ Found ${orphanedRoles.length} orphaned roles to remove`);
  
  orphanedRoles.forEach(role => {
    const roleName = role.businessObject.name;
    console.log(`🗑️ Removing orphaned role: ${roleName}`);
    
    try {
      // Remove role connections first
      const roleConnections = elementRegistry.filter(conn => 
        (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
        ((conn.source && conn.source.id === role.id) || 
         (conn.target && conn.target.id === role.id))
      );
      
      if (roleConnections.length > 0) {
        modeling.removeElements(roleConnections);
      }
      
      modeling.removeElements([role]);
      console.log(`✅ Successfully removed role: ${roleName}`);
    } catch (error) {
      console.error(`❌ Error removing role ${roleName}: ${error.message}`);
    }
  });
  
  console.log('✅ A elements cleanup completed');
  return true;
};

// Complete function to test A role cleanup in auto-mapping
window.testCompleteACleanup = function() {
  console.log('🧪 Testing COMPLETE A role cleanup in auto-mapping');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  console.log('📊 === BEFORE CLEANUP ===');
  
  // Show current state
  const allApprovalTasks = elementRegistry.filter(element => 
    element.type === 'bpmn:UserTask' && 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  const allApprovalEvents = elementRegistry.filter(element => 
    (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:UserTask') &&
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  const allRoles = elementRegistry.filter(element => 
    element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
  );
  
  console.log(`📊 Current approval tasks (UserTask): ${allApprovalTasks.length}`);
  allApprovalTasks.forEach(task => console.log(`  - ${task.businessObject.name}`));
  
  console.log(`📊 Current approval elements (all types): ${allApprovalEvents.length}`);
  allApprovalEvents.forEach(element => console.log(`  - ${element.businessObject.name} (${element.type})`));
  
  console.log(`📊 Current roles: ${allRoles.length}`);
  allRoles.forEach(role => {
    const roleName = role.businessObject && role.businessObject.name;
    console.log(`  - ${roleName}`);
  });
  
  // Show what should exist according to matrix
  const expectedApprovalTasks = new Set();
  const expectedApprovalEvents = new Set();
  const expectedRoles = new Set();
  
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        expectedRoles.add(roleName);
        
        if (responsibility === 'A') {
          expectedApprovalTasks.add(`Aprobar ${roleName}`);
          expectedApprovalEvents.add(`Aprobar ${roleName}`);
        }
      }
    });
  });
  
  console.log(`📋 Expected approval tasks: [${Array.from(expectedApprovalTasks).join(', ')}]`);
  console.log(`📋 Expected roles: [${Array.from(expectedRoles).join(', ')}]`);
  
  // Run complete auto-mapping
  console.log('🚀 Running complete auto-mapping...');
  
  try {
    const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
    console.log('✅ Auto-mapping completed with results:', results);
  } catch (error) {
    console.error('❌ Auto-mapping failed:', error.message);
  }
  
  // Show state after auto-mapping
  setTimeout(() => {
    console.log('📊 === AFTER AUTO-MAPPING ===');
    
    const approvalTasksAfter = elementRegistry.filter(element => 
      element.type === 'bpmn:UserTask' && 
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    
    const approvalEventsAfter = elementRegistry.filter(element => 
      (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:UserTask') &&
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    
    const rolesAfter = elementRegistry.filter(element => 
      element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
    );
    
    console.log(`📊 Approval tasks after cleanup: ${approvalTasksAfter.length}`);
    approvalTasksAfter.forEach(task => console.log(`  - ${task.businessObject.name}`));
    
    console.log(`📊 Approval elements after cleanup: ${approvalEventsAfter.length}`);
    approvalEventsAfter.forEach(element => console.log(`  - ${element.businessObject.name} (${element.type})`));
    
    console.log(`📊 Roles after cleanup: ${rolesAfter.length}`);
    rolesAfter.forEach(role => {
      const roleName = role.businessObject && role.businessObject.name;
      console.log(`  - ${roleName}`);
    });
    
    // Verify correctness
    const correctApprovalTasks = approvalTasksAfter.every(task => 
      expectedApprovalTasks.has(task.businessObject.name)
    ) && expectedApprovalTasks.size === approvalTasksAfter.length;
    
    const correctRoles = rolesAfter.every(role => {
      const roleName = role.businessObject && role.businessObject.name;
      return roleName && expectedRoles.has(roleName);
    });
    
    console.log(`✅ Approval tasks cleanup correct: ${correctApprovalTasks}`);
    console.log(`✅ Roles cleanup correct: ${correctRoles}`);
    
    if (correctApprovalTasks && correctRoles) {
      console.log('🎉 A role cleanup working PERFECTLY!');
    } else {
      console.error('❌ A role cleanup has issues');
    }
    
  }, 300);
};

// Test function to simulate A role deletion from RASCI matrix
window.testARoleDeletionFromMatrix = function() {
  console.log('🧪 Testing A role deletion from RASCI matrix simulation');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  console.log('📊 === BEFORE A ROLE DELETION ===');
  
  // Show current state
  const currentApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  const currentRoles = elementRegistry.filter(element => 
    element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
  );
  
  console.log(`📊 Current approval elements: ${currentApprovalElements.length}`);
  currentApprovalElements.forEach(element => {
    console.log(`  - ${element.businessObject.name} (${element.type})`);
  });
  
  console.log(`📊 Current roles: ${currentRoles.length}`);
  currentRoles.forEach(role => {
    const roleName = role.businessObject && role.businessObject.name;
    console.log(`  - ${roleName}`);
  });
  
  // Show current A responsibilities in matrix
  console.log('📋 Current A responsibilities in matrix:');
  const currentAResponsibilities = [];
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        currentAResponsibilities.push({ task: taskName, role: roleName });
        console.log(`  - Task: ${taskName}, Role: ${roleName} -> A`);
      }
    });
  });
  
  if (currentAResponsibilities.length === 0) {
    console.log('⚠️ No A responsibilities found in current matrix');
    return;
  }
  
  // Simulate removing first A responsibility by setting it to "-"
  const firstAResponsibility = currentAResponsibilities[0];
  const originalValue = window.rasciMatrixData[firstAResponsibility.task][firstAResponsibility.role];
  
  console.log(`🔧 Simulating removal of A responsibility: Task "${firstAResponsibility.task}", Role "${firstAResponsibility.role}"`);
  console.log(`🔧 Changing value from "${originalValue}" to "-"`);
  
  // Temporarily change the matrix value
  window.rasciMatrixData[firstAResponsibility.task][firstAResponsibility.role] = '-';
  
  console.log('📋 Updated matrix data:', window.rasciMatrixData);
  
  // Use the complete cleanup function
  console.log('🧹 Running complete RASCI cleanup with updated matrix...');
  const cleanupResults = completeRasciCleanup(window.bpmnModeler, window.rasciMatrixData);
  console.log(`✅ Cleanup completed: ${cleanupResults} elements removed`);
  
  // Show state after cleanup
  setTimeout(() => {
    console.log('📊 === AFTER A ROLE DELETION ===');
    
    const approvalElementsAfter = elementRegistry.filter(element => 
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    
    const rolesAfter = elementRegistry.filter(element => 
      element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
    );
    
    console.log(`📊 Approval elements after cleanup: ${approvalElementsAfter.length}`);
    approvalElementsAfter.forEach(element => {
      console.log(`  - ${element.businessObject.name} (${element.type})`);
    });
    
    console.log(`📊 Roles after cleanup: ${rolesAfter.length}`);
    rolesAfter.forEach(role => {
      const roleName = role.businessObject && role.businessObject.name;
      console.log(`  - ${roleName}`);
    });
    
    // Check if the specific A element and role were removed
    const expectedApprovalName = `Aprobar ${firstAResponsibility.role}`;
    const approvalElementRemoved = !approvalElementsAfter.some(element => 
      element.businessObject.name === expectedApprovalName
    );
    
    // Check if role was removed (only if not used elsewhere)
    const activeRoles = new Set();
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        if (responsibility && responsibility !== '-' && responsibility !== '') {
          activeRoles.add(roleName);
        }
      });
    });
    
    const shouldRoleExist = activeRoles.has(firstAResponsibility.role);
    const roleExists = rolesAfter.some(role => 
      role.businessObject && role.businessObject.name === firstAResponsibility.role
    );
    
    console.log(`✅ Approval element "${expectedApprovalName}" removed: ${approvalElementRemoved}`);
    console.log(`✅ Role "${firstAResponsibility.role}" should exist: ${shouldRoleExist}, exists: ${roleExists}`);
    
    const correctCleanup = approvalElementRemoved && (shouldRoleExist === roleExists);
    console.log(`🎉 A role deletion from matrix working correctly: ${correctCleanup}`);
    
    if (correctCleanup) {
      console.log('✅ A role deletion test PASSED!');
    } else {
      console.error('❌ A role deletion test FAILED!');
      console.error(`  - Expected approval element removed: ${approvalElementRemoved}`);
      console.error(`  - Role management correct: ${shouldRoleExist === roleExists}`);
    }
    
    // Restore original value for further testing
    console.log(`🔄 Restoring original matrix value: "${originalValue}"`);
    window.rasciMatrixData[firstAResponsibility.task][firstAResponsibility.role] = originalValue;
    
  }, 200);
};

// Test function to verify complete auto-mapping with A role deletion
window.testCompleteAutoMappingWithADeletion = function() {
  console.log('🧪 Testing COMPLETE auto-mapping with A role deletion');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return;
  }
  
  if (!window.rasciAutoMapping) {
    console.error('❌ Auto-mapping not available');
    return;
  }
  
  console.log('🔧 Enabling auto-mapping for test...');
  window.rasciAutoMapping.enabled = true;
  
  console.log('📊 === INITIAL STATE ===');
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  const initialApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`📊 Initial approval elements: ${initialApprovalElements.length}`);
  initialApprovalElements.forEach(element => {
    console.log(`  - ${element.businessObject.name}`);
  });
  
  // Show current A responsibilities
  const currentAResponsibilities = [];
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        currentAResponsibilities.push({ task: taskName, role: roleName });
      }
    });
  });
  
  console.log(`📋 Current A responsibilities: ${currentAResponsibilities.length}`);
  currentAResponsibilities.forEach(resp => {
    console.log(`  - Task: ${resp.task}, Role: ${resp.role}`);
  });
  
  if (currentAResponsibilities.length === 0) {
    console.log('⚠️ No A responsibilities to test deletion');
    return;
  }
  
  // Pick the first A responsibility to remove
  const responsibilityToRemove = currentAResponsibilities[0];
  const originalValue = window.rasciMatrixData[responsibilityToRemove.task][responsibilityToRemove.role];
  
  console.log(`🔧 === SIMULATING A ROLE DELETION ===`);
  console.log(`🔧 Removing A responsibility: Task "${responsibilityToRemove.task}", Role "${responsibilityToRemove.role}"`);
  
  // Change the matrix value to simulate deletion
  window.rasciMatrixData[responsibilityToRemove.task][responsibilityToRemove.role] = '-';
  
  console.log('🚀 Triggering auto-mapping with updated matrix...');
  
  // Trigger auto-mapping (this should detect the change and clean up)
  window.onRasciMatrixUpdated();
  
  // Check results after auto-mapping
  setTimeout(() => {
    console.log('📊 === AFTER AUTO-MAPPING ===');
    
    const approvalElementsAfter = elementRegistry.filter(element => 
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    
    const rolesAfter = elementRegistry.filter(element => 
      element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
    );
    
    console.log(`📊 Approval elements after auto-mapping: ${approvalElementsAfter.length}`);
    approvalElementsAfter.forEach(element => {
      console.log(`  - ${element.businessObject.name}`);
    });
    
    console.log(`📊 Roles after auto-mapping: ${rolesAfter.length}`);
    rolesAfter.forEach(role => {
      const roleName = role.businessObject && role.businessObject.name;
      console.log(`  - ${roleName}`);
    });
    
    // Verify that the specific approval element was removed
    const expectedApprovalName = `Aprobar ${responsibilityToRemove.role}`;
    const approvalElementRemoved = !approvalElementsAfter.some(element => 
      element.businessObject.name === expectedApprovalName
    );
    
    // Check if role should still exist
    const activeRoles = new Set();
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        if (responsibility && responsibility !== '-' && responsibility !== '') {
          activeRoles.add(roleName);
        }
      });
    });
    
    const shouldRoleExist = activeRoles.has(responsibilityToRemove.role);
    const roleExists = rolesAfter.some(role => 
      role.businessObject && role.businessObject.name === responsibilityToRemove.role
    );
    
    console.log(`📋 Expected results:`);
    console.log(`  - Approval element "${expectedApprovalName}" should be removed: ${!approvalElementRemoved ? '❌' : '✅'}`);
    console.log(`  - Role "${responsibilityToRemove.role}" should exist: ${shouldRoleExist}, actually exists: ${roleExists} ${shouldRoleExist === roleExists ? '✅' : '❌'}`);
    
    const testPassed = approvalElementRemoved && (shouldRoleExist === roleExists);
    
    if (testPassed) {
      console.log('🎉 COMPLETE auto-mapping with A deletion test PASSED!');
      console.log('✅ Auto-mapping correctly handles A role deletion from matrix');
    } else {
      console.error('❌ COMPLETE auto-mapping with A deletion test FAILED!');
      console.error('❌ Auto-mapping does not correctly handle A role deletion from matrix');
    }
    
    // Restore original value
    console.log(`🔄 Restoring original matrix value for "${responsibilityToRemove.task}" -> "${responsibilityToRemove.role}": "${originalValue}"`);
    window.rasciMatrixData[responsibilityToRemove.task][responsibilityToRemove.role] = originalValue;
    
    // Trigger auto-mapping again to restore the element
    setTimeout(() => {
      console.log('🔄 Triggering auto-mapping to restore elements...');
      window.onRasciMatrixUpdated();
    }, 100);
    
  }, 500);
};

// Quick test function specifically for user's issue: A role deletion from RASCI matrix
// FUNCIÓN PARA SOLUCIONAR EL PROBLEMA DEL USUARIO
// Ejecuta auto-mapping con limpieza agresiva específicamente para A roles
window.fixAElementDeletionFromMatrix = function() {
  console.log('🚨 FIXING: A element deletion from RASCI matrix');
  console.log('🚨 Problem: Elements A not being deleted when changed to "-" in matrix');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return false;
  }
  
  console.log('📊 Current matrix state:');
  console.log(JSON.stringify(window.rasciMatrixData, null, 2));
  
  // Use the specialized auto-mapping function
  console.log('🔧 Using aggressive cleanup auto-mapping...');
  const results = executeAutoMappingWithCleanup(window.bpmnModeler, window.rasciMatrixData);
  
  console.log('✅ A element deletion fix completed with results:', results);
  
  // Show final state
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const finalAElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`📊 Final A elements in canvas: ${finalAElements.length}`);
  finalAElements.forEach(element => {
    console.log(`  - ${element.businessObject.name}`);
  });
  
  // Verify against matrix
  const expectedAElements = [];
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        expectedAElements.push(`Aprobar ${roleName}`);
      }
    });
  });
  
  console.log(`📋 Expected A elements from matrix: ${expectedAElements.length}`);
  expectedAElements.forEach(name => console.log(`  - ${name}`));
  
  const isCorrect = finalAElements.length === expectedAElements.length && 
                    finalAElements.every(element => expectedAElements.includes(element.businessObject.name));
  
  if (isCorrect) {
    console.log('🎉 SUCCESS: A element deletion from matrix is now working correctly!');
  } else {
    console.error('❌ STILL FAILING: A element deletion from matrix not working correctly');
  }
  
  return isCorrect;
};

// Función temporal para arreglar inmediatamente el problema de eliminación de A
window.fixADeletionNow = function() {
  console.log('🔧 FIXING A deletion issue immediately...');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return false;
  }
  
  try {
    // Override onRasciMatrixUpdated temporarily
    window.onRasciMatrixUpdated = function() {
      console.log('📋 FIXED: RASCI matrix update detected - using aggressive cleanup');
      
      if (!window.rasciAutoMapping || !window.rasciAutoMapping.enabled) {
        console.log('🔲 Auto-mapping is disabled, skipping update');
        return;
      }
      
      if (!window.bpmnModeler) {
        console.warn('⚠️ No BPMN modeler available');
        return;
      }
      
      if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
        console.warn('⚠️ No RASCI matrix data available');
        return;
      }
      
      // Check if the matrix has any actual responsibilities
      let hasActiveResponsibilities = false;
      Object.keys(window.rasciMatrixData).forEach(taskName => {
        const taskRoles = window.rasciMatrixData[taskName];
        Object.keys(taskRoles).forEach(roleName => {
          const responsibility = taskRoles[roleName];
          if (responsibility && responsibility !== '-' && responsibility !== '') {
            hasActiveResponsibilities = true;
          }
        });
      });
      
      if (!hasActiveResponsibilities) {
        console.log('📋 Matrix only contains "-" values, performing complete cleanup...');
        try {
          const elementsRemoved = completeRasciCleanup(window.bpmnModeler, window.rasciMatrixData);
          console.log(`✅ Complete cleanup finished: ${elementsRemoved} elements removed`);
        } catch (error) {
          console.error('❌ Error during complete cleanup:', error.message);
        }
        return;
      }
      
      console.log('🔄 FIXED: Using specialized auto-mapping with aggressive cleanup...');
      console.log('📊 Current matrix data:', window.rasciMatrixData);
      
      try {
        // Use the specialized function that handles A deletion correctly
        const results = executeAutoMappingWithCleanup(window.bpmnModeler, window.rasciMatrixData);
        console.log('✅ FIXED: Specialized auto-mapping completed:', results);
        
      } catch (error) {
        console.error('❌ Error in specialized auto-mapping:', error.message);
        console.error('🔍 Error details:', error);
        
        // Recovery
        setTimeout(() => {
          console.log('🔄 Attempting recovery sync...');
          try {
            window.syncRasciConnections();
          } catch (recoveryError) {
            console.error('❌ Recovery sync also failed:', recoveryError.message);
          }
        }, 300);
      }
    };
    
    console.log('✅ Fixed onRasciMatrixUpdated function to use aggressive A deletion');
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing A deletion:', error.message);
    return false;
  }
};

// Función para forzar que el auto-mapeo use SIEMPRE la función especializada
window.permanentlyFixAutoMapping = function() {
  console.log('🔧 ARREGLO PERMANENTE: Configurando auto-mapeo para usar función especializada...');
  
  // Sobrescribir definitivamente onRasciMatrixUpdated
  window.onRasciMatrixUpdated = function() {
    console.log('📋 RASCI matrix update detected (USING SPECIALIZED FUNCTION)');
    
    if (!window.rasciAutoMapping || !window.rasciAutoMapping.enabled) {
      console.log('🔲 Auto-mapping is disabled, skipping update');
      return;
    }
    
    if (!window.bpmnModeler) {
      console.warn('⚠️ No BPMN modeler available');
      return;
    }
    
    if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
      console.warn('⚠️ No RASCI matrix data available');
      return;
    }
    
    // Verificar si la matriz tiene responsabilidades activas
    let hasActiveResponsibilities = false;
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        if (responsibility && responsibility !== '-' && responsibility !== '') {
          hasActiveResponsibilities = true;
        }
      });
    });
    
    if (!hasActiveResponsibilities) {
      console.log('📋 Matrix only contains "-" values, performing complete cleanup...');
      try {
        const elementsRemoved = completeRasciCleanup(window.bpmnModeler, window.rasciMatrixData);
        console.log(`✅ Complete cleanup finished: ${elementsRemoved} elements removed`);
      } catch (error) {
        console.error('❌ Error during complete cleanup:', error.message);
      }
      return;
    }
    
    console.log('🔄 SPECIALIZED: Using executeAutoMappingWithCleanup...');
    console.log('📊 Current matrix data:', window.rasciMatrixData);
    
    try {
      // USAR SIEMPRE la función especializada
      const results = executeAutoMappingWithCleanup(window.bpmnModeler, window.rasciMatrixData);
      console.log('✅ SPECIALIZED: Auto-mapping completed:', results);
      
      // Forzar limpieza adicional de elementos A si es necesario
      setTimeout(() => {
        window.forceDeleteOrphanedAElements();
      }, 200);
      
    } catch (error) {
      console.error('❌ Error in specialized auto-mapping:', error.message);
      console.error('🔍 Error details:', error);
    }
  };
  
  // También configurar los triggers para usar la función especializada
  if (window.rasciAutoMapping) {
    window.rasciAutoMapping.triggerMapping = function() {
      if (!this.enabled) return;
      
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        console.log('🚀 SPECIALIZED trigger: Auto-mapping...');
        window.onRasciMatrixUpdated();
      }, 200);
    };
    
    console.log('✅ Auto-mapping triggers también configurados para función especializada');
  }
  
  console.log('✅ Auto-mapeo configurado PERMANENTEMENTE para usar función especializada');
  console.log('🔄 Ejecutando auto-mapeo una vez para probar...');
  
  // Ejecutar una vez para probar
  if (window.rasciMatrixData && Object.keys(window.rasciMatrixData).length > 0) {
    window.onRasciMatrixUpdated();
  }
  
  return true;
};

// Función ultra-agresiva para eliminar elementos A huérfanos
window.forceDeleteOrphanedAElements = function() {
  console.log('💥 FUERZA BRUTA: Eliminando elementos A huérfanos...');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return false;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const modeling = window.bpmnModeler.get('modeling');
  
  // Obtener elementos A esperados según la matriz actual
  const expectedAElements = new Set();
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        expectedAElements.add(`Aprobar ${roleName}`);
      }
    });
  });
  
  console.log(`📋 Elementos A esperados: [${Array.from(expectedAElements).join(', ')}]`);
  
  // Encontrar TODOS los elementos A en el canvas
  const allAElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`🔍 Elementos A encontrados en canvas: ${allAElements.length}`);
  allAElements.forEach(element => {
    console.log(`  - ${element.businessObject.name} (${element.type}) - ID: ${element.id}`);
  });
  
  // Eliminar elementos A que NO deberían existir
  const elementsToDelete = [];
  const rolesToCheck = new Set();
  
  allAElements.forEach(element => {
    const elementName = element.businessObject.name;
    
    if (!expectedAElements.has(elementName)) {
      console.log(`🗑️ MARCANDO PARA ELIMINACIÓN: ${elementName}`);
      elementsToDelete.push(element);
      
      // Extraer el nombre del rol para verificar después
      const roleName = elementName.replace('Aprobar ', '');
      rolesToCheck.add(roleName);
    } else {
      console.log(`✅ MANTENER: ${elementName} (está en la matriz)`);
    }
  });
  
  if (elementsToDelete.length === 0) {
    console.log('✅ No hay elementos A huérfanos para eliminar');
    return true;
  }
  
  console.log(`💥 ELIMINANDO ${elementsToDelete.length} elementos A huérfanos...`);
  
  // Eliminar cada elemento individualmente con reconexión de flujo
  elementsToDelete.forEach(element => {
    const elementName = element.businessObject.name;
    console.log(`🗑️ Eliminando: ${elementName}`);
    
    try {
      // Obtener conexiones antes de eliminar
      const incomingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && 
        conn.target && conn.target.id === element.id
      );
      
      const outgoingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && 
        conn.source && conn.source.id === element.id
      );
      
      // Eliminar conexiones de roles primero
      const roleConnections = elementRegistry.filter(conn => 
        (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
        ((conn.source && conn.source.id === element.id) || 
         (conn.target && conn.target.id === element.id))
      );
      
      if (roleConnections.length > 0) {
        console.log(`  🗑️ Eliminando ${roleConnections.length} conexiones de roles`);
        modeling.removeElements(roleConnections);
      }
      
      // Eliminar el elemento
      modeling.removeElements([element]);
      console.log(`  ✅ Elemento eliminado: ${elementName}`);
      
      // Reconectar flujo si es necesario
      if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
        const sourceElement = incomingConnections[0].source;
        const targetElement = outgoingConnections[0].target;
        
        // Verificar si ya existe una conexión directa
        const existingDirectConnection = elementRegistry.find(conn => 
          conn.type === 'bpmn:SequenceFlow' &&
          conn.source && conn.source.id === sourceElement.id &&
          conn.target && conn.target.id === targetElement.id
        );
        
        if (!existingDirectConnection) {
          setTimeout(() => {
            try {
              modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
              console.log(`  🔗 Flujo reconectado: ${getElementName(sourceElement)} -> ${getElementName(targetElement)}`);
            } catch (reconnectError) {
              console.error(`  ❌ Error reconectando flujo: ${reconnectError.message}`);
            }
          }, 50);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error eliminando ${elementName}: ${error.message}`);
    }
  });
  
  // Verificar y eliminar roles huérfanos
  setTimeout(() => {
    console.log('🧹 Verificando roles huérfanos...');
    
    // Obtener roles activos según la matriz actual
    const activeRoles = new Set();
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        if (responsibility && responsibility !== '-' && responsibility !== '') {
          activeRoles.add(roleName);
        }
      });
    });
    
    console.log(`📋 Roles activos según matriz: [${Array.from(activeRoles).join(', ')}]`);
    
    // Verificar cada rol que estaba asociado con elementos A eliminados
    rolesToCheck.forEach(roleName => {
      if (!activeRoles.has(roleName)) {
        const roleElement = elementRegistry.find(element => 
          (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
          element.businessObject && element.businessObject.name === roleName
        );
        
        if (roleElement) {
          console.log(`🗑️ Eliminando rol huérfano: ${roleName}`);
          
          try {
            // Eliminar todas las conexiones del rol primero
            const roleConnections = elementRegistry.filter(conn => 
              (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
              ((conn.source && conn.source.id === roleElement.id) || 
               (conn.target && conn.target.id === roleElement.id))
            );
            
            if (roleConnections.length > 0) {
              modeling.removeElements(roleConnections);
              console.log(`  🗑️ Eliminadas ${roleConnections.length} conexiones del rol`);
            }
            
            // Eliminar el rol
            modeling.removeElements([roleElement]);
            console.log(`  ✅ Rol eliminado: ${roleName}`);
            
          } catch (error) {
            console.error(`❌ Error eliminando rol ${roleName}: ${error.message}`);
          }
        }
      } else {
        console.log(`✅ Rol ${roleName} sigue activo, manteniéndolo`);
      }
    });
    
    console.log('💥 ELIMINACIÓN FORZADA COMPLETADA');
    
  }, 100);
  
  return true;
};

// Función de diagnóstico específica para problema de matriz no actualizada
window.diagnoseMatrixUpdateIssue = function() {
  console.log('🔍 DIAGNÓSTICO COMPLETO: Verificando actualización de matriz RASCI...');
  
  // 1. Verificar datos de matriz disponibles
  console.log('📋 Datos de matriz disponibles:');
  console.log('  window.rasciMatrixData:', window.rasciMatrixData);
  
  if (window.rasciMatrixData) {
    console.log('📊 Contenido detallado de la matriz:');
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      console.log(`  📝 Tarea: ${taskName}`);
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        console.log(`    👤 ${roleName}: "${responsibility}"`);
        
        // Verificar específicamente elementos A
        if (responsibility === 'A') {
          console.log(`    ⚠️  VALOR "A" ENCONTRADO para ${roleName} - esto creará "Aprobar ${roleName}"`);
        } else if (responsibility === '-' || responsibility === '') {
          console.log(`    ✅ Valor vacío/guión para ${roleName} - NO debe crear elemento A`);
        }
      });
    });
  }
  
  // 2. Verificar elementos A en canvas vs matriz
  if (window.bpmnModeler) {
    const elementRegistry = window.bpmnModeler.get('elementRegistry');
    
    const allAElements = elementRegistry.filter(element => 
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    
    console.log(`🎨 Elementos A en canvas: ${allAElements.length}`);
    allAElements.forEach(element => {
      console.log(`  - ${element.businessObject.name}`);
    });
    
    // Comparar con lo que dice la matriz
    if (window.rasciMatrixData) {
      const expectedAElements = [];
      Object.keys(window.rasciMatrixData).forEach(taskName => {
        const taskRoles = window.rasciMatrixData[taskName];
        Object.keys(taskRoles).forEach(roleName => {
          const responsibility = taskRoles[roleName];
          if (responsibility === 'A') {
            expectedAElements.push(`Aprobar ${roleName}`);
          }
        });
      });
      
      console.log(`📋 Elementos A esperados según matriz: ${expectedAElements.length}`);
      expectedAElements.forEach(expected => {
        console.log(`  - ${expected}`);
      });
      
      // Encontrar discrepancias
      const orphanedInCanvas = allAElements.filter(element => 
        !expectedAElements.includes(element.businessObject.name)
      );
      
      const missingInCanvas = expectedAElements.filter(expected => 
        !allAElements.some(element => element.businessObject.name === expected)
      );
      
      console.log(`🚨 ANÁLISIS DE DISCREPANCIAS:`);
      console.log(`  🗑️  Elementos A huérfanos en canvas: ${orphanedInCanvas.length}`);
      orphanedInCanvas.forEach(element => {
        console.log(`    - ${element.businessObject.name} (debería eliminarse)`);
      });
      
      console.log(`  ➕ Elementos A faltantes en canvas: ${missingInCanvas.length}`);
      missingInCanvas.forEach(missing => {
        console.log(`    - ${missing} (debería crearse)`);
      });
    }
  }
  
  // 3. Verificar estado del auto-mapping
  console.log('🔄 Estado del auto-mapping:');
  console.log('  Habilitado:', window.rasciAutoMapping && window.rasciAutoMapping.enabled);
  console.log('  Timer activo:', !!(window.rasciAutoMapping && window.rasciAutoMapping.debounceTimer));
  
  // 4. Verificar función onRasciMatrixUpdated
  console.log('📞 Función onRasciMatrixUpdated:', typeof window.onRasciMatrixUpdated);
  
  return {
    matrixData: window.rasciMatrixData,
    autoMappingEnabled: window.rasciAutoMapping && window.rasciAutoMapping.enabled,
    modelerAvailable: !!window.bpmnModeler
  };
};

// Función para forzar actualización manual de la matriz y sincronización
window.forceUpdateMatrixValue = function(taskName, roleName, newValue) {
  console.log(`🔧 FORZANDO actualización de matriz: ${taskName} -> ${roleName} = "${newValue}"`);
  
  if (!window.rasciMatrixData) {
    console.error('❌ No hay datos de matriz disponibles');
    return false;
  }
  
  // Actualizar el valor en la matriz
  if (!window.rasciMatrixData[taskName]) {
    window.rasciMatrixData[taskName] = {};
  }
  
  const oldValue = window.rasciMatrixData[taskName][roleName];
  window.rasciMatrixData[taskName][roleName] = newValue;
  
  console.log(`✅ Valor actualizado: ${oldValue} -> ${newValue}`);
  console.log('📊 Matriz actualizada:', window.rasciMatrixData);
  
  // Forzar sincronización inmediata
  if (window.bpmnModeler) {
    console.log('🔄 Ejecutando sincronización inmediata...');
    
    try {
      const results = executeAutoMappingWithCleanup(window.bpmnModeler, window.rasciMatrixData);
      console.log('✅ Sincronización completada:', results);
      
      // Verificar resultado
      setTimeout(() => {
        console.log('🔍 Verificando resultado...');
        window.diagnoseAElements();
      }, 300);
      
      return true;
    } catch (error) {
      console.error('❌ Error en sincronización:', error.message);
      return false;
    }
  }
  
  return false;
};

// Función para limpiar manualmente un elemento A específico
window.manualDeleteAElement = function(roleName) {
  console.log(`🗑️ ELIMINACIÓN MANUAL: Borrando elemento A para rol "${roleName}"`);
  
  if (!window.bpmnModeler) {
    console.error('❌ No hay modeler disponible');
    return false;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const modeling = window.bpmnModeler.get('modeling');
  
  // Buscar el elemento "Aprobar [roleName]"
  const elementName = `Aprobar ${roleName}`;
  const approvalElement = elementRegistry.find(element => 
    element.businessObject && element.businessObject.name === elementName
  );
  
  if (!approvalElement) {
    console.log(`⚠️ No se encontró elemento: ${elementName}`);
    return false;
  }
  
  console.log(`🎯 Elemento encontrado: ${elementName} (${approvalElement.type})`);
  
  try {
    // Obtener conexiones para reconectar flujo
    const incomingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && 
      conn.target && conn.target.id === approvalElement.id
    );
    
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && 
      conn.source && conn.source.id === approvalElement.id
    );
    
    // Eliminar conexiones de roles
    const roleConnections = elementRegistry.filter(conn => 
      (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
      ((conn.source && conn.source.id === approvalElement.id) || 
       (conn.target && conn.target.id === approvalElement.id))
    );
    
    if (roleConnections.length > 0) {
      console.log(`🗑️ Eliminando ${roleConnections.length} conexiones de roles`);
      modeling.removeElements(roleConnections);
    }
    
    // Eliminar el elemento
    console.log(`🗑️ Eliminando elemento: ${elementName}`);
    modeling.removeElements([approvalElement]);
    
    // Reconectar flujo
    if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
      const sourceElement = incomingConnections[0].source;
      const targetElement = outgoingConnections[0].target;
      
      setTimeout(() => {
        try {
          // Verificar si ya existe conexión directa
          const existingConnection = elementRegistry.find(conn => 
            conn.type === 'bpmn:SequenceFlow' &&
            conn.source && conn.source.id === sourceElement.id &&
            conn.target && conn.target.id === targetElement.id
          );
          
          if (!existingConnection) {
            modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
            console.log(`🔗 Flujo reconectado: ${getElementName(sourceElement)} -> ${getElementName(targetElement)}`);
          }
        } catch (reconnectError) {
          console.error(`❌ Error reconectando flujo: ${reconnectError.message}`);
        }
      }, 100);
    }
    
    // Verificar si el rol asociado debe eliminarse también
    setTimeout(() => {
      console.log(`🔍 Verificando si rol "${roleName}" debe eliminarse...`);
      
      // Verificar si el rol tiene otras responsabilidades
      let roleStillNeeded = false;
      if (window.rasciMatrixData) {
        Object.keys(window.rasciMatrixData).forEach(taskName => {
          const taskRoles = window.rasciMatrixData[taskName];
          if (taskRoles[roleName] && taskRoles[roleName] !== '-' && taskRoles[roleName] !== '') {
            roleStillNeeded = true;
          }
        });
      }
      
      if (!roleStillNeeded) {
        console.log(`🗑️ Rol "${roleName}" ya no es necesario, eliminándolo...`);
        
        const roleElement = elementRegistry.find(element => 
          (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
          element.businessObject && element.businessObject.name === roleName
        );
        
        if (roleElement) {
          // Eliminar conexiones del rol
          const allRoleConnections = elementRegistry.filter(conn => 
            (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
            ((conn.source && conn.source.id === roleElement.id) || 
             (conn.target && conn.target.id === roleElement.id))
          );
          
          if (allRoleConnections.length > 0) {
            modeling.removeElements(allRoleConnections);
          }
          
          modeling.removeElements([roleElement]);
          console.log(`✅ Rol "${roleName}" eliminado`);
        }
      } else {
        console.log(`✅ Rol "${roleName}" sigue siendo necesario, manteniéndolo`);
      }
      
    }, 200);
    
    console.log(`✅ Elemento "${elementName}" eliminado correctamente`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error eliminando elemento: ${error.message}`);
    return false;
  }
};

// Función para forzar actualización inmediata basada en matriz actual
window.forceMatrixSync = function() {
  console.log('🔄 FORZANDO sincronización inmediata con matriz actual...');
  
  if (!window.rasciMatrixData) {
    console.error('❌ No hay datos de matriz disponibles');
    return false;
  }
  
  if (!window.bpmnModeler) {
    console.error('❌ No hay modeler disponible');
    return false;
  }
  
  console.log('📊 Usando matriz actual:', window.rasciMatrixData);
  
  // Usar la función especializada directamente con datos actuales
  try {
    const results = executeAutoMappingWithCleanup(window.bpmnModeler, window.rasciMatrixData);
    console.log('✅ Sincronización forzada completada:', results);
    
    // Verificar resultado
    setTimeout(() => {
      window.diagnoseMatrixUpdateIssue();
    }, 200);
    
    return true;
  } catch (error) {
    console.error('❌ Error en sincronización forzada:', error.message);
    return false;
  }
};

// Función de diagnóstico para elementos A
window.diagnoseAElements = function() {
  console.log('🔍 DIAGNÓSTICO: Analizando elementos A en el canvas...');
  
  if (!window.bpmnModeler) {
    console.error('❌ No hay modeler disponible');
    return;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  if (!elementRegistry) {
    console.error('❌ No hay elementRegistry disponible');
    return;
  }
  
  // Obtener todos los elementos A actuales en el canvas
  const allAElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ') &&
    (element.type === 'bpmn:UserTask' || element.type === 'bpmn:IntermediateThrowEvent')
  );
  
  console.log(`📊 Elementos A encontrados en canvas: ${allAElements.length}`);
  allAElements.forEach(element => {
    const elementName = element.businessObject.name;
    console.log(`  - ${elementName} (${element.type})`);
  });
  
  // Obtener elementos A que deberían existir según la matriz
  if (window.rasciMatrixData) {
    const expectedAElements = new Set();
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        if (responsibility === 'A') {
          expectedAElements.add(`Aprobar ${roleName}`);
        }
      });
    });
    
    console.log(`📋 Elementos A esperados según matriz: ${expectedAElements.size}`);
    Array.from(expectedAElements).forEach(expectedName => {
      console.log(`  - ${expectedName}`);
    });
    
    // Encontrar elementos A huérfanos (en canvas pero no en matriz)
    const orphanedAElements = allAElements.filter(element => {
      const elementName = element.businessObject.name;
      return !expectedAElements.has(elementName);
    });
    
    console.log(`🗑️ Elementos A huérfanos (deben eliminarse): ${orphanedAElements.length}`);
    orphanedAElements.forEach(element => {
      console.log(`  - ${element.businessObject.name} (${element.type}) - ID: ${element.id}`);
    });
    
    // Encontrar elementos A faltantes (en matriz pero no en canvas)
    const missingAElements = Array.from(expectedAElements).filter(expectedName => {
      return !allAElements.some(element => element.businessObject.name === expectedName);
    });
    
    console.log(`➕ Elementos A faltantes (deben crearse): ${missingAElements.length}`);
    missingAElements.forEach(missingName => {
      console.log(`  - ${missingName}`);
    });
    
  } else {
    console.warn('⚠️ No hay datos de matriz RASCI disponibles');
  }
  
  return {
    totalAElements: allAElements.length,
    aElementsInCanvas: allAElements.map(e => e.businessObject.name),
    matrixData: window.rasciMatrixData
  };
};

// Función que el usuario puede ejecutar para reemplazar onRasciMatrixUpdated
window.forceAggressiveAutoMapping = function() {
  console.log('🔧 FORCE: Aggressive auto-mapping to fix A deletion issue');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return false;
  }
  
  try {
    console.log('🚀 Using aggressive auto-mapping...');
    const results = executeAutoMappingWithCleanup(window.bpmnModeler, window.rasciMatrixData);
    console.log('✅ Aggressive auto-mapping completed:', results);
    return true;
  } catch (error) {
    console.error('❌ Aggressive auto-mapping failed:', error.message);
    return false;
  }
};

window.testARoleDeletionIssue = function() {
  console.log('🚨 Testing user-reported issue: A role deletion from RASCI matrix');
  console.log('🚨 Problem: "se crea pero no se borra" (creates but doesn\'t delete)');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return;
  }
  
  console.log('🔍 Current matrix state:');
  console.log(JSON.stringify(window.rasciMatrixData, null, 2));
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  // Find current A elements
  const currentAElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`📊 Current A elements in diagram: ${currentAElements.length}`);
  currentAElements.forEach(element => {
    console.log(`  - ${element.businessObject.name} (${element.type}, ID: ${element.id})`);
  });
  
  // Find A responsibilities in matrix
  const matrixAResponsibilities = [];
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        matrixAResponsibilities.push({ task: taskName, role: roleName, expected: `Aprobar ${roleName}` });
      }
    });
  });
  
  console.log(`📋 A responsibilities in matrix: ${matrixAResponsibilities.length}`);
  matrixAResponsibilities.forEach(resp => {
    console.log(`  - Task: ${resp.task}, Role: ${resp.role} -> Expected: ${resp.expected}`);
  });
  
  // Identify discrepancies
  console.log('🔍 === ANALYZING DISCREPANCIES ===');
  
  const expectedElementNames = new Set(matrixAResponsibilities.map(resp => resp.expected));
  const actualElementNames = new Set(currentAElements.map(element => element.businessObject.name));
  
  // Elements that should exist but don't
  const missing = [...expectedElementNames].filter(name => !actualElementNames.has(name));
  // Elements that exist but shouldn't
  const orphaned = [...actualElementNames].filter(name => !expectedElementNames.has(name));
  
  console.log(`❌ Missing A elements (should exist but don't): ${missing.length}`);
  missing.forEach(name => console.log(`  - ${name}`));
  
  console.log(`❌ Orphaned A elements (exist but shouldn't): ${orphaned.length}`);
  orphaned.forEach(name => console.log(`  - ${name}`));
  
  if (orphaned.length > 0) {
    console.log('🚨 CONFIRMED: Orphaned A elements found - this matches user\'s issue!');
    console.log('🧹 Running forced A element cleanup...');
    
    const results = { elementsRemoved: 0 };
    forceCleanupAElements(window.bpmnModeler, window.rasciMatrixData, results);
    
    setTimeout(() => {
      // Check again after cleanup
      const elementsAfterCleanup = elementRegistry.filter(element => 
        element.businessObject && element.businessObject.name &&
        element.businessObject.name.startsWith('Aprobar ')
      );
      
      console.log(`📊 A elements after forced cleanup: ${elementsAfterCleanup.length}`);
      elementsAfterCleanup.forEach(element => {
        console.log(`  - ${element.businessObject.name}`);
      });
      
      const stillOrphaned = elementsAfterCleanup.filter(element => 
        !expectedElementNames.has(element.businessObject.name)
      );
      
      if (stillOrphaned.length === 0) {
        console.log('✅ SUCCESS: All orphaned A elements have been cleaned up!');
        console.log('✅ The A role deletion issue has been FIXED!');
      } else {
        console.error(`❌ STILL FAILING: ${stillOrphaned.length} orphaned A elements remain`);
        stillOrphaned.forEach(element => {
          console.error(`  - Still orphaned: ${element.businessObject.name}`);
        });
      }
    }, 200);
    
  } else if (missing.length > 0) {
    console.log('⚠️ Missing A elements found - running auto-mapping to create them...');
    window.onRasciMatrixUpdated();
  } else {
    console.log('✅ No discrepancies found - A elements are correctly synchronized with matrix');
  }
};

// Function to force complete auto-mapping update with enhanced cleanup
window.forceCompleteAutoMappingUpdate = function() {
  console.log('🔧 Forcing COMPLETE auto-mapping update...');
  
  if (!window.bpmnModeler) {
    console.error('❌ No BPMN modeler available');
    return false;
  }
  
  if (!window.rasciMatrixData) {
    console.error('❌ No RASCI matrix data available');
    return false;
  }
  
  console.log('📊 Current matrix data:', window.rasciMatrixData);
  
  // Enable auto-mapping if it's not enabled
  if (!window.rasciAutoMapping) {
    window.rasciAutoMapping = {
      enabled: true,
      debounceTimer: null,
      smartTimer: null,
      enable() { this.enabled = true; },
      disable() { this.enabled = false; },
      toggle() { this.enabled = !this.enabled; return this.enabled; },
      triggerMapping: function() { window.onRasciMatrixUpdated(); },
      triggerSmartMapping: function() { window.onRasciMatrixUpdated(); }
    };
  }
  
  if (!window.rasciAutoMapping.enabled) {
    console.log('🔧 Enabling auto-mapping...');
    window.rasciAutoMapping.enabled = true;
  }
  
  try {
    console.log('🚀 Phase 1: Complete cleanup before mapping...');
    // First, do a thorough cleanup
    cleanupOrphanedElements(window.bpmnModeler);
    cleanupUnusedRoles(window.bpmnModeler);
    
    console.log('🚀 Phase 2: Execute full mapping...');
    // Then execute the full mapping
    const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
    console.log('✅ Phase 2 completed:', results);
    
    console.log('🚀 Phase 3: Final cleanup to remove any remaining orphans...');
    // Finally, cleanup again to remove any elements that might still be orphaned
    setTimeout(() => {
      cleanupOrphanedElements(window.bpmnModeler);
      console.log('✅ Complete auto-mapping update finished');
    }, 200);
    
    return true;
  } catch (error) {
    console.error('❌ Complete mapping failed:', error.message);
    return false;
  }
};

// Function to force auto-mapping update
window.forceAutoMappingUpdate = function() {
  console.log('🔧 Forcing auto-mapping update using identical manual logic...');
  
  if (!window.bpmnModeler) {
    console.error('❌ No BPMN modeler available');
    return false;
  }
  
  if (!window.rasciMatrixData) {
    console.error('❌ No RASCI matrix data available');
    return false;
  }
  
  // Enable auto-mapping if it's not enabled
  if (!window.rasciAutoMapping) {
    console.log('⚠️ Auto-mapping object not found, creating it...');
    window.rasciAutoMapping = {
      enabled: true,
      debounceTimer: null,
      smartTimer: null,
      enable() { this.enabled = true; },
      disable() { this.enabled = false; },
      toggle() { this.enabled = !this.enabled; return this.enabled; },
      triggerMapping: function() { window.onRasciMatrixUpdated(); },
      triggerSmartMapping: function() { window.onRasciMatrixUpdated(); }
    };
  }
  
  if (!window.rasciAutoMapping.enabled) {
    console.log('🔧 Enabling auto-mapping...');
    window.rasciAutoMapping.enabled = true;
  }
  
  console.log('📊 Current matrix data:', window.rasciMatrixData);
  console.log('🚀 Executing forced mapping using SAME logic as manual...');
  
  try {
    // Use the EXACT same function as manual mapping
    const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
    console.log('✅ Forced mapping completed:', results);
    return true;
  } catch (error) {
    console.error('❌ Forced mapping failed:', error.message);
    return false;
  }
};

// Add a specific test for C/A/I sequence creation
window.testCAISequences = function() {
  console.log('🧪 Testing C/A/I sequence creation specifically');
  
  if (!window.bpmnModeler) {
    console.error('❌ No BPMN modeler available');
    return;
  }
  
  if (!window.rasciMatrixData) {
    console.error('❌ No RASCI matrix data available');
    return;
  }
  
  console.log('📋 Testing with current matrix data:', window.rasciMatrixData);
  
  // Test the sequence creation function directly
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const allTasks = elementRegistry.filter(element => 
    element.type === 'bpmn:Task' && element.businessObject && element.businessObject.name
  );
  
  console.log('🎯 Found tasks in diagram:', allTasks.map(t => t.businessObject.name));
  
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    const bpmnTask = allTasks.find(t => t.businessObject.name === taskName);
    
    if (!bpmnTask) {
      console.warn(`⚠️ Task not found in diagram: ${taskName}`);
      return;
    }
    
    const consultRoles = Object.keys(taskRoles).filter(role => taskRoles[role] === 'C');
    const approveRoles = Object.keys(taskRoles).filter(role => taskRoles[role] === 'A');
    const informRoles = Object.keys(taskRoles).filter(role => taskRoles[role] === 'I');
    
    if (consultRoles.length > 0 || approveRoles.length > 0 || informRoles.length > 0) {
      console.log(`🎯 Testing sequence creation for task: ${taskName}`);
      console.log(`  C: [${consultRoles.join(', ')}]`);
      console.log(`  A: [${approveRoles.join(', ')}]`);
      console.log(`  I: [${informRoles.join(', ')}]`);
      
      // Test finding the next task
      const nextTask = findNextTaskInOriginalFlow(window.bpmnModeler, bpmnTask);
      console.log(`  Next task: ${nextTask ? getElementName(nextTask) : 'none'}`);
    }
  });
};

// Add a function to sync connections when RASCI matrix is updated externally
window.syncRasciConnections = function() {
  console.log('🔄 Syncing RASCI connections using IDENTICAL manual logic');
  
  if (!window.bpmnModeler) {
    console.error('❌ No BPMN modeler available for sync');
    return;
  }
  
  if (!window.rasciMatrixData) {
    console.warn('⚠️ No RASCI matrix data available for sync');
    return;
  }
  
  console.log('📊 Syncing with matrix data:', window.rasciMatrixData);
  
  try {
    // Use EXACTLY the same function as manual mapping
    console.log('🚀 Sync: Using executeSimpleRasciMapping (same as manual)');
    const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
    console.log('✅ Sync completed with results:', results);
    
  } catch (error) {
    console.error('❌ Error during sync:', error.message);
  }
};

function cleanupUnusedRoles(modeler) {
  if (!window.rasciMatrixData) return;
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  // Find all roles in the diagram
  const allRoleElements = elementRegistry.filter(element => 
    element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
  );
  
  // Get all roles that have responsibilities in the matrix
  const rolesWithResponsibilities = new Set();
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      if (taskRoles[roleName] && ['R', 'A', 'S', 'C', 'I'].includes(taskRoles[roleName])) {
        rolesWithResponsibilities.add(roleName);
      }
    });
  });
  
  // Remove roles that no longer have any responsibilities
  allRoleElements.forEach(roleElement => {
    const roleName = roleElement.businessObject && roleElement.businessObject.name;
    if (roleName && !rolesWithResponsibilities.has(roleName)) {
      console.log(`Removing unused role: ${roleName}`);
      
      // Remove all connections to this role first
      const roleConnections = elementRegistry.filter(conn => 
        (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
        ((conn.source && conn.source.id === roleElement.id) || 
         (conn.target && conn.target.id === roleElement.id))
      );
      
      try {
        if (roleConnections.length > 0) {
          modeling.removeElements(roleConnections);
        }
        modeling.removeElements([roleElement]);
      } catch (error) {
        console.error(`Error removing unused role ${roleName}: ${error.message}`);
      }
    }
  });
}

// Function to be called when a role is removed from the RASCI matrix
window.onRoleRemovedFromMatrix = function(roleName) {
  if (window.bpmnModeler) {
    console.log(`Role ${roleName} removed from RASCI matrix, updating canvas`);
    
    // Trigger the role deletion handler
    checkAndRestoreDirectConnectionsAfterRoleDeletion(window.bpmnModeler, roleName);
    
    // Clean up unused roles
    setTimeout(() => {
      cleanupUnusedRoles(window.bpmnModeler);
    }, 100);
    
    // If auto-mapping is enabled, trigger it
    if (window.rasciAutoMapping && window.rasciAutoMapping.enabled) {
      setTimeout(() => {
        window.rasciAutoMapping.triggerMapping();
      }, 200);
    }
  }
};

export function initRasciMapping() {
  console.log('🔧 Initializing RASCI mapping system...');
  
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
    
    // Initialize auto-mapping object if it doesn't exist
    if (!window.rasciAutoMapping) {
      console.log('🔧 Setting up auto-mapping object...');
      window.rasciAutoMapping = {
        enabled: false,
        debounceTimer: null,
        smartTimer: null,
        enable() { this.enabled = true; console.log('Auto-mapping enabled'); },
        disable() { this.enabled = false; console.log('Auto-mapping disabled'); },
        toggle() { this.enabled = !this.enabled; return this.enabled; },
        triggerMapping() { if(this.enabled) window.onRasciMatrixUpdated(); },
        triggerSmartMapping() { if(this.enabled) window.onRasciMatrixUpdated(); }
      };
    }
    
    console.log('✅ RASCI mapping system initialized');
  }, 1000);
}

// Add function to test approval task cleanup specifically
window.testApprovalTaskCleanup = function() {
  console.log('🧪 Testing approval task cleanup functionality');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  // Show current approval tasks in diagram
  const allApprovalTasks = elementRegistry.filter(element => 
    element.type === 'bpmn:UserTask' && 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`📊 Current approval tasks in diagram: ${allApprovalTasks.length}`);
  allApprovalTasks.forEach(task => {
    const taskName = task.businessObject.name;
    console.log(`  - ${taskName} (${task.id})`);
  });
  
  // Show what approval tasks should exist according to matrix
  const expectedApprovalTasks = new Set();
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleKey => {
      const responsibility = taskRoles[roleKey];
      if (responsibility === 'A') {
        expectedApprovalTasks.add(`Aprobar ${roleKey}`);
      }
    });
  });
  
  console.log(`📋 Expected approval tasks according to matrix: [${Array.from(expectedApprovalTasks).join(', ')}]`);
  
  // Find orphaned approval tasks
  const orphanedApprovalTasks = allApprovalTasks.filter(task => {
    const taskName = task.businessObject.name;
    return !expectedApprovalTasks.has(taskName);
  });
  
  console.log(`🗑️ Orphaned approval tasks to be removed: ${orphanedApprovalTasks.length}`);
  orphanedApprovalTasks.forEach(task => {
    const taskName = task.businessObject.name;
    console.log(`  - ${taskName} (should be removed)`);
  });
  
  // Test running the enhanced handleRolesAndAssignments
  console.log('🧹 Running enhanced role assignments with cleanup...');
  
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: 0
  };
  
  handleRolesAndAssignments(window.bpmnModeler, window.rasciMatrixData, results);
  
  console.log('✅ Enhanced role assignments completed with results:', results);
  
  // Show state after cleanup
  setTimeout(() => {
    console.log('📊 State after approval task cleanup:');
    const approvalTasksAfter = elementRegistry.filter(element => 
      element.type === 'bpmn:UserTask' && 
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    console.log(`📊 Approval tasks remaining: ${approvalTasksAfter.length}`);
    approvalTasksAfter.forEach(task => {
      const taskName = task.businessObject.name;
      console.log(`  - ${taskName} (${task.id})`);
    });
    
    console.log('✅ Approval task cleanup test completed');
  }, 200);
};

// Add function to debug role cleanup specifically
window.debugRoleCleanup = function() {
  console.log('🧪 Testing role cleanup functionality');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  // Show current state before cleanup
  console.log('📊 Current state before cleanup:');
  
  // Check all current roles
  const allRoles = elementRegistry.filter(element => 
    element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
  );
  console.log(`🎭 Total roles in diagram: ${allRoles.length}`);
  allRoles.forEach(role => {
    const roleName = role.businessObject && role.businessObject.name;
    console.log(`  - ${roleName} (${role.id})`);
  });
  
  // Check all role connections
  const allRoleConnections = elementRegistry.filter(conn => 
    conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association'
  );
  console.log(`🔗 Total role connections: ${allRoleConnections.length}`);
  
  // Check AND gates
  const allAndGates = elementRegistry.filter(element => 
    element.type === 'RALph:Complex-Assignment-AND'
  );
  console.log(`⚙️ Total AND gates: ${allAndGates.length}`);
  
  // Show what roles should exist according to matrix
  const activeRoles = new Set();
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        activeRoles.add(roleName);
      }
    });
  });
  
  console.log(`📋 Active roles according to matrix: [${Array.from(activeRoles).join(', ')}]`);
  
  // Check for orphaned elements
  const orphanedRoles = allRoles.filter(role => {
    const roleName = role.businessObject && role.businessObject.name;
    return roleName && !activeRoles.has(roleName);
  });
  
  console.log(`🗑️ Orphaned roles to be removed: ${orphanedRoles.length}`);
  orphanedRoles.forEach(role => {
    const roleName = role.businessObject && role.businessObject.name;
    console.log(`  - ${roleName} (not in matrix or has '-' value)`);
  });
  
  // Test cleanup
  console.log('🧹 Running cleanup...');
  cleanupOrphanedElements(window.bpmnModeler);
  
  // Show state after cleanup
  setTimeout(() => {
    console.log('📊 State after cleanup:');
    const rolesAfter = elementRegistry.filter(element => 
      element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
    );
    console.log(`🎭 Roles remaining: ${rolesAfter.length}`);
    rolesAfter.forEach(role => {
      const roleName = role.businessObject && role.businessObject.name;
      console.log(`  - ${roleName} (${role.id})`);
    });
    
    const connectionsAfter = elementRegistry.filter(conn => 
      conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association'
    );
    console.log(`🔗 Connections remaining: ${connectionsAfter.length}`);
    
    const andGatesAfter = elementRegistry.filter(element => 
      element.type === 'RALph:Complex-Assignment-AND'
    );
    console.log(`⚙️ AND gates remaining: ${andGatesAfter.length}`);
    
    console.log('✅ Role cleanup test completed');
  }, 100);
};

// Add diagnostic function
window.diagnoseAutoMapping = function() {
  console.log('🏥 RASCI Auto-Mapping Diagnostic Report');
  console.log('=====================================');
  
  // Check modeler
  if (window.bpmnModeler) {
    console.log('✅ BPMN Modeler: Available');
    try {
      const elementRegistry = window.bpmnModeler.get('elementRegistry');
      const allElements = elementRegistry.filter(() => true);
      console.log(`📊 Total elements in diagram: ${allElements.length}`);
      
      const tasks = elementRegistry.filter(element => 
        element.type === 'bpmn:Task' && element.businessObject && element.businessObject.name
      );
      console.log(`🎯 BPMN tasks: ${tasks.length}`);
      tasks.forEach(task => console.log(`  - ${task.businessObject.name}`));
      
      // Check special elements and their labels
      const specialElements = elementRegistry.filter(element => {
        const name = getElementName(element);
        return name && ['Consultar ', 'Aprobar ', 'Informar '].some(prefix => name.startsWith(prefix));
      });
      console.log(`⭐ Special elements: ${specialElements.length}`);
      specialElements.forEach(element => {
        const name = getElementName(element);
        const hasLabel = element.businessObject && element.businessObject.name;
        console.log(`  - ${name} (${element.type}) - Label: ${hasLabel ? '✅' : '❌'}`);
      });
      
    } catch (error) {
      console.error('❌ Error accessing modeler:', error.message);
    }
  } else {
    console.error('❌ BPMN Modeler: Not available');
  }
  
  // Check matrix data
  if (window.rasciMatrixData) {
    console.log('✅ RASCI Matrix Data: Available');
    console.log(`📊 Tasks in matrix: ${Object.keys(window.rasciMatrixData).length}`);
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const roles = window.rasciMatrixData[taskName];
      const roleCount = Object.keys(roles).length;
      console.log(`  - ${taskName}: ${roleCount} roles assigned`);
    });
  } else {
    console.error('❌ RASCI Matrix Data: Not available');
  }
  
  // Check auto-mapping
  if (window.rasciAutoMapping) {
    console.log(`✅ Auto-mapping Object: Available (${window.rasciAutoMapping.enabled ? 'ENABLED' : 'DISABLED'})`);
  } else {
    console.error('❌ Auto-mapping Object: Not available');
  }
  
  // Check functions
  const functions = ['onRasciMatrixUpdated', 'executeRasciToRalphMapping', 'syncRasciConnections', 'preserveElementLabels'];
  functions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
      console.log(`✅ Function ${funcName}: Available`);
    } else {
      console.error(`❌ Function ${funcName}: Not available`);
    }
  });
  
  console.log('=====================================');
  console.log('🏥 Diagnostic complete');
  
  // Test auto-mapping if everything looks good
  if (window.bpmnModeler && window.rasciMatrixData && window.rasciAutoMapping) {
    console.log('🧪 All components available - running test mapping...');
    window.forceAutoMappingUpdate();
  } else {
    console.warn('⚠️ Some components missing - cannot run test mapping');
  }
};

// Add function to check label integrity
window.checkLabelIntegrity = function() {
  console.log('🏷️ Checking label integrity...');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing modeler or matrix data');
    return;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const issues = [];
  
  // Check if all expected elements have correct labels
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      let expectedName = null;
      let expectedType = null;
      
      if (responsibility === 'C') {
        expectedName = `Consultar ${roleName}`;
        expectedType = 'bpmn:IntermediateThrowEvent';
      } else if (responsibility === 'A') {
        expectedName = `Aprobar ${roleName}`;
        expectedType = 'bpmn:UserTask';
      } else if (responsibility === 'I') {
        expectedName = `Informar ${roleName}`;
        expectedType = 'bpmn:IntermediateThrowEvent';
      }
      
      if (expectedName && expectedType) {
        const element = elementRegistry.find(el => 
          el.type === expectedType && 
          el.businessObject && 
          el.businessObject.name === expectedName
        );
        
        if (!element) {
          issues.push(`❌ Missing element: ${expectedName} (${expectedType})`);
        } else {
          console.log(`✅ Found: ${expectedName}`);
        }
      }
    });
  });
  
  // Check for elements without proper labels
  const specialElements = elementRegistry.filter(element => {
    return (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:UserTask') &&
           (!element.businessObject || !element.businessObject.name || 
            element.businessObject.name === '' || element.businessObject.name === 'undefined');
  });
  
  specialElements.forEach(element => {
    issues.push(`❌ Element without label: ${element.id} (${element.type})`);
  });
  
  if (issues.length > 0) {
    console.error('🚨 Label integrity issues found:');
    issues.forEach(issue => console.error(issue));
    
    console.log('🔧 Attempting to fix label issues...');
    preserveElementLabels(window.bpmnModeler, window.rasciMatrixData);
    fixMissingLabels(window.bpmnModeler);
  } else {
    console.log('✅ All labels are correct');
  }
};

// Add function to debug original flow state
window.debugOriginalFlow = function() {
  console.log('🔍 Debugging original flow state...');
  
  if (!window.bpmnModeler) {
    console.error('❌ No BPMN modeler available');
    return;
  }
  
  console.log(`📊 Original flow map size: ${originalFlowMap.size}`);
  
  if (originalFlowMap.size === 0) {
    console.warn('⚠️ Original flow map is empty - this could cause flow restoration issues');
    console.log('🔧 Trying to save original flow now...');
    saveOriginalFlow(window.bpmnModeler);
    console.log(`📊 After save attempt - Original flow map size: ${originalFlowMap.size}`);
  }
  
  console.log('🗺️ Original flow map contents:');
  for (const [sourceId, targets] of originalFlowMap.entries()) {
    const elementRegistry = window.bpmnModeler.get('elementRegistry');
    const sourceElement = elementRegistry.get(sourceId);
    const sourceName = sourceElement ? getElementName(sourceElement) : 'UNKNOWN';
    
    console.log(`  📍 ${sourceName} (${sourceId}) -> ${targets.length} targets`);
    targets.forEach((target, index) => {
      const targetElement = elementRegistry.get(target.id);
      const targetName = targetElement ? getElementName(targetElement) : 'UNKNOWN';
      console.log(`    ${index + 1}. ${targetName} (${target.id})`);
    });
  }
  
  // Check current flow state
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const allTasks = elementRegistry.filter(element => 
    ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask'].includes(element.type) &&
    element.businessObject && element.businessObject.name
  );
  
  console.log('🎯 Current BPMN tasks and their outgoing connections:');
  allTasks.forEach(task => {
    const taskName = getElementName(task);
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === task.id
    );
    
    console.log(`  📍 ${taskName}: ${outgoingConnections.length} outgoing connections`);
    outgoingConnections.forEach((conn, index) => {
      const targetName = getElementName(conn.target);
      console.log(`    ${index + 1}. -> ${targetName}`);
    });
  });
};

function setupElementDeletionListener() {
  if (window.bpmnModeler && !window.rasciEventListenerConfigured) {
    const eventBus = window.bpmnModeler.get('eventBus');
    const elementRegistry = window.bpmnModeler.get('elementRegistry');
    
    // Store information about AND gates before deletion
    const pendingAndGateInfo = new Map();
    
    eventBus.on('commandStack.shape.delete.preExecute', (event) => {
      const elementToDelete = event.context.shape;
      if (!elementToDelete) return;
      
      const elementName = getElementName(elementToDelete);
      
      // Handle approval task deletion preparation
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
      
      // Handle AND gate deletion preparation
      if (elementToDelete.type === 'RALph:Complex-Assignment-AND') {
        console.log(`Preparing to delete AND gate: ${elementToDelete.id}`);
        
        // Find which task is connected to this AND gate
        const taskConnections = elementRegistry.filter(conn => 
          conn.type === 'RALph:ResourceArc' &&
          conn.target && conn.target.id === elementToDelete.id &&
          conn.source && (conn.source.type === 'bpmn:Task' || 
                         conn.source.type === 'bpmn:UserTask' ||
                         conn.source.type === 'bpmn:ServiceTask' ||
                         conn.source.type === 'bpmn:ScriptTask')
        );
        
        console.log(`Found ${taskConnections.length} task connections to AND gate`);
        
        if (taskConnections.length > 0) {
          const bpmnTask = taskConnections[0].source;
          const taskName = getElementName(bpmnTask);
          
          pendingAndGateInfo.set(elementToDelete.id, {
            taskId: bpmnTask.id,
            taskName: taskName
          });
          
          console.log(`Preparing to delete AND gate for task: ${taskName} (ID: ${bpmnTask.id})`);
          
          // Also store which roles are currently connected to this AND gate
          const roleConnections = elementRegistry.filter(conn => 
            conn.type === 'RALph:ResourceArc' &&
            conn.target && conn.target.id === elementToDelete.id &&
            conn.source && (conn.source.type === 'RALph:RoleRALph' || conn.source.type === 'ralph:Role')
          );
          
          const connectedRoles = roleConnections.map(conn => {
            const roleName = conn.source.businessObject && conn.source.businessObject.name;
            return roleName;
          }).filter(name => name);
          
          console.log(`AND gate is connected to roles: ${connectedRoles.join(', ')}`);
        } else {
          console.log(`No task connections found for AND gate ${elementToDelete.id}`);
        }
      }
    });
    
    const deletionEvents = ['element.removed', 'elements.deleted', 'shape.removed'];
    
    deletionEvents.forEach(eventName => {
      eventBus.on(eventName, (event) => {
        const removedElement = event.element || (event.elements && event.elements[0]);
        if (!removedElement) return;
        
        const elementName = getElementName(removedElement);
        
        // Handle approval task deletion
        if (elementName && elementName.startsWith('Aprobar ') && removedElement.type === 'bpmn:UserTask') {
          setTimeout(() => {
            executeSmartReconnection(window.bpmnModeler, removedElement.id);
          }, 100);
        }
        
        // Handle role deletion (only if role was removed from matrix, not canvas)
        if (removedElement.type === 'RALph:RoleRALph' || removedElement.type === 'ralph:Role') {
          const roleName = removedElement.businessObject && removedElement.businessObject.name;
          if (roleName) {
            // Don't automatically update matrix when deleting from canvas
            // Only respond to matrix changes
            console.log(`Role ${roleName} deleted from canvas - no automatic matrix update`);
          }
        }
        
        // Handle AND gate deletion (allow manual deletion with smart restoration)
        if (removedElement.type === 'RALph:Complex-Assignment-AND') {
          const andGateInfo = pendingAndGateInfo.get(removedElement.id);
          if (andGateInfo) {
            console.log(`AND gate deleted manually for task: ${andGateInfo.taskName}`);
            setTimeout(() => {
              checkAndRestoreDirectConnectionsAfterAndGateDeletion(window.bpmnModeler, removedElement);
            }, 100);
            pendingAndGateInfo.delete(removedElement.id);
          } else {
            console.log(`AND gate deleted manually - checking all tasks for restoration needs`);
            // Fallback: check all tasks for restoration needs since we don't have specific task info
            setTimeout(() => {
              checkAndRestoreDirectConnectionsAfterAndGateDeletion(window.bpmnModeler, removedElement);
            }, 100);
          }
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

function findResponsibleRoleForTask(taskName) {
  if (!window.rasciMatrixData || !window.rasciMatrixData[taskName]) {
    return null;
  }
  
  const taskRoles = window.rasciMatrixData[taskName];
  const responsibleRoles = [];
  
  Object.keys(taskRoles).forEach(roleKey => {
    if (taskRoles[roleKey] === 'R') {
      responsibleRoles.push(roleKey);
    }
  });
  
  return responsibleRoles.length === 1 ? responsibleRoles[0] : null;
}

function checkAndRestoreDirectConnectionsAfterRoleDeletion(modeler, deletedRoleName) {
  if (!window.rasciMatrixData) return;
  
  // Check if the role has any responsibilities left in the matrix
  let hasResponsibilities = false;
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    if (taskRoles[deletedRoleName]) {
      hasResponsibilities = true;
    }
  });
  
  // If the role still has responsibilities in the matrix, don't update anything
  // Only react to matrix changes, not canvas deletions
  if (hasResponsibilities) {
    console.log(`Role ${deletedRoleName} still has responsibilities in matrix, not updating canvas`);
    return;
  }
  
  // If we reach here, the role was removed from the matrix, so update canvas accordingly
  console.log(`Role ${deletedRoleName} removed from matrix, updating canvas`);
  
  // Now check all tasks to see if any need direct connection restoration
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    
    // Find current S roles for this task
    const supportRoles = Object.keys(taskRoles).filter(roleName => 
      taskRoles[roleName] === 'S'
    );
    
    // Find the responsible role for this task
    const responsibleRoles = Object.keys(taskRoles).filter(roleName => 
      taskRoles[roleName] === 'R'
    );
    
    // If no S roles remain and there's exactly one R role, restore direct connection
    if (supportRoles.length === 0 && responsibleRoles.length === 1) {
      const bpmnTask = findBpmnTaskByName(modeler, taskName);
      if (bpmnTask) {
        console.log(`Task ${taskName} should have direct connection - R: ${responsibleRoles[0]}, S roles: ${supportRoles.length}`);
        
        // Remove any existing AND gate
        const existingAndGate = findExistingAndGate(modeler, bpmnTask);
        if (existingAndGate) {
          const modeling = modeler.get('modeling');
          try {
            modeling.removeElements([existingAndGate]);
            console.log(`Removed AND gate for task ${taskName} - no S roles remaining`);
          } catch (error) {
            console.error(`Error removing AND gate: ${error.message}`);
          }
        }
        
        // Restore direct connection
        const restored = restoreDirectConnectionIfNeeded(modeler, bpmnTask);
        if (restored) {
          console.log(`Successfully restored direct connection for task ${taskName}`);
        } else {
          console.log(`Failed to restore direct connection for task ${taskName}`);
        }
      }
    } else {
      console.log(`Task ${taskName} still needs AND gate - R: ${responsibleRoles.length}, S: ${supportRoles.length}`);
    }
  });
}

function checkAndRestoreDirectConnectionsAfterAndGateDeletion(modeler, deletedAndGate) {
  console.log(`AND gate deleted manually from canvas: ${deletedAndGate.id}`);
  
  // When AND gate is deleted manually, check if we should restore direct connections
  // based on the current RASCI matrix state
  if (!window.rasciMatrixData) {
    console.log('No RASCI matrix data available');
    return;
  }
  
  // Check all tasks to see if any need direct connection restoration after AND gate deletion
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    
    if (!bpmnTask) return;
    
    // Check if this task currently has an AND gate (should be none after deletion)
    const currentAndGate = findExistingAndGate(modeler, bpmnTask);
    
    // If no AND gate exists now, check if we need a direct connection based on matrix
    if (!currentAndGate) {
      const responsibleRoles = Object.keys(taskRoles).filter(roleName => 
        taskRoles[roleName] === 'R'
      );
      const supportRoles = Object.keys(taskRoles).filter(roleName => 
        taskRoles[roleName] === 'S'
      );
      
      console.log(`Task ${taskName} after AND gate deletion: R roles: ${responsibleRoles.length}, S roles: ${supportRoles.length}`);
      
      // If there's exactly one R role and no S roles, restore direct connection
      if (responsibleRoles.length === 1 && supportRoles.length === 0) {
        const elementRegistry = modeler.get('elementRegistry');
        
        // Check if direct connection already exists
        const existingDirectConnection = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          conn.source && conn.source.id === bpmnTask.id &&
          conn.target && conn.target.businessObject && 
          conn.target.businessObject.name === responsibleRoles[0]
        );
        
        if (existingDirectConnection.length === 0) {
          const restored = restoreDirectConnectionIfNeeded(modeler, bpmnTask);
          if (restored) {
            console.log(`Restored direct connection for task ${taskName} after AND gate deletion`);
          } else {
            console.log(`Failed to restore direct connection for task ${taskName} after AND gate deletion`);
          }
        } else {
          console.log(`Direct connection already exists for task ${taskName}`);
        }
      } else if (responsibleRoles.length === 1 && supportRoles.length > 0) {
        // User manually deleted AND gate but there are still S roles in matrix
        // Restore direct connection to R role only and clean up unused S roles
        console.log(`Task ${taskName} has S roles in matrix but user deleted AND gate - restoring only R connection and cleaning S roles`);
        
        const elementRegistry = modeler.get('elementRegistry');
        const modeling = modeler.get('modeling');
        
        // Check if direct connection to R role already exists
        const existingDirectConnection = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          conn.source && conn.source.id === bpmnTask.id &&
          conn.target && conn.target.businessObject && 
          conn.target.businessObject.name === responsibleRoles[0]
        );
        
        if (existingDirectConnection.length === 0) {
          const restored = restoreDirectConnectionIfNeeded(modeler, bpmnTask);
          if (restored) {
            console.log(`Restored direct connection to R role for task ${taskName} after manual AND gate deletion`);
          } else {
            console.log(`Failed to restore direct connection to R role for task ${taskName} after manual AND gate deletion`);
          }
        } else {
          console.log(`Direct connection to R role already exists for task ${taskName}`);
        }
        
        // Clean up unconnected S roles for this task
        supportRoles.forEach(supportRoleName => {
          const roleElement = elementRegistry.find(element => 
            (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
            element.businessObject && element.businessObject.name === supportRoleName
          );
          
          if (roleElement) {
            // Check if this role is connected to anything else
            const roleConnections = elementRegistry.filter(conn => 
              (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
              ((conn.source && conn.source.id === roleElement.id) || 
               (conn.target && conn.target.id === roleElement.id))
            );
            
            // If role is not connected to anything, remove it
            if (roleConnections.length === 0) {
              try {
                modeling.removeElements([roleElement]);
                console.log(`Removed unconnected support role: ${supportRoleName}`);
              } catch (error) {
                console.error(`Error removing support role ${supportRoleName}: ${error.message}`);
              }
            }
          }
        });
      } else {
        console.log(`Task ${taskName} still needs multiple roles or has no R role - no direct connection restoration`);
      }
    }
  });
  
  console.log(`AND gate deletion processing completed`);
}

function getSupportRolesForTask(taskName) {
  if (!window.rasciMatrixData || !window.rasciMatrixData[taskName]) {
    return [];
  }
  
  const taskRoles = window.rasciMatrixData[taskName];
  const supportRoles = [];
  
  Object.keys(taskRoles).forEach(roleKey => {
    if (taskRoles[roleKey] === 'S') {
      supportRoles.push(roleKey);
    }
  });
  
  return supportRoles;
}

function restoreDirectConnectionIfNeeded(modeler, bpmnTask) {
  const taskName = getElementName(bpmnTask);
  const responsibleRole = findResponsibleRoleForTask(taskName);
  const supportRoles = getSupportRolesForTask(taskName);
  
  console.log(`Checking direct connection for task: ${taskName}, R: ${responsibleRole}, S count: ${supportRoles.length}`);
  
  // If there's exactly one responsible role, restore direct connection
  // (regardless of support roles if this is called from manual AND gate deletion)
  if (responsibleRole) {
    const modeling = modeler.get('modeling');
    const elementRegistry = modeler.get('elementRegistry');
    
    // Find the responsible role element
    let roleElement = elementRegistry.find(element => 
      (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
      element.businessObject && element.businessObject.name === responsibleRole
    );
    
    // If role doesn't exist, create it
    if (!roleElement) {
      console.log(`Role ${responsibleRole} not found, creating it`);
      const results = { rolesCreated: 0 };
      roleElement = createRalphRole(modeler, responsibleRole, results);
    }
    
    if (roleElement) {
      // Check if direct connection already exists
      const existingDirectConnection = elementRegistry.filter(conn => 
        (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
        conn.source && conn.source.id === bpmnTask.id &&
        conn.target && conn.target.id === roleElement.id
      );
      
      if (existingDirectConnection.length === 0) {
        try {
          modeling.connect(bpmnTask, roleElement, { type: 'RALph:ResourceArc' });
          console.log(`Successfully restored direct connection between ${taskName} and ${responsibleRole}`);
          return true;
        } catch (error) {
          console.error(`Error restoring direct connection: ${error.message}`);
          return false;
        }
      } else {
        console.log(`Direct connection already exists between ${taskName} and ${responsibleRole}`);
        return true;
      }
    } else {
      console.error(`Failed to create or find role element for ${responsibleRole}`);
      return false;
    }
  } else {
    console.log(`No responsible role found for task ${taskName}`);
    return false;
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
    const connectionsToCheck = elementRegistry.filter(conn => 
      (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
      ((conn.source && conn.source.id === roleElement.id) || 
       (conn.target && conn.target.id === roleElement.id)) &&
      conn.source && conn.target &&
      (conn.source.type === 'bpmn:Task' || conn.target.type === 'bpmn:Task' ||
       conn.source.type === 'bpmn:UserTask' || conn.target.type === 'bpmn:UserTask') &&
      !getElementName(conn.source).startsWith('Aprobar ') &&
      !getElementName(conn.target).startsWith('Aprobar ')
    );
    
    const isRoleUsedElsewhere = connectionsToCheck.length > 0;
    
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

// IMPROVED FORCE FIX FOR A ELEMENT DELETION (Based on working commit 34bdc7c)
window.forceFixAElementDeletion = function() {
  console.log('🔧 FORCING A element deletion fix (based on working commit)...');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Missing bpmnModeler or rasciMatrixData');
    return;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const modeling = window.bpmnModeler.get('modeling');
  
  // Build expected approval elements from current matrix
  const expectedApprovalElements = new Set();
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        expectedApprovalElements.add(`Aprobar ${roleName}`);
      }
    });
  });
  
  console.log(`📋 Expected approval elements: [${Array.from(expectedApprovalElements).join(', ')}]`);
  
  // Find ALL approval elements in the diagram
  const allApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ') &&
    (element.type === 'bpmn:UserTask' || element.type === 'bpmn:IntermediateThrowEvent')
  );
  
  console.log(`🔍 Found ${allApprovalElements.length} approval elements in diagram`);
  allApprovalElements.forEach(el => {
    console.log(`  - ${el.businessObject.name} (${el.type})`);
  });
  
  // Remove elements that shouldn't exist
  let elementsRemoved = 0;
  allApprovalElements.forEach(element => {
    const elementName = element.businessObject.name;
    const shouldExist = expectedApprovalElements.has(elementName);
    
    console.log(`🔍 Checking ${elementName}: should exist = ${shouldExist}`);
    
    if (!shouldExist) {
      console.log(`🗑️ FORCE REMOVING: ${elementName} (${element.type})`);
      
      try {
        // Remove sequence flow connections first
        const sequenceFlowConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' &&
          ((conn.source && conn.source.id === element.id) || 
           (conn.target && conn.target.id === element.id))
        );
        
        // Remove role assignment connections
        const roleConnections = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          ((conn.source && conn.source.id === element.id) || 
           (conn.target && conn.target.id === element.id))
        );
        
        // Get connections for flow restoration before removal
        const incomingFlow = sequenceFlowConnections.find(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
        );
        const outgoingFlow = sequenceFlowConnections.find(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === element.id
        );
        
        // Remove all connections first
        const allConnections = [...sequenceFlowConnections, ...roleConnections];
        if (allConnections.length > 0) {
          console.log(`🔗 Removing ${allConnections.length} connections`);
          modeling.removeElements(allConnections);
        }
        
        // Remove the element itself
        modeling.removeElements([element]);
        elementsRemoved++;
        
        // Restore direct flow connection if both source and target exist
        if (incomingFlow && outgoingFlow) {
          const sourceElement = incomingFlow.source;
          const targetElement = outgoingFlow.target;
          
          console.log(`🔗 Restoring flow: ${getElementName(sourceElement)} -> ${getElementName(targetElement)}`);
          
          // Small delay to ensure removal is complete
          setTimeout(() => {
            try {
              const existingConnection = elementRegistry.find(conn => 
                conn.type === 'bpmn:SequenceFlow' &&
                conn.source && conn.source.id === sourceElement.id &&
                conn.target && conn.target.id === targetElement.id
              );
              
              if (!existingConnection) {
                modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
                console.log(`✅ Flow restored: ${getElementName(sourceElement)} -> ${getElementName(targetElement)}`);
              } else {
                console.log(`ℹ️ Flow already exists: ${getElementName(sourceElement)} -> ${getElementName(targetElement)}`);
              }
            } catch (reconnectError) {
              console.error(`❌ Error restoring flow: ${reconnectError.message}`);
            }
          }, 25);
        }
        
        console.log(`✅ SUCCESSFULLY FORCE REMOVED: ${elementName}`);
        
      } catch (error) {
        console.error(`❌ Error force removing ${elementName}: ${error.message}`);
      }
    }
  });
  
  console.log(`🎉 Force fix completed: ${elementsRemoved} approval elements removed`);
  
  // Additional cleanup for orphaned roles
  setTimeout(() => {
    console.log('🧹 Cleaning up orphaned roles...');
    
    const activeRoles = new Set();
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        if (responsibility && responsibility !== '-' && responsibility !== '') {
          activeRoles.add(roleName);
        }
      });
    });
    
    const allRoles = elementRegistry.filter(element => 
      element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
    );
    
    let rolesRemoved = 0;
    allRoles.forEach(role => {
      const roleName = role.businessObject && role.businessObject.name;
      if (roleName && !activeRoles.has(roleName)) {
        console.log(`🗑️ Removing orphaned role: ${roleName}`);
        try {
          const roleConnections = elementRegistry.filter(conn => 
            (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
            ((conn.source && conn.source.id === role.id) || 
             (conn.target && conn.target.id === role.id))
          );
          
          if (roleConnections.length > 0) {
            modeling.removeElements(roleConnections);
          }
          
          modeling.removeElements([role]);
          rolesRemoved++;
        } catch (error) {
          console.error(`❌ Error removing role ${roleName}: ${error.message}`);
        }
      }
    });
    
    console.log(`✅ Orphaned role cleanup completed: ${rolesRemoved} roles removed`);
  }, 100);
  
  return elementsRemoved;
};

// Quick test function to verify the fix
window.testAElementFix = function() {
  console.log('🧪 Testing A element deletion fix...');
  
  if (!window.rasciMatrixData) {
    console.error('❌ No matrix data available');
    return;
  }
  
  console.log('📊 Current matrix:', window.rasciMatrixData);
  
  // Run the force fix
  const elementsRemoved = window.forceFixAElementDeletion();
  
  console.log(`🎯 Test result: ${elementsRemoved} elements removed`);
  
  // Check remaining approval elements
  setTimeout(() => {
    if (window.bpmnModeler) {
      const elementRegistry = window.bpmnModeler.get('elementRegistry');
      const remainingApprovalElements = elementRegistry.filter(element => 
        element.businessObject && element.businessObject.name &&
        element.businessObject.name.startsWith('Aprobar ')
      );
      
      console.log(`📋 Remaining approval elements: ${remainingApprovalElements.length}`);
      remainingApprovalElements.forEach(el => {
        console.log(`  - ${el.businessObject.name} (${el.type})`);
      });
    }
  }, 200);
};

// FORCE SYNC MATRIX FROM UI AND CLEAN A ELEMENTS
window.forceSyncMatrixAndCleanA = function() {
  console.log('🔄 FORCE SYNC: Actualizando matriz desde UI y limpiando elementos A...');
  
  if (!window.bpmnModeler) {
    console.error('❌ BPMN Modeler not available');
    return;
  }
  
  // Step 1: Try to read the current matrix from the UI
  console.log('📋 Step 1: Reading current matrix from UI...');
  
  // Look for RASCI matrix table in the UI
  const matrixTable = document.querySelector('table[id*="rasci"], table.rasci-matrix, .rasci-table table');
  if (matrixTable) {
    console.log('📊 Found RASCI matrix table, extracting current values...');
    
    const newMatrixData = {};
    const rows = matrixTable.querySelectorAll('tr');
    const headerRow = rows[0];
    const roleTitles = [];
    
    // Extract role names from header
    const headerCells = headerRow.querySelectorAll('th, td');
    for (let i = 1; i < headerCells.length; i++) {
      roleTitles.push(headerCells[i].textContent.trim());
    }
    
    console.log(`📝 Roles found: [${roleTitles.join(', ')}]`);
    
    // Extract task data and current values
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td, th');
      if (cells.length > 0) {
        const taskName = cells[0].textContent.trim();
        if (taskName) {
          newMatrixData[taskName] = {};
          
          for (let j = 1; j < cells.length && j - 1 < roleTitles.length; j++) {
            const roleName = roleTitles[j - 1];
            const cell = cells[j];
            
            // Try to get the current value from input, select, or text content
            let value = '';
            const input = cell.querySelector('input, select, [data-value]');
            if (input) {
              value = input.value || input.getAttribute('data-value') || input.textContent.trim();
            } else {
              value = cell.textContent.trim();
            }
            
            newMatrixData[taskName][roleName] = value;
            console.log(`    ${taskName} -> ${roleName}: "${value}"`);
          }
        }
      }
    }
    
    // Update window.rasciMatrixData with the current UI values
    window.rasciMatrixData = newMatrixData;
    console.log('✅ Matrix data updated from UI:', newMatrixData);
    
  } else {
    console.warn('⚠️ Could not find RASCI matrix table in UI');
    
    // Alternative: Manually update the matrix data by asking user
    console.log('🔧 Manual matrix update required - please specify which A elements should be removed');
    console.log('Current matrix data:', window.rasciMatrixData);
    
    // For now, let's assume the user wants to remove all A elements
    // You can modify this based on what the user tells you
    const updatedMatrix = {};
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      updatedMatrix[taskName] = {};
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        const currentValue = taskRoles[roleName];
        // Convert A values to "-" (user deleted them from UI)
        if (currentValue === 'A') {
          updatedMatrix[taskName][roleName] = '-';
          console.log(`🔄 Converting ${taskName}[${roleName}] from "A" to "-"`);
        } else {
          updatedMatrix[taskName][roleName] = currentValue;
        }
      });
    });
    
    window.rasciMatrixData = updatedMatrix;
    console.log('✅ Matrix data manually updated:', updatedMatrix);
  }
  
  // Step 2: Now run the cleanup with the updated matrix
  console.log('🧹 Step 2: Running A element cleanup with updated matrix...');
  const elementsRemoved = window.forceFixAElementDeletion();
  
  console.log(`🎉 FORCE SYNC completed: ${elementsRemoved} A elements removed`);
  
  // Step 3: Verify the result
  setTimeout(() => {
    if (window.bpmnModeler) {
      const elementRegistry = window.bpmnModeler.get('elementRegistry');
      const remainingApprovalElements = elementRegistry.filter(element => 
        element.businessObject && element.businessObject.name &&
        element.businessObject.name.startsWith('Aprobar ')
      );
      
      console.log(`✅ Final result: ${remainingApprovalElements.length} approval elements remaining`);
      remainingApprovalElements.forEach(el => {
        console.log(`  - ${el.businessObject.name} (${el.type})`);
      });
      
      if (remainingApprovalElements.length === 0) {
        console.log('🎊 SUCCESS: All A elements have been successfully removed!');
      }
    }
  }, 300);
  
  return elementsRemoved;
};

// QUICK MANUAL FIX: Remove all A elements regardless of matrix state
window.forceRemoveAllAElements = function() {
  console.log('💥 NUCLEAR OPTION: Removing ALL A elements from canvas...');
  
  if (!window.bpmnModeler) {
    console.error('❌ BPMN Modeler not available');
    return 0;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const modeling = window.bpmnModeler.get('modeling');
  
  // Find ALL approval elements regardless of matrix state
  const allApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ') &&
    (element.type === 'bpmn:UserTask' || element.type === 'bpmn:IntermediateThrowEvent')
  );
  
  console.log(`🔍 Found ${allApprovalElements.length} approval elements to force remove`);
  
  let elementsRemoved = 0;
  allApprovalElements.forEach(element => {
    const elementName = element.businessObject.name;
    console.log(`💥 FORCE REMOVING: ${elementName} (${element.type})`);
    
    try {
      // Get connections for flow restoration
      const incomingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
      );
      const outgoingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === element.id
      );
      
      // Remove role connections
      const roleConnections = elementRegistry.filter(conn => 
        (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
        ((conn.source && conn.source.id === element.id) || 
         (conn.target && conn.target.id === element.id))
      );
      
      // Remove all connections
      const allConnections = [...incomingConnections, ...outgoingConnections, ...roleConnections];
      if (allConnections.length > 0) {
        modeling.removeElements(allConnections);
      }
      
      // Remove the element
      modeling.removeElements([element]);
      elementsRemoved++;
      
      // Restore flow if needed
      if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
        const sourceElement = incomingConnections[0].source;
        const targetElement = outgoingConnections[0].target;
        
        setTimeout(() => {
          try {
            const existingConnection = elementRegistry.find(conn => 
              conn.type === 'bpmn:SequenceFlow' &&
              conn.source && conn.source.id === sourceElement.id &&
              conn.target && conn.target.id === targetElement.id
            );
            
            if (!existingConnection) {
              modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
              console.log(`✅ Flow restored: ${getElementName(sourceElement)} -> ${getElementName(targetElement)}`);
            }
          } catch (reconnectError) {
            console.error(`❌ Error restoring flow: ${reconnectError.message}`);
          }
        }, 10 * elementsRemoved); // Stagger the reconnections
      }
      
      console.log(`✅ SUCCESSFULLY FORCE REMOVED: ${elementName}`);
      
    } catch (error) {
      console.error(`❌ Error force removing ${elementName}: ${error.message}`);
    }
  });
  
  console.log(`💥 NUCLEAR OPTION completed: ${elementsRemoved} approval elements removed`);
  
  // Also update the matrix to reflect the removal
  if (window.rasciMatrixData) {
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        if (taskRoles[roleName] === 'A') {
          taskRoles[roleName] = '-';
          console.log(`🔄 Matrix updated: ${taskName}[${roleName}] = "-"`);
        }
      });
    });
    console.log('✅ Matrix data synchronized after force removal');
  }
  
  return elementsRemoved;
};

// TESTING AND DEBUGGING FUNCTIONS FOR COMMIT 34BDC7C COMPATIBILITY

// Test function to verify A element deletion works like in commit 34bdc7c
window.testAElementDeletionFixed = function() {
  console.log('🧪 Testing A element deletion (fixed version based on commit 34bdc7c)...');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Modeler or matrix data not available');
    return false;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  // Show current state
  const currentApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`🔍 Current approval elements: [${currentApprovalElements.map(el => el.businessObject.name).join(', ')}]`);
  console.log(`🔍 Current matrix:`, window.rasciMatrixData);
  
  // Force cleanup using the improved function
  const results = { elementsRemoved: 0 };
  forceCleanupAElements(window.bpmnModeler, window.rasciMatrixData, results);
  
  // Check state after cleanup
  setTimeout(() => {
    const remainingApprovalElements = elementRegistry.filter(element => 
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    
    console.log(`✅ After cleanup - Remaining approval elements: [${remainingApprovalElements.map(el => el.businessObject.name).join(', ')}]`);
    console.log(`📊 Elements removed: ${results.elementsRemoved}`);
    
    // Verify flow restoration
    const allTasks = elementRegistry.filter(element => 
      ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask'].includes(element.type)
    );
    
    allTasks.forEach(task => {
      const outgoingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === task.id
      );
      console.log(`🔗 Task ${getElementName(task)}: ${outgoingConnections.length} outgoing connections`);
    });
    
    return true;
  }, 200);
};

// Verify current state and what should be cleaned
window.debugCurrentAElementState = function() {
  console.log('🔍 DEBUG: Current A element state analysis...');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Modeler or matrix data not available');
    return;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  // Current approval elements in diagram
  const currentApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`📊 Current approval elements in diagram: ${currentApprovalElements.length}`);
  currentApprovalElements.forEach(el => {
    console.log(`  - ${el.businessObject.name} (${el.type}, id: ${el.id})`);
  });
  
  // Expected approval elements according to matrix
  const expectedApprovalElements = new Set();
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility === 'A') {
        expectedApprovalElements.add(`Aprobar ${roleName}`);
      }
    });
  });
  
  console.log(`📊 Expected approval elements according to matrix: ${expectedApprovalElements.size}`);
  Array.from(expectedApprovalElements).forEach(name => {
    console.log(`  + ${name}`);
  });
  
  // Elements that should be removed
  const elementsToRemove = currentApprovalElements.filter(element => {
    const elementName = element.businessObject.name;
    return !expectedApprovalElements.has(elementName);
  });
  
  console.log(`📊 Elements that should be removed: ${elementsToRemove.length}`);
  elementsToRemove.forEach(el => {
    console.log(`  🗑️ ${el.businessObject.name} (${el.type})`);
  });
  
  // Check flow connections for elements that should be removed
  elementsToRemove.forEach(element => {
    const incomingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
    );
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === element.id
    );
    
    console.log(`🔗 ${element.businessObject.name}: ${incomingConnections.length} incoming, ${outgoingConnections.length} outgoing`);
    
    if (incomingConnections.length > 0) {
      const sourceElement = incomingConnections[0].source;
      console.log(`  ⬅️ From: ${getElementName(sourceElement)}`);
    }
    
    if (outgoingConnections.length > 0) {
      const targetElement = outgoingConnections[0].target;
      console.log(`  ➡️ To: ${getElementName(targetElement)}`);
    }
  });
  
  return {
    currentElements: currentApprovalElements,
    expectedElements: Array.from(expectedApprovalElements),
    elementsToRemove: elementsToRemove
  };
};

// Enhanced test function for the improved cleanup
window.testEnhancedAElementCleanup = function() {
  console.log('🧪 Testing enhanced A element cleanup...');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Modeler or matrix data not available');
    return false;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  
  // Show current state
  const currentApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  console.log(`🔍 BEFORE - Approval elements: [${currentApprovalElements.map(el => el.businessObject.name).join(', ')}]`);
  
  // Use the enhanced cleanup function
  const results = { elementsRemoved: 0 };
  forceCleanupAElementsEnhanced(window.bpmnModeler, window.rasciMatrixData, results);
  
  // Check state after cleanup
  setTimeout(() => {
    const remainingApprovalElements = elementRegistry.filter(element => 
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    
    console.log(`✅ AFTER - Remaining approval elements: [${remainingApprovalElements.map(el => el.businessObject.name).join(', ')}]`);
    console.log(`📊 Elements removed: ${results.elementsRemoved}`);
    
    // Verify connections
    const allTasks = elementRegistry.filter(element => 
      ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ScriptTask'].includes(element.type)
    );
    
    console.log('🔗 Connection status after cleanup:');
    allTasks.forEach(task => {
      const outgoingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === task.id
      );
      console.log(`  ${getElementName(task)}: ${outgoingConnections.length} outgoing connections`);
    });
    
    if (remainingApprovalElements.length === 0) {
      console.log('🎊 SUCCESS: All orphaned A elements have been completely removed!');
    } else {
      console.log('⚠️ Some approval elements still remain - may need manual intervention');
    }
    
    return true;
  }, 300);
};

// Manual force removal of specific element by name
window.forceRemoveElementByName = function(elementName) {
  console.log(`🗑️ Manual force removal of element: ${elementName}`);
  
  if (!window.bpmnModeler) {
    console.error('❌ Modeler not available');
    return false;
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const modeling = window.bpmnModeler.get('modeling');
  
  const element = elementRegistry.find(el => 
    el.businessObject && el.businessObject.name === elementName
  );
  
  if (!element) {
    console.error(`❌ Element not found: ${elementName}`);
    return false;
  }
  
  console.log(`🎯 Found element: ${elementName} (${element.type}, id: ${element.id})`);
  
  // Force remove function
  try {
    // Step 1: Remove all connections first
    const allConnections = elementRegistry.filter(conn => 
      (conn.source && conn.source.id === element.id) || 
      (conn.target && conn.target.id === element.id)
    );
    
    console.log(`🔗 Found ${allConnections.length} connections to remove`);
    
    if (allConnections.length > 0) {
      allConnections.forEach(conn => {
        try {
          modeling.removeConnection(conn);
          console.log(`✅ Removed connection: ${conn.type}`);
        } catch (connError) {
          console.error(`❌ Error removing connection: ${connError.message}`);
        }
      });
    }
    
    // Step 2: Remove the element itself
    modeling.removeShape(element);
    console.log(`✅ Element removed successfully: ${elementName}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error in force remove: ${error.message}`);
    return false;
  }
};

// Complete diagnostic and cleanup function
window.diagnoseAndCleanupAElements = function() {
  console.log('🔬 DIAGNOSTIC: Complete A element analysis and cleanup...');
  
  if (!window.bpmnModeler || !window.rasciMatrixData) {
    console.error('❌ Prerequisites not available');
    return false;
  }
  
  // Step 1: Diagnose current state
  console.log('📊 Step 1: Current state analysis');
  const diagnosis = window.debugCurrentAElementState();
  
  if (!diagnosis || diagnosis.elementsToRemove.length === 0) {
    console.log('✅ No elements need to be removed');
    return true;
  }
  
  // Step 2: Try enhanced cleanup
  console.log('🧹 Step 2: Enhanced cleanup');
  window.testEnhancedAElementCleanup();
  
  // Step 3: Manual cleanup if needed
  setTimeout(() => {
    const elementRegistry = window.bpmnModeler.get('elementRegistry');
    const stillRemaining = elementRegistry.filter(element => 
      element.businessObject && element.businessObject.name &&
      element.businessObject.name.startsWith('Aprobar ')
    );
    
    // Filter to only those that shouldn't exist
    const expectedApprovalElements = new Set();
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      const taskRoles = window.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        if (taskRoles[roleName] === 'A') {
          expectedApprovalElements.add(`Aprobar ${roleName}`);
        }
      });
    });
    
    const orphanedElements = stillRemaining.filter(element => 
      !expectedApprovalElements.has(element.businessObject.name)
    );
    
    if (orphanedElements.length > 0) {
      console.log(`⚠️ Step 3: Manual cleanup needed for ${orphanedElements.length} elements`);
      orphanedElements.forEach(element => {
        console.log(`🗑️ Manual removal: ${element.businessObject.name}`);
        window.forceRemoveElementByName(element.businessObject.name);
      });
    } else {
      console.log('🎊 All cleanup completed successfully!');
    }
  }, 500);
  
  return true;
};
