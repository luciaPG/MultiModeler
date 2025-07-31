// RASCI Mapping Main - Clean Version
// Main orchestration functions for RASCI to RALph mapping

import { 
  getElementName, 
  saveOriginalFlow, 
  findBpmnTaskByName, 
  createRalphRole, 
  findExistingAndGate, 
  createAndGate, 
  createSimpleAssignment,
  originalFlowMap 
} from './core-functions.js';

import { 
  cleanupOrphanedElements, 
  completeRasciCleanup, 
  cleanupUnusedRoles 
} from './cleanup-utils.js';

import { 
  createSequentialSpecialElements, 
  restoreBpmnFlow, 
  restoreFlowByElementNames,
  restoreFlowAfterApprovalRemoval
} from './element-manager.js';

import { 
  pendingReconnections
} from './core-functions.js';

function handleRolesAndAssignments(modeler, matrix, results) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
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
  
  const allApprovalTasks = elementRegistry.filter(element => 
    element.type === 'bpmn:UserTask' && 
    element.businessObject && element.businessObject.name &&
    element.businessObject.name.startsWith('Aprobar ')
  );
  
  allApprovalTasks.forEach(approvalTask => {
    const taskName = approvalTask.businessObject.name;
    if (!expectedApprovalTasks.has(taskName)) {
      try {
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target && conn.target.id === approvalTask.id
        );
        const outgoingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.source && conn.source.id === approvalTask.id
        );
        
        const roleConnections = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          conn.source && conn.source.id === approvalTask.id
        );
        
        if (roleConnections.length > 0) {
          modeling.removeElements(roleConnections);
        }
        
        if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
          const sourceElement = incomingConnections[0].source;
          const targetElement = outgoingConnections[0].target;
          
          modeling.removeElements([approvalTask]);
          
          setTimeout(() => {
            try {
              modeling.connect(sourceElement, targetElement, { type: 'bpmn:SequenceFlow' });
            } catch (reconnectError) {
              // Handle error silently
            }
          }, 50);
        } else {
          modeling.removeElements([approvalTask]);
        }
        
        results.elementsRemoved++;
      } catch (error) {
        // Handle error silently
      }
    }
  });
  
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    
    if (!bpmnTask) return;
    
    const responsibleRoles = [];
    const supportRoles = [];
    const approveRoles = [];
    
    Object.keys(taskRoles).forEach(roleKey => {
      const responsibility = taskRoles[roleKey];
      
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
    
    if (responsibleRoles.length === 0 && supportRoles.length === 0) {
      const existingAndGate = findExistingAndGate(modeler, bpmnTask);
      if (existingAndGate) {
        try {
          modeling.removeElements([existingAndGate]);
        } catch (error) {
          // Handle error silently
        }
      }
    } else if (responsibleRoles.length === 1 && supportRoles.length === 0) {
      const roleName = responsibleRoles[0];
      const existingAndGate = findExistingAndGate(modeler, bpmnTask);
      
      if (existingAndGate) {
        try {
          modeling.removeElements([existingAndGate]);
        } catch (error) {
          // Handle error silently
        }
      }
      
      createRalphRole(modeler, roleName, results);
      
      const existingDirectConnection = elementRegistry.filter(conn => 
        (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
        conn.source && conn.source.id === bpmnTask.id &&
        conn.target && conn.target.businessObject && conn.target.businessObject.name === roleName
      );
      
      if (existingDirectConnection.length === 0) {
        createSimpleAssignment(modeler, bpmnTask, roleName, results);
      }
    } else {
      const allRoles = [...responsibleRoles, ...supportRoles];
      
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
            // Handle error silently
          }
        }
      });
      
      allRoles.forEach(roleName => {
        createRalphRole(modeler, roleName, results);
      });
      
      createAndGate(modeler, bpmnTask, allRoles, results);
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
  
  // ✨ LIMPIEZA PREVIA: Eliminar elementos duplicados antes de empezar
  // Esto evita que se acumulen elementos cuando se ejecuta mapeo manual después del automático
  const cleanupCount = completeRasciCleanup(modeler, matrix);
  
  const hasSpecialElements = elementRegistry.filter(element => {
    const name = getElementName(element);
    return name && (['Consultar ', 'Aprobar ', 'Informar '].some(prefix => name.startsWith(prefix)));
  }).length > 0;
  
  originalFlowMap.clear();
  saveOriginalFlow(modeler);
  
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: cleanupCount // Contar elementos eliminados en la limpieza previa
  };
  
  const taskMappings = {};
  Object.keys(matrix).forEach(taskName => {
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    if (bpmnTask) {
      taskMappings[taskName] = bpmnTask;
    }
  });
  
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
      createSequentialSpecialElements(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results);
      sequencesCreated++;
    }
  });
  
  saveOriginalFlow(modeler);
  
  handleRolesAndAssignments(modeler, matrix, results);
  
  cleanupOrphanedElements(modeler);
  
  setTimeout(() => {
    completeRasciCleanup(modeler, matrix);
  }, 50);
  
  restoreBpmnFlow(modeler);
  
  setTimeout(() => {
    checkAllTasksForDirectConnectionRestoration(modeler);
  }, 100);
  
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

