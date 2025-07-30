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

// Force cleanup of A elements after mapping to ensure proper deletion
function forceCleanupAElements(modeler, matrix, results) {
  console.log('🧹 Forcing cleanup of A elements specifically...');
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // Get all approval elements currently in the diagram
  const allApprovalElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ') &&
    (element.type === 'bpmn:UserTask' || element.type === 'bpmn:IntermediateThrowEvent')
  );
  
  console.log(`🔍 Found ${allApprovalElements.length} approval elements in diagram`);
  
  // Determine which approval elements should exist according to current matrix
  const expectedApprovalElements = new Set();
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
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
    const shouldExist = expectedApprovalElements.has(elementName);
    console.log(`🔍 Checking ${elementName}: should exist = ${shouldExist}`);
    return !shouldExist;
  });
  
  console.log(`🗑️ Found ${orphanedApprovalElements.length} orphaned approval elements to remove`);
  
  if (orphanedApprovalElements.length > 0) {
    orphanedApprovalElements.forEach(element => {
      const elementName = element.businessObject.name;
      console.log(`🗑️ Removing orphaned approval element: ${elementName} (${element.type})`);
      
      try {
        // Get connections before removal for potential reconnection
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
        );
        const outgoingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === element.id
        );
        
        // Remove role connections first
        const roleConnections = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          ((conn.source && conn.source.id === element.id) || 
           (conn.target && conn.target.id === element.id))
        );
        
        if (roleConnections.length > 0) {
          modeling.removeElements(roleConnections);
        }
        
        // Remove the approval element
        modeling.removeElements([element]);
        
        // Reconnect flow if necessary
        if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
          const sourceElement = incomingConnections[0].source;
          const targetElement = outgoingConnections[0].target;
          
          setTimeout(() => {
            try {
              // Check if connection already exists
              const existingConnection = elementRegistry.find(conn => 
                conn.type === 'bpmn:SequenceFlow' &&
                conn.source && conn.source.id === sourceElement.id &&
                conn.target && conn.target.id === targetElement.id
              );
              
              if (!existingConnection) {
                modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
                console.log(`✅ Reconnected flow: ${getElementName(sourceElement)} -> ${getElementName(targetElement)}`);
              }
            } catch (reconnectError) {
              console.error(`❌ Error reconnecting flow: ${reconnectError.message}`);
            }
          }, 25);
        }
        
        console.log(`✅ Successfully removed: ${elementName}`);
        results.elementsRemoved++;
        
      } catch (error) {
        console.error(`❌ Error removing ${elementName}: ${error.message}`);
      }
    });
    
    console.log(`✅ Removed ${orphanedApprovalElements.length} orphaned approval elements`);
  } else {
    console.log('✅ No orphaned approval elements found');
  }
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
    forceCleanupAElements(modeler, matrix, results);
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
    console.log('📋 Matrix only contains "-" values or empty cells, only cleaning up...');
    
    // Only cleanup orphaned elements, don't create new ones
    try {
      cleanupOrphanedElements(window.bpmnModeler);
      cleanupUnusedRoles(window.bpmnModeler);
      console.log('✅ Cleanup completed for empty matrix');
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
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
    
    // Execute EXACTLY the same function as manual mapping
    // This ensures identical behavior including flow restoration
    console.log('🚀 Auto-mapping: Using IDENTICAL logic as manual mapping');
    const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
    console.log('✅ Auto-mapping completed with results:', results);
    
    // Additional verification and cleanup for A elements
    setTimeout(() => {
      console.log('🔍 Final verification of A element cleanup...');
      const finalResults = { elementsRemoved: 0 };
      forceCleanupAElements(window.bpmnModeler, window.rasciMatrixData, finalResults);
      if (finalResults.elementsRemoved > 0) {
        console.log(`🧹 Additional cleanup removed ${finalResults.elementsRemoved} orphaned A elements`);
      }
    }, 100);
    
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
