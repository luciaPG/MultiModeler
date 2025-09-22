// RASCI Matrix Validator
import { getBpmnTasks } from '../core/matrix-manager.js';

export class RasciMatrixValidator {
  constructor() {
    this.validationResults = [];
    this.criticalErrors = [];
    this.warnings = [];
    this.validRoles = new Set();
  }

  // Validar toda la matriz RASCI
  validateMatrix(roles, matrixData, options = {}) {
    this.validationResults = [];
    this.criticalErrors = [];
    this.warnings = [];
    
    // Manejo de parámetros de organizationalRoles (para retrocompatibilidad)
    let organizationalRoles = [];
    if (Array.isArray(options)) {
      // Si options es un array, es el parámetro organizationalRoles del formato anterior
      organizationalRoles = options;
      options = {};
    } else if (options.organizationalRoles) {
      organizationalRoles = options.organizationalRoles;
    }
    
    this.validRoles = new Set(organizationalRoles);

    // Opciones por defecto
    const { 
      skipOrphanedTaskCleanup = false,  // Para tests de integración real
      customBpmnTasks = null            // Lista personalizada de tareas BPMN
    } = options;

    if (!roles || roles.length === 0) {
      // No mostrar error si no hay roles - puede ser un diagrama nuevo
      console.log('ℹ️ No hay roles definidos - diagrama nuevo o sin configuración RASCI');
      return this.getValidationSummary();
    }

    if (!matrixData || Object.keys(matrixData).length === 0) {
      // No mostrar error si no hay datos de matriz - puede ser un diagrama nuevo
      console.log('ℹ️ No hay datos de matriz - diagrama nuevo o sin tareas');
      return this.getValidationSummary();
    }

    // Obtener tareas actuales del diagrama BPMN
    const currentBpmnTasks = customBpmnTasks || getBpmnTasks();
    console.log('🔍 Tareas actuales en diagrama BPMN:', currentBpmnTasks);
    
    // Solo validar tareas que realmente existen en el diagrama actual
    const allTasks = Object.keys(matrixData);
    
    // En modo de test de integración, considerar todas las tareas como válidas
    const validTasks = skipOrphanedTaskCleanup ? 
      allTasks : 
      allTasks.filter(taskName => currentBpmnTasks.includes(taskName));
    
    const orphanedTasks = skipOrphanedTaskCleanup ? 
      [] : 
      allTasks.filter(taskName => !currentBpmnTasks.includes(taskName));
    
    if (orphanedTasks.length > 0 && !skipOrphanedTaskCleanup) {
      console.log('🗑️ Tareas huérfanas en matriz (no existen en diagrama):', orphanedTasks);
      // Limpiar tareas huérfanas automáticamente
      this.cleanOrphanedTasks(orphanedTasks, matrixData);
    }
    
    // Si no hay tareas válidas, no hay nada que validar
    if (validTasks.length === 0) {
      console.log('ℹ️ No hay tareas válidas para validar - diagrama vacío o sin tareas');
      return this.getValidationSummary();
    }
    
    // Verificar si todas las tareas válidas están vacías
    const tasksWithRoles = validTasks.filter(taskName => {
      const taskData = matrixData[taskName] || {};
      
      // Verificar si la tarea tiene datos (incluso si están vacíos)
      const hasData = taskData && typeof taskData === 'object' && Object.keys(taskData).length > 0;
      
      if (!hasData) {
        return false;
      }
      
      // Verificar si tiene roles asignados (con valores no vacíos)
      const hasRoles = Object.values(taskData).some(value => value && value.trim() !== '');
      
      return hasRoles;
    });

    // Verificar si hay tareas válidas pero están vacías
    if (validTasks.length > 0) {
      const tasksWithData = validTasks.filter(taskName => {
        const taskData = matrixData[taskName] || {};
        return taskData && typeof taskData === 'object' && Object.keys(taskData).length > 0;
      });
      
      if (tasksWithData.length > 0 && tasksWithRoles.length === 0) {
        // Hay tareas con estructura pero sin roles asignados
        this.addCriticalError(`Ninguna de las ${validTasks.length} tareas tiene roles asignados. Debes asignar al menos un responsable (R) a cada tarea.`);
        
        // Mostrar errores individuales solo para tareas válidas
        validTasks.forEach(taskName => {
          this.addCriticalError(`La tarea '${taskName}' no tiene ningún rol asignado. Debes asignar al menos un responsable (R) a esta tarea.`);
        });
        
        return this.getValidationSummary();
      }
    }
    
    // Solo validar tareas que realmente existen en el diagrama
    validTasks.forEach(taskName => {
      this.validateTask(taskName, roles, matrixData);
    });

    // Validar roles genéricos
    this.validateRoleSpecificity(roles);

    return this.getValidationSummary();
  }

