// RASCI Mapping Main - Clean Version
// Main orchestration functions for RASCI to RALph mapping

import { rasciManager } from '../core/matrix-manager.js';
import { executeRasciToRalphMapping } from './auto-mapper.js';
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

// Función auxiliar para verificar si un elemento está conectado a una tarea específica
function isConnectedToTask(modeler, sourceElement, targetTask, visited = new Set()) {
  if (!sourceElement || !targetTask || visited.has(sourceElement.id)) {
    return false;
  }
  
  if (sourceElement.id === targetTask.id) {
    return true;
  }
  
  visited.add(sourceElement.id);
  
  const elementRegistry = modeler.get('elementRegistry');
  const incomingConnections = elementRegistry.filter(conn => 
    conn.type === 'bpmn:SequenceFlow' && 
    conn.target && conn.target.id === sourceElement.id
  );
  
  for (const conn of incomingConnections) {
    if (isConnectedToTask(modeler, conn.source, targetTask, visited)) {
      return true;
    }
  }
  
  return false;
}

// Función para hacer una limpieza completa de todos los elementos RALph y especiales
function performCompleteCleanup(modeler) {
  
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  let elementsRemoved = 0;
  
  // 1. Eliminar todas las conexiones RALph
  const allRalphConnections = elementRegistry.filter(conn => 
    conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association'
  );
  
  if (allRalphConnections.length > 0) {
    try {
      modeling.removeElements(allRalphConnections);
      elementsRemoved += allRalphConnections.length;
    } catch (e) {
    }
  }
  
  // 2. Eliminar todos los elementos especiales (Aprobar, Consultar, Informar)
  const allSpecialElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    (element.businessObject.name.startsWith('Aprobar ') ||
     element.businessObject.name.startsWith('Consultar ') ||
     element.businessObject.name.startsWith('Informar '))
  );
  
  if (allSpecialElements.length > 0) {
    try {
      modeling.removeElements(allSpecialElements);
      elementsRemoved += allSpecialElements.length;
    } catch (e) {
    }
  }
  
  // 3. Eliminar todos los roles RALph
  const allRalphRoles = elementRegistry.filter(element => 
    element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
  );
  
  if (allRalphRoles.length > 0) {
    try {
      modeling.removeElements(allRalphRoles);
      elementsRemoved += allRalphRoles.length;
    } catch (e) {
    }
  }
  
  // 4. Eliminar todos los AND Gates
  const allAndGates = elementRegistry.filter(element => 
    element.type === 'RALph:Complex-Assignment-AND'
  );
  
  if (allAndGates.length > 0) {
    try {
      modeling.removeElements(allAndGates);
      elementsRemoved += allAndGates.length;
    } catch (e) {
    }
  }
  
  return elementsRemoved;
}

// Función para hacer una limpieza selectiva según la nueva matriz
function performSelectiveCleanup(modeler, matrix) {
  
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  let elementsRemoved = 0;
  
  // Crear sets de elementos que deberían existir según la nueva matriz
  const expectedRoles = new Set();
  const expectedSpecialElements = new Set();
  
  Object.keys(matrix).forEach(taskName => {
    const taskRoles = matrix[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        expectedRoles.add(roleName);
        
        if (responsibility === 'A') {
          expectedSpecialElements.add(`Aprobar ${taskName}`);
          expectedSpecialElements.add(`Aprobar ${roleName} para ${taskName}`);
          expectedSpecialElements.add(`Aprobar ${roleName}`);
        } else if (responsibility === 'C') {
          expectedSpecialElements.add(`Consultar ${roleName}`);
        } else if (responsibility === 'I') {
          expectedSpecialElements.add(`Informar ${roleName}`);
        }
      }
    });
  });
  
  // 1. Eliminar roles que ya no están en la matriz
  const currentRoles = elementRegistry.filter(element => 
    element.type === 'RALph:RoleRALph' || element.type === 'ralph:Role'
  );
  
  const rolesToRemove = currentRoles.filter(role => {
    const roleName = role.businessObject && role.businessObject.name;
    return roleName && !expectedRoles.has(roleName);
  });
  
  if (rolesToRemove.length > 0) {
    try {
      modeling.removeElements(rolesToRemove);
      elementsRemoved += rolesToRemove.length;
    } catch (e) {
    }
  }
  
  // 2. Eliminar elementos especiales que ya no están en la matriz
  const currentSpecialElements = elementRegistry.filter(element => 
    element.businessObject && element.businessObject.name &&
    (element.businessObject.name.startsWith('Aprobar ') ||
     element.businessObject.name.startsWith('Consultar ') ||
     element.businessObject.name.startsWith('Informar '))
  );
  
  const specialElementsToRemove = currentSpecialElements.filter(element => {
    const elementName = element.businessObject.name;
    return !expectedSpecialElements.has(elementName);
  });
  
  if (specialElementsToRemove.length > 0) {
    try {
      modeling.removeElements(specialElementsToRemove);
      elementsRemoved += specialElementsToRemove.length;
    } catch (e) {
    }
  }
  
  // 3. Limpiar conexiones huérfanas
  const orphanedConnections = elementRegistry.filter(conn => 
    (conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association') &&
    (!conn.source || !conn.target || 
     !elementRegistry.get(conn.source.id) || 
     !elementRegistry.get(conn.target.id))
  );
  
  if (orphanedConnections.length > 0) {
    try {
      modeling.removeElements(orphanedConnections);
      elementsRemoved += orphanedConnections.length;
    } catch (e) {
    }
  }
  
  return elementsRemoved;
}

