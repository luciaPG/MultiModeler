// RASCI Mapping Cleanup - Clean Version
// Cleanup functionality for RASCI mapping

import { rasciManager } from '../core/matrix-manager.js';
import { getElementName, originalFlowMap } from './core-functions.js';

// Función auxiliar para verificar si un elemento está conectado a alguna de las tareas esperadas
function isConnectedToTaskInMatrix(modeler, sourceElement, expectedTaskNames, visited = new Set()) {
  if (!sourceElement || !expectedTaskNames || visited.has(sourceElement.id)) {
    return false;
  }
  
  const elementName = getElementName(sourceElement);
  if (elementName && expectedTaskNames.has(elementName)) {
    return true;
  }
  
  visited.add(sourceElement.id);
  
  const elementRegistry = modeler.get('elementRegistry');
  const incomingConnections = elementRegistry.filter(conn => 
    conn.type === 'bpmn:SequenceFlow' && 
    conn.target && conn.target.id === sourceElement.id
  );
  
  for (const conn of incomingConnections) {
    if (isConnectedToTaskInMatrix(modeler, conn.source, expectedTaskNames, visited)) {
      return true;
    }
  }
  
  return false;
}

function cleanupOrphanedElements(modeler) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  const elementsToRemove = [];
  const connectionsToRemove = [];
  
  const activeRoles = new Set();
  if (rasciManager.rasciMatrixData) {
    Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
      const taskRoles = rasciManager.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleName => {
        const responsibility = taskRoles[roleName];
        if (responsibility && responsibility !== '-' && responsibility !== '') {
          activeRoles.add(roleName);
        }
      });
    });
  }
  
  elementRegistry.forEach(element => {
    const elementName = element.businessObject && element.businessObject.name;
    
    if (!elementName) return;
    
    const isSpecialElement = ['Consultar ', 'Aprobar ', 'Informar '].some(prefix => 
      elementName.startsWith(prefix)
    );
    
    if (isSpecialElement) {
      let shouldExist = false;
      
      if (rasciManager.rasciMatrixData) {
        Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
          const taskRoles = rasciManager.rasciMatrixData[taskName];
          Object.keys(taskRoles).forEach(roleName => {
            const responsibility = taskRoles[roleName];
            
            if (!responsibility || responsibility === '-' || responsibility === '') {
              return;
            }
            
            let expectedName = null;
            
            if (responsibility === 'C') expectedName = `Consultar ${roleName}`;
            else if (responsibility === 'A') expectedName = `Aprobar ${roleName}`;
            else if (responsibility === 'I') expectedName = `Informar ${roleName}`;
            
            if (expectedName === elementName) {
              shouldExist = true;
            }
          });
        });
      }
      
      if (!shouldExist) {
        elementsToRemove.push(element);
      }
    }
  });
  
  const allRoleElements = elementRegistry.filter(element => 
    element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
  );
  
  allRoleElements.forEach(roleElement => {
    const roleName = roleElement.businessObject && roleElement.businessObject.name;
    if (roleName && !activeRoles.has(roleName)) {
      elementsToRemove.push(roleElement);
    }
  });
  
  const allAndGates = elementRegistry.filter(element => 
    element.type === 'RALph:Complex-Assignment-AND'
  );
  
  allAndGates.forEach(andGate => {
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
      elementsToRemove.push(andGate);
    }
  });
  
  const allConnections = elementRegistry.filter(conn => 
    conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association'
  );
  
  allConnections.forEach(conn => {
    if (conn.source && conn.target) {
      const sourceName = getElementName(conn.source);
      const targetName = getElementName(conn.target);
      
      let shouldRemoveConnection = false;
      
      if ((conn.target.type === 'RALph:RoleRALph' || conn.target.type === 'ralph:Role') && 
          targetName && !activeRoles.has(targetName)) {
        shouldRemoveConnection = true;
      }
      
      if ((conn.source.type === 'RALph:RoleRALph' || conn.source.type === 'ralph:Role') && 
          sourceName && !activeRoles.has(sourceName)) {
        shouldRemoveConnection = true;
      }
      
      if (!shouldRemoveConnection && rasciManager.rasciMatrixData) {
        const isTaskToRole = (conn.source.type.includes('Task') && 
                             (conn.target.type === 'RALph:RoleRALph' || conn.target.type === 'ralph:Role'));
        
        if (isTaskToRole && sourceName && targetName) {
          const taskRoles = rasciManager.rasciMatrixData[sourceName];
          if (taskRoles) {
            const responsibility = taskRoles[targetName];
            if (!responsibility || responsibility === '-' || responsibility === '') {
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
  
  if (connectionsToRemove.length > 0) {
    try {
      modeling.removeElements(connectionsToRemove);
    } catch (e) {
      // Handle error silently
    }
  }
  
  if (elementsToRemove.length > 0) {
    try {
      modeling.removeElements(elementsToRemove);
    } catch (e) {
      // Handle error silently
    }
  }
}

function completeRasciCleanup(modeler, matrix) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  const activeRoles = new Set();
  const expectedApprovalElements = new Map(); // Cambiar a Map para manejar múltiples tareas
  const expectedConsultElements = new Set();
  const expectedInformElements = new Set();
  
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        activeRoles.add(roleName);
        
        if (responsibility === 'A') {
          const specificApprovalElementName = `Aprobar ${roleName} para ${taskName}`;
          const genericApprovalElementName = `Aprobar ${roleName}`;
          
          if (!expectedApprovalElements.has(specificApprovalElementName)) {
            expectedApprovalElements.set(specificApprovalElementName, new Set());
          }
          expectedApprovalElements.get(specificApprovalElementName).add(taskName);
          
          if (!expectedApprovalElements.has(genericApprovalElementName)) {
            expectedApprovalElements.set(genericApprovalElementName, new Set());
          }
          expectedApprovalElements.get(genericApprovalElementName).add(taskName);
        } else if (responsibility === 'C') {
          expectedConsultElements.add(`Consultar ${roleName}`);
        } else if (responsibility === 'I') {
          expectedInformElements.add(`Informar ${roleName}`);
        }
      }
    });
  });
  
  let elementsRemoved = 0;
  
  const specialElementsByParent = new Map();
  
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
      
      // Verificar si esta tarea de aprobación específica está conectada a una tarea que requiere aprobación
      if (shouldKeep) {
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && 
          conn.target && conn.target.id === element.id
        );
        
        let isConnectedToExpectedTask = false;
        for (const conn of incomingConnections) {
          const sourceElement = conn.source;
          if (isConnectedToTaskInMatrix(modeler, sourceElement, expectedApprovalElements.get(elementName))) {
            isConnectedToExpectedTask = true;
            break;
          }
        }
        shouldKeep = isConnectedToExpectedTask;
      }
    } else if (elementName.startsWith('Consultar ')) {
      shouldKeep = expectedConsultElements.has(elementName);
    } else if (elementName.startsWith('Informar ')) {
      shouldKeep = expectedInformElements.has(elementName);
    }
    
    if (!shouldKeep) {
      const incomingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === element.id
      );
      
      if (incomingConnections.length > 0) {
        let parentTask = incomingConnections[0].source;
        
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
  
  specialElementsByParent.forEach((taskInfo, parentTaskName) => {
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
      
      if (taskInfo.elementsToRemove.find(el => el.id === nextElement.id)) {
        currentElement = nextElement;
        continue;
      }
      
      if (!nextElementName || !['Aprobar ', 'Consultar ', 'Informar '].some(prefix => nextElementName.startsWith(prefix))) {
        finalDestination = nextElement;
        break;
      } else {
        finalDestination = nextElement;
        break;
      }
    }
    
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
    
    taskInfo.elementsToRemove.forEach(element => {
      const elementName = element.businessObject.name;
      
      try {
        const roleConnections = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          ((conn.source && conn.source.id === element.id) || 
           (conn.target && conn.target.id === element.id))
        );
        
        if (roleConnections.length > 0) {
          modeling.removeElements(roleConnections);
        }
        
        modeling.removeElements([element]);
        elementsRemoved++;
      } catch (error) {
        // Handle error silently
      }
    });
    
    if (finalDestination) {
      setTimeout(() => {
        try {
          const existingConnection = elementRegistry.find(conn => 
            conn.type === 'bpmn:SequenceFlow' &&
            conn.source && conn.source.id === taskInfo.parentTask.id &&
            conn.target && conn.target.id === finalDestination.id
          );
          
          if (!existingConnection) {
            modeling.connect(taskInfo.parentTask, finalDestination, { type: 'bpmn:SequenceFlow' });
          }
        } catch (reconnectError) {
          // Handle error silently
        }
      }, 50);
    }
  });
  
  setTimeout(() => {
    const allRoles = elementRegistry.filter(element => 
      element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
    );
    
    allRoles.forEach(role => {
      const roleName = role.businessObject && role.businessObject.name;
      if (roleName && !activeRoles.has(roleName)) {
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
          elementsRemoved++;
        } catch (error) {
          // Handle error silently
        }
      }
    });
  }, 100);
  
  return elementsRemoved;
}

function cleanupUnusedRoles(modeler) {
  if (!rasciManager.rasciMatrixData) return;
  
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  const allRoleElements = elementRegistry.filter(element => 
    element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
  );
  
  const rolesWithResponsibilities = new Set();
  Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
    const taskRoles = rasciManager.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      if (taskRoles[roleName] && ['R', 'A', 'S', 'C', 'I'].includes(taskRoles[roleName])) {
        rolesWithResponsibilities.add(roleName);
      }
    });
  });
  
  allRoleElements.forEach(roleElement => {
    const roleName = roleElement.businessObject && roleElement.businessObject.name;
    if (roleName && !rolesWithResponsibilities.has(roleName)) {
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
        // Handle error silently
      }
    }
  });
}

export {
  cleanupOrphanedElements,
  completeRasciCleanup,
  cleanupUnusedRoles
}; 