  // Validar una tarea específica
  validateTask(taskName, roles, matrixData) {
    const taskData = matrixData[taskName] || {};
    const taskRoles = {};

    // Recopilar roles para esta tarea
    // Los datos están estructurados como {rol: valor}, no como array
    Object.keys(taskData).forEach(role => {
      const cellValue = taskData[role] || '';
      if (cellValue && cellValue.trim()) {
        taskRoles[role] = cellValue.trim().toUpperCase();
      }
    });

    // Validar cada celda individualmente
    Object.entries(taskData).forEach(([role, value]) => {
      const cellValidation = this.validateSpecificCell(role, taskName, value);
      if (!cellValidation.isValid) {
        cellValidation.issues.forEach(issue => {
          this.addWarning(issue);
        });
      }
    });

    // Si no hay roles asignados, mostrar error específico para cada celda
    if (Object.keys(taskRoles).length === 0) {
      // Mostrar advertencia para cada rol disponible
      roles.forEach(role => {
        this.addWarning(`Celda (${role}, ${taskName}): Sin asignación. Considera asignar R, A, S, C o I según corresponda.`);
      });
    }

    // Regla 1: Cada tarea debe tener exactamente UN Responsable (R)
    this.validateResponsibleAssignment(taskName, taskRoles);

    // Regla 2: Máximo UN Aprobador (A) por tarea (obligatorio)
    this.validateApproverAssignment(taskName, taskRoles);

    // Regla 3: Validar roles de Soporte (S)
    this.validateSupportRoles(taskName, taskRoles);

    // Regla 4: Validar que haya al menos un responsable (solo si hay roles asignados)
    this.validateActiveResponsibility(taskName, taskRoles);

    // Regla 5: Validar formato de letras por celda
    this.validateSingleLetterPerCell(taskName, taskRoles);

    // Regla 6: Validar binding of duties (R y A en mismo rol)
    this.validateBindingOfDuties(taskName, taskRoles);
  }

  // Regla 1: Validar que haya exactamente UN Responsable
  validateResponsibleAssignment(taskName, taskRoles) {
    // Verificar si hay roles asignados
    if (Object.keys(taskRoles).length === 0) {
      this.addCriticalError(`La tarea '${taskName}' no tiene ningún rol asignado. Debes asignar al menos un responsable (R) a esta tarea.`);
      return;
    }
    
    const responsibles = Object.entries(taskRoles)
      .filter(([, value]) => value.includes('R'))
      .map(([role]) => role);

    if (responsibles.length === 0) {
      this.addCriticalError(`La tarea '${taskName}' no tiene ningún responsable (R). Cada tarea debe tener exactamente un responsable.`);
    } else if (responsibles.length > 1) {
      this.addCriticalError(`La tarea '${taskName}' tiene múltiples responsables (${responsibles.join(', ')}). Cada tarea debe tener exactamente un responsable para evitar confusión.`);
    }
  }

  // Regla 2: Validar máximo UN Aprobador (obligatorio)
  validateApproverAssignment(taskName, taskRoles) {
    const approvers = Object.entries(taskRoles)
      .filter(([, value]) => value.includes('A'))
      .map(([role]) => role);

    if (approvers.length > 1) {
      this.addCriticalError(`La tarea '${taskName}' tiene múltiples aprobadores (${approvers.join(', ')}). Cada tarea debe tener máximo un aprobador (A) para evitar conflictos de autoridad.`);
    }
  }

