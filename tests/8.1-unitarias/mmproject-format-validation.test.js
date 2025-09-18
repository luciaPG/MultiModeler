/**
 * 8.1 PRUEBAS UNITARIAS - Validación Formato .mmproject
 * 
 * Valida la estructura y contenido de archivos .mmproject multi-notación.
 * Migrado y mejorado desde sprint1/mmproject-validation.test.js
 */

import { createValidMmProject, createValidBpmnXml } from '../utils/test-helpers.js';

// Configurar localStorage para usar AutosaveManager real
require('../utils/ensure-localstorage.js');

// VALIDACIÓN REAL: Usar AutosaveManager para generar proyectos reales
class MmProjectValidator {
  constructor() {
    this.requiredFields = ['version', 'bpmn', 'ppinot', 'rasci'];
  }

  /**
   * Valida la estructura básica del archivo .mmproject
   */
  validateStructure(projectData) {
    const errors = [];
    
    // Verificar que sea un objeto válido
    if (!projectData || typeof projectData !== 'object') {
      errors.push('El archivo debe contener un objeto JSON válido');
      return { isValid: false, errors };
    }

    // Verificar campos requeridos
    this.requiredFields.forEach(field => {
      if (!(field in projectData)) {
        errors.push(`Campo requerido '${field}' no encontrado`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Valida contenido BPMN
   */
  validateBpmnContent(bpmnXml) {
    const errors = [];
    
    if (!bpmnXml || typeof bpmnXml !== 'string') {
      errors.push('BPMN debe ser una cadena XML válida');
      return { isValid: false, errors };
    }

    // Verificar elementos BPMN básicos
    const requiredElements = ['bpmn:definitions', 'bpmn:process'];
    requiredElements.forEach(element => {
      if (!bpmnXml.includes(element)) {
        errors.push(`Elemento BPMN requerido '${element}' no encontrado`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida contenido PPINOT
   */
  validatePpinotContent(ppinotData) {
    const errors = [];
    
    if (!ppinotData || typeof ppinotData !== 'object') {
      errors.push('PPINOT debe ser un objeto válido');
      return { isValid: false, errors };
    }

    if (!Array.isArray(ppinotData.ppis)) {
      errors.push('PPINOT debe contener un array de PPIs');
      return { isValid: false, errors };
    }

    // Validar cada PPI
    ppinotData.ppis.forEach((ppi, index) => {
      if (!ppi.id) {
        errors.push(`PPI ${index}: falta campo 'id'`);
      }
      if (!ppi.targetRef) {
        errors.push(`PPI ${index}: falta campo 'targetRef'`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida contenido RASCI
   */
  validateRasciContent(rasciData) {
    const errors = [];
    
    if (!rasciData || typeof rasciData !== 'object') {
      errors.push('RASCI debe ser un objeto válido');
      return { isValid: false, errors };
    }

    if (!Array.isArray(rasciData.roles)) {
      errors.push('RASCI debe contener un array de roles');
    }

    if (!rasciData.matrix || typeof rasciData.matrix !== 'object') {
      errors.push('RASCI debe contener una matriz de asignaciones');
    }

    // Validar reglas RASCI
    if (rasciData.matrix) {
      Object.entries(rasciData.matrix).forEach(([taskId, assignments]) => {
        const accountableCount = Object.values(assignments).filter(a => a === 'A').length;
        const responsibleCount = Object.values(assignments).filter(a => a === 'R').length;
        
        if (accountableCount !== 1) {
          errors.push(`Tarea ${taskId}: debe tener exactamente un Accountable`);
        }
        
        if (responsibleCount === 0) {
          errors.push(`Tarea ${taskId}: debe tener al menos un Responsible`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validación completa del proyecto
   */
  validateProject(projectData) {
    const allErrors = [];
    
    // Validar estructura
    const structureResult = this.validateStructure(projectData);
    allErrors.push(...structureResult.errors);

    if (structureResult.isValid) {
      // Validar contenido de cada notación
      const bpmnResult = this.validateBpmnContent(projectData.bpmn);
      allErrors.push(...bpmnResult.errors);

      const ppinotResult = this.validatePpinotContent(projectData.ppinot);
      allErrors.push(...ppinotResult.errors);

      const rasciResult = this.validateRasciContent(projectData.rasci);
      allErrors.push(...rasciResult.errors);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      summary: {
        totalErrors: allErrors.length,
        structureValid: structureResult.isValid,
        contentValid: allErrors.length === structureResult.errors.length
      }
    };
  }
}

describe('8.1 Pruebas Unitarias - Validación Formato .mmproject', () => {
  let validator;
  let AutosaveManager;

  beforeAll(async () => {
    // Importar AutosaveManager real para generar proyectos reales
    const autosaveModule = await import('../../app/services/autosave-manager.js');
    AutosaveManager = autosaveModule.AutosaveManager || autosaveModule.default;
    
    if (!AutosaveManager) {
      throw new Error('AutosaveManager real no encontrado - necesario para validación de proyectos reales');
    }
  });

  beforeEach(() => {
    validator = new MmProjectValidator();
  });

  describe('Validación de Estructura .mmproject', () => {
    test('debe validar proyecto .mmproject válido', () => {
      const validProject = createValidMmProject();
      const result = validator.validateProject(validProject);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.structureValid).toBe(true);
    });

    test('debe validar proyecto .mmproject generado por AutosaveManager REAL', async () => {
      // USAR AUTOSAVE MANAGER REAL para generar proyecto
      const mockModeler = {
        saveXML: jest.fn().mockResolvedValue({ xml: createValidBpmnXml() }),
        get: jest.fn().mockReturnValue({
          getAll: jest.fn().mockReturnValue([])
        })
      };
      
      const mockEventBus = {
        publish: jest.fn(),
        subscribe: jest.fn()
      };
      
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        eventBus: mockEventBus,
        enabled: false // No queremos timers en test
      });
      
      // GENERAR proyecto real usando AutosaveManager
      const proyectoReal = await autosaveManager.createCompleteProject();
      
      console.log('🔍 Proyecto generado por AutosaveManager real:', Object.keys(proyectoReal));
      
      // VALIDAR que el proyecto real tiene la estructura correcta
      expect(proyectoReal).toBeDefined();
      expect(proyectoReal.version).toBeDefined();
      expect(proyectoReal.bpmn).toBeDefined();
      expect(proyectoReal.ppinot).toBeDefined();
      expect(proyectoReal.rasci).toBeDefined();
      expect(proyectoReal.metadata).toBeDefined();
      expect(proyectoReal.welcomeScreenFormat).toBeDefined();
      
      // VALIDAR usando el validador
      const result = validator.validateProject(proyectoReal);
      
      console.log('🔍 Resultado validación proyecto real:', result);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.structureValid).toBe(true);
    });

    test('debe rechazar proyecto con campos faltantes', () => {
      const incompleteProject = {
        version: '1.0.0',
        bpmn: createValidBpmnXml()
        // Faltan ppinot y rasci
      };
      
      const result = validator.validateStructure(incompleteProject);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ppinot'),
          expect.stringContaining('rasci')
        ])
      );
    });

    test('debe rechazar datos no válidos', () => {
      const invalidInputs = [
        null,
        undefined,
        '',
        'string instead of object',
        123,
        []
      ];

      invalidInputs.forEach(input => {
        const result = validator.validateStructure(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Validación de Contenido BPMN', () => {
    test('debe validar XML BPMN correcto', () => {
      const validXml = createValidBpmnXml();
      const result = validator.validateBpmnContent(validXml);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('debe rechazar XML BPMN inválido', () => {
      const invalidXmls = [
        null,
        undefined,
        '',
        'not xml',
        '<invalid></xml>',
        '<xml></xml>' // XML válido pero no BPMN
      ];

      invalidXmls.forEach(xml => {
        const result = validator.validateBpmnContent(xml);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Validación de Contenido PPINOT', () => {
    test('debe validar estructura PPINOT correcta', () => {
      const validPpinot = {
        ppis: [
          { id: 'PPI_1', targetRef: 'Task_1', type: 'TimeMeasure' }
        ]
      };
      
      const result = validator.validatePpinotContent(validPpinot);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('debe rechazar estructura PPINOT inválida', () => {
      const invalidPpinots = [
        null,
        undefined,
        {},
        { ppis: null },
        { ppis: 'not array' },
        { ppis: [{}] }, // PPI sin campos requeridos
        { ppis: [{ id: '' }] }, // ID vacío
        { ppis: [{ targetRef: '' }] } // targetRef vacío
      ];

      invalidPpinots.forEach(ppinot => {
        const result = validator.validatePpinotContent(ppinot);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Validación de Contenido RASCI', () => {
    test('debe validar matriz RASCI correcta', () => {
      const validRasci = {
        roles: ['Role_1', 'Role_2'],
        matrix: {
          'Task_1': {
            'Role_1': 'A',
            'Role_2': 'R'
          }
        }
      };
      
      const result = validator.validateRasciContent(validRasci);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('debe rechazar matriz RASCI inválida', () => {
      const invalidRascis = [
        null,
        undefined,
        {},
        { roles: null },
        { roles: 'not array' },
        { matrix: null },
        { matrix: 'not object' },
        { 
          roles: ['Role_1'], 
          matrix: { 'Task_1': { 'Role_1': 'X' } } // Asignación inválida
        },
        {
          roles: ['Role_1'],
          matrix: { 'Task_1': {} } // Sin asignaciones
        }
      ];

      invalidRascis.forEach(rasci => {
        const result = validator.validateRasciContent(rasci);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('debe detectar violaciones de reglas RASCI', () => {
      const rasciWithViolations = {
        roles: ['Role_1', 'Role_2'],
        matrix: {
          'Task_1': {
            'Role_1': 'A',
            'Role_2': 'A' // Dos Accountables (violación)
          },
          'Task_2': {
            'Role_1': 'S' // Sin Responsible (violación)
          }
        }
      };
      
      const result = validator.validateRasciContent(rasciWithViolations);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2); // Al menos dos violaciones
      expect(result.errors[0]).toContain('exactamente un Accountable');
      expect(result.errors[1]).toContain('al menos un Responsible');
    });
  });
});
