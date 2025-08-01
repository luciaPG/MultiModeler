// RASCI Validation Configuration
// Configuración personalizable para las reglas de validación

export const ValidationConfig = {
  // ============================================================================
  // REGLAS DE VALIDACIÓN
  // ============================================================================
  
  rules: {
    // Regla 1: Responsable obligatorio
    requireResponsible: {
      enabled: true,
      critical: true, // Error crítico que bloquea exportación
      message: "La tarea '{taskName}' no tiene ningún responsable (R). Por favor, asígnalo para continuar."
    },
    
    // Regla 2: Máximo un aprobador
    maxOneApprover: {
      enabled: true,
      critical: false, // Solo advertencia
      message: "La tarea '{taskName}' tiene múltiples aprobadores. Se recomienda asignar solo uno."
    },
    
    // Regla 3: Roles de soporte válidos
    validSupportRoles: {
      enabled: true,
      critical: false,
      message: "El rol '{roleName}' marcado como Soporte no está definido en el modelo organizativo."
    },
    
    // Regla 4: Responsabilidad activa
    requireActiveResponsibility: {
      enabled: true,
      critical: false,
      message: "La tarea '{taskName}' no tiene ningún rol con responsabilidad activa (R o A)."
    },
    
    // Regla 5: Una letra por celda
    singleLetterPerCell: {
      enabled: true,
      critical: false,
      message: "El rol '{roleName}' tiene múltiples funciones asignadas en la misma tarea. Usa 'binding of duties' o sepáralas."
    },
    
    // Regla 6: Binding of duties
    bindingOfDuties: {
      enabled: true,
      critical: false,
      message: "El rol '{roleName}' tiene asignadas las funciones de R y A en la tarea '{taskName}'. ¿Es esto intencional?"
    },
    
    // Regla 7: Roles específicos
    specificRoles: {
      enabled: true,
      critical: false,
      message: "El rol '{roleName}' es demasiado genérico. Usa nombres concretos como 'Analista financiero' o 'Director de compras'."
    }
  },
  
  // ============================================================================
  // CONFIGURACIÓN DE ROLES GENÉRICOS
  // ============================================================================
  
  genericRoles: [
    // Español
    'usuario', 'persona', 'técnico', 'empleado', 'staff', 'personal',
    'operador', 'funcionario', 'trabajador', 'miembro', 'colaborador',
    'responsable', 'encargado', 'supervisor', 'coordinador',
    
    // Inglés
    'user', 'person', 'technician', 'employee', 'worker', 'member',
    'operator', 'staff', 'personnel', 'collaborator', 'responsible',
    'supervisor', 'coordinator', 'manager', 'officer'
  ],
  
  // ============================================================================
  // CONFIGURACIÓN DE LETRAS RASCI VÁLIDAS
  // ============================================================================
  
  validRasciLetters: ['R', 'A', 'S', 'C', 'I'],
  
  // ============================================================================
  // CONFIGURACIÓN DE UI
  // ============================================================================
  
  ui: {
    // Colores para diferentes tipos de mensajes
    colors: {
      critical: {
        background: '#fef2f2',
        border: '#fecaca',
        text: '#991b1b',
        icon: '#dc2626'
      },
      warning: {
        background: '#fffbeb',
        border: '#fed7aa',
        text: '#92400e',
        icon: '#d97706'
      },
      success: {
        background: '#f0fdf4',
        border: '#bbf7d0',
        text: '#166534',
        icon: '#16a34a'
      }
    },
    
    // Configuración de debounce
    debounceDelay: 300, // milisegundos
    
    // Límites de mensajes mostrados
    maxCriticalErrors: 3,
    maxWarnings: 5,
    
    // Configuración de animaciones
    animations: {
      enabled: true,
      duration: 300, // milisegundos
      easing: 'ease'
    }
  },
  
  // ============================================================================
  // CONFIGURACIÓN DE INTEGRACIÓN
  // ============================================================================
  
  integration: {
    // Integración con BPMN
    bpmn: {
      enabled: true,
      taskTypes: [
        'bpmn:Task',
        'bpmn:UserTask',
        'bpmn:ServiceTask',
        'bpmn:ScriptTask',
        'bpmn:ManualTask',
        'bpmn:BusinessRuleTask',
        'bpmn:SendTask',
        'bpmn:ReceiveTask',
        'bpmn:CallActivity',
        'bpmn:SubProcess'
      ]
    },
    
    // Integración con RALph
    ralph: {
      enabled: true,
      localStorageKey: 'ralphRoles',
      globalVariable: 'ralphRoles'
    }
  },
  
  // ============================================================================
  // CONFIGURACIÓN DE PERSISTENCIA
  // ============================================================================
  
  persistence: {
    // Claves de localStorage
    localStorageKeys: {
      roles: 'rasciRoles',
      matrixData: 'rasciMatrixData',
      validationState: 'rasciValidationState'
    },
    
    // Configuración de auto-guardado
    autoSave: {
      enabled: true,
      delay: 1000 // milisegundos
    }
  },
  
  // ============================================================================
  // CONFIGURACIÓN DE LOGGING
  // ============================================================================
  
  logging: {
    enabled: true,
    level: 'info', // 'debug', 'info', 'warn', 'error'
    prefix: '[RASCI Validator]'
  }
};