  // Regla 3: Validar roles de Soporte
  validateSupportRoles(taskName, taskRoles) {
    const supportRoles = Object.entries(taskRoles)
      .filter(([, value]) => value.includes('S'))
      .map(([role]) => role);

    supportRoles.forEach(role => {
      if (this.validRoles.size > 0 && !this.validRoles.has(role)) {
        this.addWarning(`El rol '${role}' marcado como Soporte no está definido en el modelo organizativo. Roles disponibles: ${Array.from(this.validRoles).join(', ')}`);
      }
    });
  }

  // Regla 4: Validar que haya al menos un responsable (solo si hay roles asignados)
  validateActiveResponsibility(taskName, taskRoles) {
    // Solo validar si hay roles asignados
    if (Object.keys(taskRoles).length === 0) {
      return;
    }
    
    const hasOnlyPassiveRoles = Object.values(taskRoles).every(value => 
      value.includes('C') || value.includes('I') || value.includes('S')
    );

    if (hasOnlyPassiveRoles) {
      this.addCriticalError(`La tarea '${taskName}' solo tiene roles pasivos (C, I, S). Debe tener al menos un responsable (R).`);
    }
  }

  // Regla 5: Validar formato de letras por celda
  validateSingleLetterPerCell(taskName, taskRoles) {
    Object.entries(taskRoles).forEach(([role, value]) => {
      if (value.length > 1) {
        // Verificar si son combinaciones válidas (RA, RS, etc.)
        const validCombinations = ['RA', 'RS', 'RC', 'RI', 'AS', 'AC', 'AI', 'SC', 'SI', 'CI'];
        if (!validCombinations.includes(value)) {
          this.addWarning(`El rol '${role}' tiene múltiples funciones asignadas (${value}) en la tarea '${taskName}'. Verifica que la combinación sea válida.`);
        }
        
        // Verificar que no haya múltiples A's en la misma celda
        const aCount = (value.match(/A/g) || []).length;
        if (aCount > 1) {
          this.addCriticalError(`El rol '${role}' tiene múltiples aprobadores (A) en la tarea '${taskName}' (${value}). Cada tarea debe tener máximo un aprobador.`);
        }
      }
    });
  }

  // Regla 6: Validar binding of duties (R y A en mismo rol)
  validateBindingOfDuties(taskName, taskRoles) {
    Object.entries(taskRoles).forEach(([role, value]) => {
      if (value.includes('R') && value.includes('A')) {
        this.addWarning(`El rol '${role}' tiene asignadas las funciones de R y A en la tarea '${taskName}'. Esto puede crear conflictos de interés. Considera separar las responsabilidades.`);
      }
    });
  }

  // Validar especificidad de roles
  validateRoleSpecificity(roles) {
    const genericRoles = [
      'usuario', 'persona', 'técnico', 'empleado', 'staff', 'personal',
      'user', 'person', 'technician', 'employee', 'worker', 'member'
    ];

    roles.forEach(role => {
      const roleLower = role.toLowerCase();
      if (genericRoles.some(generic => roleLower.includes(generic))) {
        this.addWarning(`El rol '${role}' es demasiado genérico. Usa nombres concretos como 'Analista financiero' o 'Director de compras'.`);
      }
    });
  }