function handleRolesAndAssignments(modeler, matrix, results) {
  
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // 🧹 PASO 0: Eliminar TODAS las conexiones RALph existentes antes de crear nuevas
  const existingRalphConnections = elementRegistry.filter(conn => 
    conn.type === 'RALph:ResourceArc' || conn.type === 'bpmn:Association'
  );
  
  if (existingRalphConnections.length > 0) {
    try {
      modeling.removeElements(existingRalphConnections);
    } catch (e) {
    }
  }
  
  // ⏭️ PASO 1: Crear roles y asignaciones de forma limpia
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
    
    
    // Limpiar AND Gates existentes para esta tarea
    const existingAndGate = findExistingAndGate(modeler, bpmnTask);
    if (existingAndGate) {
      try {
        modeling.removeElements([existingAndGate]);
      } catch (error) {
      }
    }
    
    // Manejar roles R y S
    if (responsibleRoles.length === 0 && supportRoles.length === 0) {
    } else if (responsibleRoles.length === 1 && supportRoles.length === 0) {
      // Caso simple: un solo rol responsable
      const roleName = responsibleRoles[0];
      
      createRalphRole(modeler, roleName, results);
      createSimpleAssignment(modeler, bpmnTask, roleName, results);
    } else {
      // Caso complejo: múltiples roles (crear AND Gate)
      const allRoles = [...responsibleRoles, ...supportRoles];
      
      allRoles.forEach(roleName => {
        createRalphRole(modeler, roleName, results);
      });
      
      createAndGate(modeler, bpmnTask, allRoles, results);
    }
    
    // Manejar roles A - crear asignaciones para tareas de aprobación existentes
    if (approveRoles.length > 0) {
      
      for (const roleName of approveRoles) {
        createRalphRole(modeler, roleName, results);
        
        // Buscar tareas de aprobación con el nuevo formato "Aprobar {TaskName}"
        const newApprovalTaskName = `Aprobar ${taskName}`;
        const specificApprovalTaskName = `Aprobar ${roleName} para ${taskName}`;
        const genericApprovalTaskName = `Aprobar ${roleName}`;
        
        const approvalTasksForRole = elementRegistry.filter(element => 
          element.type === 'bpmn:UserTask' && 
          element.businessObject && 
          (element.businessObject.name === newApprovalTaskName ||
           element.businessObject.name === specificApprovalTaskName ||
           element.businessObject.name === genericApprovalTaskName)
        );
        
        const approvalTaskNames = approvalTasksForRole.map(t => t.businessObject.name);
        
        // Crear asignaciones para todas las tareas de aprobación encontradas
        approvalTasksForRole.forEach(approvalTask => {
          createSimpleAssignment(modeler, approvalTask, roleName, results);
        });
      }
    }
  });
  
}