// ============================================================================
// FUNCIONES DE CONFIGURACIÓN
// ============================================================================

export class ValidationConfigManager {
  constructor() {
    this.config = { ...ValidationConfig };
  }
  
  // Obtener configuración
  getConfig() {
    return this.config;
  }
  
  // Actualizar configuración
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log(`${this.config.logging.prefix} Configuración actualizada`);
  }
  
  // Habilitar/deshabilitar regla específica
  toggleRule(ruleName, enabled) {
    if (this.config.rules[ruleName]) {
      this.config.rules[ruleName].enabled = enabled;
      console.log(`${this.config.logging.prefix} Regla '${ruleName}' ${enabled ? 'habilitada' : 'deshabilitada'}`);
    }
  }
  
  // Agregar rol genérico
  addGenericRole(role) {
    if (!this.config.genericRoles.includes(role.toLowerCase())) {
      this.config.genericRoles.push(role.toLowerCase());
      console.log(`${this.config.logging.prefix} Rol genérico agregado: '${role}'`);
    }
  }
  
  // Remover rol genérico
  removeGenericRole(role) {
    const index = this.config.genericRoles.indexOf(role.toLowerCase());
    if (index > -1) {
      this.config.genericRoles.splice(index, 1);
      console.log(`${this.config.logging.prefix} Rol genérico removido: '${role}'`);
    }
  }
  
  // Agregar letra RASCI válida
  addValidLetter(letter) {
    if (!this.config.validRasciLetters.includes(letter.toUpperCase())) {
      this.config.validRasciLetters.push(letter.toUpperCase());
      console.log(`${this.config.logging.prefix} Letra válida agregada: '${letter.toUpperCase()}'`);
    }
  }
  
  // Remover letra RASCI válida
  removeValidLetter(letter) {
    const index = this.config.validRasciLetters.indexOf(letter.toUpperCase());
    if (index > -1) {
      this.config.validRasciLetters.splice(index, 1);
      console.log(`${this.config.logging.prefix} Letra válida removida: '${letter.toUpperCase()}'`);
    }
  }
  
  // Guardar configuración en localStorage
  saveToStorage() {
    try {
      localStorage.setItem('rasciValidationConfig', JSON.stringify(this.config));
      console.log(`${this.config.logging.prefix} Configuración guardada en localStorage`);
    } catch (error) {
      console.error(`${this.config.logging.prefix} Error guardando configuración:`, error);
    }
  }
  
  // Cargar configuración desde localStorage
  loadFromStorage() {
    try {
      const savedConfig = localStorage.getItem('rasciValidationConfig');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
        console.log(`${this.config.logging.prefix} Configuración cargada desde localStorage`);
      }
    } catch (error) {
      console.error(`${this.config.logging.prefix} Error cargando configuración:`, error);
    }
  }
  
  // Restaurar configuración por defecto
  resetToDefault() {
    this.config = { ...ValidationConfig };
    localStorage.removeItem('rasciValidationConfig');
    console.log(`${this.config.logging.prefix} Configuración restaurada a valores por defecto`);
  }
}

// Instancia global del gestor de configuración
export const validationConfigManager = new ValidationConfigManager();

// Cargar configuración al inicializar
validationConfigManager.loadFromStorage();

// Función global para acceso desde la consola
if (typeof window !== 'undefined') {
  window.rasciValidationConfig = validationConfigManager;
  console.log('🔧 Configuración de validación RASCI disponible como window.rasciValidationConfig');
} 