export function executeSmartRasciMapping(modeler, matrix) {
  if (!modeler) return { error: 'Modeler no disponible' };
  
  const elementRegistry = modeler.get('elementRegistry');
  if (!elementRegistry) return { error: 'elementRegistry no disponible' };
  
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: 0
  };
  
  const hasExistingSequences = elementRegistry.filter(element => {
    const name = getElementName(element);
    return name && (['Consultar ', 'Aprobar ', 'Informar '].some(prefix => name.startsWith(prefix)));
  }).length > 0;
  
  if (!hasExistingSequences) {
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
    
    restoreBpmnFlow(modeler);
  }
  
  handleRolesAndAssignments(modeler, matrix, results);
  
  cleanupUnusedRoles(modeler);
  
  setTimeout(() => {
    checkAllTasksForDirectConnectionRestoration(modeler);
  }, 50);
  
  try {
    localStorage.setItem('previousRasciMatrixData', JSON.stringify(matrix));
  } catch (error) {
    // Handle error silently
  }
  
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
      
      if (responsibleRoles.length === 1 && supportRoles.length === 0) {
        const existingAndGate = findExistingAndGate(modeler, bpmnTask);
        if (existingAndGate) {
          const modeling = modeler.get('modeling');
          try {
            modeling.removeElements([existingAndGate]);
          } catch (error) {
            // Handle error silently
          }
        }
        
        restoreDirectConnectionIfNeeded(modeler, bpmnTask);
      }
    }
  });
}

function preserveElementLabels(modeler, matrix) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
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
        let element = elementRegistry.find(el => 
          el.type === expectedType && 
          el.businessObject && 
          el.businessObject.name === expectedName
        );
        
        if (!element) {
          const candidateElements = elementRegistry.filter(el => 
            el.type === expectedType &&
            (!el.businessObject || !el.businessObject.name || 
             el.businessObject.name === '' || 
             el.businessObject.name === 'undefined')
          );
          
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
            }
          } catch (error) {
            // Handle error silently
          }
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
                  // Handle error silently
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
    // Handle error silently
  }
}