  // Agregar error crítico
  addCriticalError(message) {
    this.criticalErrors.push({
      type: 'critical',
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  // Agregar advertencia
  addWarning(message) {
    this.warnings.push({
      type: 'warning',
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  // Obtener resumen de validación
  getValidationSummary() {
    // Calcular estadísticas de la matriz
    const matrixData = this.matrixData || {};
    const tasks = Object.keys(matrixData);
    const roles = new Set();
    
    tasks.forEach(task => {
      if (matrixData[task]) {
        Object.keys(matrixData[task]).forEach(role => {
          roles.add(role);
        });
      }
    });

    const summary = {
      isValid: this.criticalErrors.length === 0,
      criticalErrors: this.criticalErrors,
      warnings: this.warnings,
      totalIssues: this.criticalErrors.length + this.warnings.length,
      canExport: this.criticalErrors.length === 0,
      totalTasks: tasks.length,
      totalRoles: roles.size,
      totalCells: tasks.length * roles.size, // Propiedad esperada por tests
      tasksWithIssues: 0, // Se puede calcular si es necesario
      rolesWithIssues: 0,  // Se puede calcular si es necesario
      criticalErrorCount: this.criticalErrors.length, // Propiedad esperada por tests
      warningCount: this.warnings.length // Propiedad esperada por tests
    };
    
    return summary;
  }

  // Validar celda individual
  validateCell(role, task, value) {
    const cellValidation = {
      isValid: true,
      issues: []
    };

    const cleanValue = value.trim().toUpperCase();

    // Validar que solo contenga letras RASCI válidas
    const validLetters = ['R', 'A', 'S', 'C', 'I'];
    const invalidChars = cleanValue.split('').filter(char => !validLetters.includes(char));
    
    if (invalidChars.length > 0) {
      cellValidation.isValid = false;
      cellValidation.issues.push(`Caracteres inválidos: ${invalidChars.join(', ')}. Solo se permiten: R, A, S, C, I`);
    }

    // Validar longitud
    if (cleanValue.length > 1) {
      cellValidation.issues.push('Múltiples funciones en una celda. Considera usar binding of duties o separar.');
    }

    return cellValidation;
  }

  // Validar celda específica con mensaje detallado
  validateSpecificCell(role, task, value) {
    const cellValidation = {
      isValid: true,
      issues: [],
      cellInfo: { role, task, value }
    };

    const cleanValue = value.trim().toUpperCase();

    // Si está vacía, no es un error (puede ser intencional)
    if (!cleanValue) {
      return cellValidation;
    }

    // Validar que solo contenga letras RASCI válidas
    const validLetters = ['R', 'A', 'S', 'C', 'I'];
    const invalidChars = cleanValue.split('').filter(char => !validLetters.includes(char));
    
    if (invalidChars.length > 0) {
      cellValidation.isValid = false;
      cellValidation.issues.push(`Celda (${role}, ${task}): Caracteres inválidos '${invalidChars.join(', ')}'. Solo se permiten: R, A, S, C, I`);
    }

    // Validar combinaciones válidas
    if (cleanValue.length > 1) {
      const validCombinations = ['RA', 'RS', 'RC', 'RI', 'AS', 'AC', 'AI', 'SC', 'SI', 'CI'];
      if (!validCombinations.includes(cleanValue)) {
        cellValidation.issues.push(`Celda (${role}, ${task}): Combinación '${cleanValue}' no válida. Combinaciones válidas: ${validCombinations.join(', ')}`);
      }
      
      // Verificar que no haya múltiples A's en la misma celda
      const aCount = (cleanValue.match(/A/g) || []).length;
      if (aCount > 1) {
        cellValidation.issues.push(`Celda (${role}, ${task}): Múltiples aprobadores (A) en '${cleanValue}'. Cada tarea debe tener máximo un aprobador.`);
      }
    }

    return cellValidation;
  }

  // Validar en tiempo real (para uso durante la edición)
  validateRealTime(roles, matrixData, organizationalRoles = []) {
    const summary = this.validateMatrix(roles, matrixData, organizationalRoles);
    
    // Retornar solo errores críticos, sin advertencias
    const realTimeResult = {
      hasCriticalErrors: summary.criticalErrors.length > 0,
      criticalErrors: summary.criticalErrors, // Mostrar todos los errores críticos
      warnings: [], // No mostrar advertencias
      canContinue: summary.criticalErrors.length === 0
    };
    
    return realTimeResult;
  }

  // Limpiar tareas huérfanas de la matriz
  cleanOrphanedTasks(orphanedTasks, matrixData) {
    console.log('🧹 Limpiando tareas huérfanas de la matriz...');
    
    orphanedTasks.forEach(taskName => {
      if (matrixData[taskName]) {
        delete matrixData[taskName];
        console.log(`🗑️ Eliminada tarea huérfana: ${taskName}`);
      }
    });
    
    // Guardar cambios en localStorage si es posible
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('rasciMatrixData', JSON.stringify(matrixData));
        console.log('✅ Matriz actualizada en localStorage');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo actualizar localStorage:', error);
    }
  }
}

export const rasciValidator = new RasciMatrixValidator();
