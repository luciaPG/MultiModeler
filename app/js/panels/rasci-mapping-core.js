// RASCI Mapping Core - Clean Version
// Core functionality for RASCI to RALph mapping

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
    
    const existingRoles = elementRegistry.filter(element => 
      element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
    );
    
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
      const row = Math.floor(existingRoles.length / maxRolesPerRow);
      const col = existingRoles.length % maxRolesPerRow;
      
      position = {
        x: startX + (col * (roleWidth + margin)),
        y: startY + (row * (roleHeight + margin))
      };
      
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
          // Handle error silently
        }
      }
    });
    
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
        // Handle error silently
      }
    } else if (remainingConnections.length === 1) {
      const remainingRole = remainingConnections[0].source;
      try {
        modeling.removeElements([existingAndGate]);
        modeling.connect(bpmnTask, remainingRole, { type: 'RALph:ResourceArc' });
        results.roleAssignments++;
        return null;
      } catch (error) {
        // Handle error silently
      }
    }
    
    return existingAndGate;
  }
  
  try {
    const rootElement = canvas.getRootElement();
    
    const existingAndGates = elementRegistry.filter(element => 
      element.type === 'RALph:Complex-Assignment-AND'
    );
    
    let position = { x: bpmnTask.x + 200, y: bpmnTask.y };
    
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
      
      if (attempts % 2 === 0) {
        position.y += gateHeight + margin;
      } else {
        position.x += gateWidth + margin;
        position.y = bpmnTask.y;
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

export {
  getElementName,
  saveOriginalFlow,
  findBpmnTaskByName,
  createRalphRole,
  findExistingAndGate,
  createAndGate,
  createSimpleAssignment,
  originalFlowMap,
  pendingReconnections
}; 