export function executeSimpleRasciMapping(modeler, matrix) {
  if (!modeler) return { error: 'Modeler no disponible' };
  
  const elementRegistry = modeler.get('elementRegistry');
  if (!elementRegistry) return { error: 'elementRegistry no disponible' };
  
  
  // 🧹 LIMPIEZA COMPLETA: Eliminar TODOS los elementos RALph y especiales existentes
  const completeCleanupCount = performCompleteCleanup(modeler);
  
  originalFlowMap.clear();
  saveOriginalFlow(modeler);
  
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: completeCleanupCount // Contar elementos eliminados en la limpieza completa
  };
  
  const taskMappings = {};
  Object.keys(matrix).forEach(taskName => {
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    if (bpmnTask) {
      taskMappings[taskName] = bpmnTask;
    }
  });
  
  // 🔥 CREAR ELEMENTOS ESPECIALES PRIMERO
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
    }
  });
  
  // Guardar el flujo después de crear elementos especiales
  saveOriginalFlow(modeler);
  
  // 🔥 MANEJAR ROLES Y ASIGNACIONES (con limpieza previa integrada)
  handleRolesAndAssignments(modeler, matrix, results);
  
  // ⚠️ NO ejecutar más limpiezas automáticas para evitar conflictos
  // cleanupOrphanedElements(modeler);
  
  // Restaurar flujo BPMN principal
  restoreBpmnFlow(modeler);
  
  // Verificaciones finales con delay para asegurar estabilidad
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
  
  
  // 🧹 LIMPIEZA SELECTIVA: Eliminar elementos obsoletos según la nueva matriz
  const cleanupCount = performSelectiveCleanup(modeler, matrix);
  
  const results = {
    rolesCreated: 0,
    roleAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0,
    elementsRemoved: cleanupCount
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
  if (!rasciManager.rasciMatrixData) return;
  
  Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
    const bpmnTask = findBpmnTaskByName(modeler, taskName);
    if (bpmnTask) {
      const taskRoles = rasciManager.rasciMatrixData[taskName];
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
      
      if (rasciManager.rasciMatrixData) {
        Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
          if (sourceName.includes(taskName) || taskName.includes(sourceName)) {
            const taskRoles = rasciManager.rasciMatrixData[taskName];
            Object.keys(taskRoles).forEach(roleName => {
              const responsibility = taskRoles[roleName];
              let labelName = '';
              
              if (element.type === 'bpmn:UserTask' && responsibility === 'A') {
                labelName = `Aprobar ${taskName}`;
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
  if (!rasciManager.rasciMatrixData || !rasciManager.rasciMatrixData[taskName]) {
    return null;
  }
  
  const taskRoles = rasciManager.rasciMatrixData[taskName];
  const responsibleRoles = [];
  
  Object.keys(taskRoles).forEach(roleKey => {
    if (taskRoles[roleKey] === 'R') {
      responsibleRoles.push(roleKey);
    }
  });
  
  return responsibleRoles.length === 1 ? responsibleRoles[0] : null;
}

function getSupportRolesForTask(taskName) {
  if (!rasciManager.rasciMatrixData || !rasciManager.rasciMatrixData[taskName]) {
    return [];
  }
  
  const taskRoles = rasciManager.rasciMatrixData[taskName];
  const supportRoles = [];
  
  Object.keys(taskRoles).forEach(roleKey => {
    if (taskRoles[roleKey] === 'S') {
      supportRoles.push(roleKey);
    }
  });
  
  return supportRoles;
}

function setupElementDeletionListener() {
  if (rasciManager.getBpmnModeler() && !rasciManager.rasciEventListenerConfigured) {
    const eventBus = rasciManager.getBpmnModeler().get('eventBus');
    const elementRegistry = rasciManager.getBpmnModeler().get('elementRegistry');
    
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
            executeSmartReconnection(rasciManager.getBpmnModeler(), removedElement.id);
          }, 100);
        }
        
        if (removedElement.type === 'RALph:Complex-Assignment-AND') {
          const andGateInfo = pendingAndGateInfo.get(removedElement.id);
          if (andGateInfo) {
            setTimeout(() => {
              checkAndRestoreDirectConnectionsAfterAndGateDeletion(rasciManager.getBpmnModeler(), removedElement);
            }, 100);
            pendingAndGateInfo.delete(removedElement.id);
          } else {
            setTimeout(() => {
              checkAndRestoreDirectConnectionsAfterAndGateDeletion(rasciManager.getBpmnModeler(), removedElement);
            }, 100);
          }
        }
      });
    });
    
    rasciManager.rasciEventListenerConfigured = true;
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
  if (!rasciManager.rasciMatrixData) {
    return;
  }
  
  Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
    const taskRoles = rasciManager.rasciMatrixData[taskName];
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
  // Extraer el nombre del rol del nombre de la tarea de aprobación
  let roleName;
  if (approvalTaskName.includes(' para ')) {
    // Formato: "Aprobar {Rol} para {Tarea}"
    roleName = approvalTaskName.replace('Aprobar ', '').split(' para ')[0];
  } else {
    // Formato: "Aprobar {Rol}"
    roleName = approvalTaskName.replace('Aprobar ', '');
  }
  
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
        // Llamada directa usando el manager sin window
        try {
          if (typeof executeRasciToRalphMapping === 'function') {
            executeRasciToRalphMapping();
          } else {
            executeSimpleRasciMapping(rasciManager.getBpmnModeler(), rasciManager.rasciMatrixData);
          }
        } catch (error) {
          console.warn('Error executing RASCI mapping:', error);
          executeSimpleRasciMapping(rasciManager.getBpmnModeler(), rasciManager.rasciMatrixData);
        }
      });
    });

    setupElementDeletionListener();
    
    // Auto-mapping se maneja a través del sistema de módulos
    // ya no necesitamos crear instancias locales en window
  }, 1000);
} 