function restoreDirectConnectionIfNeeded(modeler, bpmnTask) {
  const taskName = getElementName(bpmnTask);
  const responsibleRole = findResponsibleRoleForTask(taskName);
  const supportRoles = getSupportRolesForTask(taskName);
  
  if (responsibleRole) {
    const modeling = modeler.get('modeling');
    const elementRegistry = modeler.get('elementRegistry');
    
    let roleElement = elementRegistry.find(element => 
      (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
      element.businessObject && element.businessObject.name === responsibleRole
    );
    
    if (!roleElement) {
      const results = { rolesCreated: 0 };
      roleElement = createRalphRole(modeler, responsibleRole, results);
    }
    
    if (roleElement) {
      const existingDirectConnection = elementRegistry.filter(conn => 
        (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
        conn.source && conn.source.id === bpmnTask.id &&
        conn.target && conn.target.id === roleElement.id
      );
      
      if (existingDirectConnection.length === 0) {
        try {
          modeling.connect(bpmnTask, roleElement, { type: 'RALph:ResourceArc' });
          return true;
        } catch (error) {
          return false;
        }
      } else {
        return true;
      }
    } else {
      return false;
    }
  } else {
    return false;
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

function setupElementDeletionListener() {
  if (window.bpmnModeler && !window.rasciEventListenerConfigured) {
    const eventBus = window.bpmnModeler.get('eventBus');
    const elementRegistry = window.bpmnModeler.get('elementRegistry');
    
    const pendingAndGateInfo = new Map();
    
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
      
      if (elementToDelete.type === 'RALph:Complex-Assignment-AND') {
        const taskConnections = elementRegistry.filter(conn => 
          conn.type === 'RALph:ResourceArc' &&
          conn.target && conn.target.id === elementToDelete.id &&
          conn.source && (conn.source.type === 'bpmn:Task' || 
                         conn.source.type === 'bpmn:UserTask' ||
                         conn.source.type === 'bpmn:ServiceTask' ||
                         conn.source.type === 'bpmn:ScriptTask')
        );
        
        if (taskConnections.length > 0) {
          const bpmnTask = taskConnections[0].source;
          const taskName = getElementName(bpmnTask);
          
          pendingAndGateInfo.set(elementToDelete.id, {
            taskId: bpmnTask.id,
            taskName: taskName
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
        
        if (removedElement.type === 'RALph:Complex-Assignment-AND') {
          const andGateInfo = pendingAndGateInfo.get(removedElement.id);
          if (andGateInfo) {
            setTimeout(() => {
              checkAndRestoreDirectConnectionsAfterAndGateDeletion(window.bpmnModeler, removedElement);
            }, 100);
            pendingAndGateInfo.delete(removedElement.id);
          } else {
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
      restoreFlowAfterApprovalRemoval(modeler);
    }
  } else {
    restoreFlowAfterApprovalRemoval(modeler);
  }
}

function checkAndRestoreDirectConnectionsAfterAndGateDeletion(modeler, deletedAndGate) {
  if (!window.rasciMatrixData) {
    return;
  }
  
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    const taskRoles = window.rasciMatrixData[taskName];
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    
    if (!bpmnTask) return;
    
    const currentAndGate = findExistingAndGate(modeler, bpmnTask);
    
    if (!currentAndGate) {
      const responsibleRoles = Object.keys(taskRoles).filter(roleName => 
        taskRoles[roleName] === 'R'
      );
      const supportRoles = Object.keys(taskRoles).filter(roleName => 
        taskRoles[roleName] === 'S'
      );
      
      if (responsibleRoles.length === 1 && supportRoles.length === 0) {
        const elementRegistry = modeler.get('elementRegistry');
        
        const existingDirectConnection = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          conn.source && conn.source.id === bpmnTask.id &&
          conn.target && conn.target.businessObject && 
          conn.target.businessObject.name === responsibleRoles[0]
        );
        
        if (existingDirectConnection.length === 0) {
          restoreDirectConnectionIfNeeded(modeler, bpmnTask);
        }
      } else if (responsibleRoles.length === 1 && supportRoles.length > 0) {
        const elementRegistry = modeler.get('elementRegistry');
        const modeling = modeler.get('modeling');
        
        const existingDirectConnection = elementRegistry.filter(conn => 
          (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
          conn.source && conn.source.id === bpmnTask.id &&
          conn.target && conn.target.businessObject && 
          conn.target.businessObject.name === responsibleRoles[0]
        );
        
        if (existingDirectConnection.length === 0) {
          restoreDirectConnectionIfNeeded(modeler, bpmnTask);
        }
        
        supportRoles.forEach(supportRoleName => {
          const roleElement = elementRegistry.find(element => 
            (element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role') && 
            element.businessObject && element.businessObject.name === supportRoleName
          );
          
          if (roleElement) {
            const roleConnections = elementRegistry.filter(conn => 
              (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
              ((conn.source && conn.source.id === roleElement.id) || 
               (conn.target && conn.target.id === roleElement.id))
            );
            
            if (roleConnections.length === 0) {
              try {
                modeling.removeElements([roleElement]);
              } catch (error) {
                // Handle error silently
              }
            }
          }
        });
      }
    }
  });
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
        // Handle error silently
      }
    }
  }
}

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
    
    if (!window.rasciAutoMapping) {
      window.rasciAutoMapping = {
        enabled: false,
        debounceTimer: null,
        smartTimer: null,
        enable() { this.enabled = true; },
        disable() { this.enabled = false; },
        toggle() { this.enabled = !this.enabled; return this.enabled; },
        triggerMapping() { if(this.enabled) window.onRasciMatrixUpdated(); },
        triggerSmartMapping() { if(this.enabled) window.onRasciMatrixUpdated(); }
      };
    }
  }, 1000);
} 