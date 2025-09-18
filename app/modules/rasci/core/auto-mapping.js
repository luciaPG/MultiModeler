/**
 * Auto-mapping RASCI
 * 
 * Funciones para mapeo automático entre BPMN y RASCI
 */

export function executeSimpleRasciMapping(bpmnElements, roles) {
  if (!Array.isArray(bpmnElements) || !Array.isArray(roles)) {
    throw new Error('Parámetros inválidos para mapeo RASCI');
  }

  const matrix = {};
  
  // Mapeo simple: asignar primer rol como Accountable a cada tarea
  bpmnElements.forEach(element => {
    if (element.type === 'bpmn:task' && roles.length > 0) {
      matrix[element.id] = {
        [roles[0]]: 'A' // Accountable
      };
    }
  });

  return {
    success: true,
    matrix: matrix,
    mappedTasks: Object.keys(matrix).length
  };
}

export function validateRasciMapping(matrix, roles, tasks) {
  const errors = [];
  
  // Verificar que cada tarea tenga al menos un Accountable
  tasks.forEach(taskId => {
    const assignments = matrix[taskId] || {};
    const hasAccountable = Object.values(assignments).includes('A');
    
    if (!hasAccountable) {
      errors.push(`Tarea ${taskId} no tiene Accountable`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

export default {
  executeSimpleRasciMapping,
  validateRasciMapping
};
