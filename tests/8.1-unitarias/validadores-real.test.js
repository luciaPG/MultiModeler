/**
 * 8.1 PRUEBAS UNITARIAS - Validadores
 * 
 * Valida los módulos de validación para BPMN, PPINOT, RALPH y RASCI
 * usando la lógica real del sistema en lugar de mocks básicos.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Importar validadores reales
import { 
  getBpmnElementStats, 
  extractSequenceFlowsFromXml, 
  findCyclesInFlows,
  CLEAN_BPMN_DIAGRAM_XML
} from '../../app/modules/bpmn/validators.js';

import { RasciMatrixValidator } from '../../app/modules/rasci/validation/matrix-validator.js';
import { isSupportedType, getIcon } from '../../app/modules/multinotationModeler/notations/ppinot/config.js';
import { directEdit as PPINOTEditableTypes } from '../../app/modules/multinotationModeler/notations/ppinot/Types.js';
import { Ralph as RALPHTypes, connections as RALPHConnections } from '../../app/modules/multinotationModeler/notations/ralph/Types.js';

const { createValidBpmnXml } = require('../utils/test-helpers');

// Mock para localStorage cuando sea necesario para RASCI
const mockLocalStorage = {
  store: {},
  getItem: jest.fn(function(key) { return this.store[key] || null; }),
  setItem: jest.fn(function(key, value) { this.store[key] = value; }),
  removeItem: jest.fn(function(key) { delete this.store[key]; }),
  clear: jest.fn(function() { this.store = {}; })
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock básico para DOMParser si no está disponible
if (typeof global.DOMParser === 'undefined') {
  global.DOMParser = class MockDOMParser {
    parseFromString(xmlString) {
      const hasParseErrors = !xmlString || xmlString.includes('malformed');
      
      return {
        getElementsByTagName: (tagName) => {
          if (tagName === 'parsererror' && hasParseErrors) {
            return [{}];
          }
          return [];
        },
        querySelectorAll: () => {
          const elements = [];
          if (xmlString && xmlString.includes('bpmn:sequenceFlow')) {
            const matches = xmlString.match(/sourceRef="([^"]*)".*?targetRef="([^"]*)"/g) || [];
            matches.forEach((match, index) => {
              const sourceMatch = match.match(/sourceRef="([^"]*)"/);
              const targetMatch = match.match(/targetRef="([^"]*)"/);
              if (sourceMatch && targetMatch) {
                elements.push({
                  getAttribute: (attr) => {
                    if (attr === 'sourceRef') return sourceMatch[1];
                    if (attr === 'targetRef') return targetMatch[1];
                    if (attr === 'id') return `Flow_${index + 1}`;
                    return null;
                  }
                });
              }
            });
          }
          return elements;
        }
      };
    }
  };
}

describe('8.1 Pruebas Unitarias - Validadores', () => {
  
  describe('Validador BPMN - Lógica Real', () => {
    
    test('debe analizar elementos BPMN usando validador real', () => {
      const mockModeler = {
        get: jest.fn((serviceName) => {
          if (serviceName === 'elementRegistry') {
            return {
              getAll: jest.fn().mockReturnValue([
                { type: 'bpmn:StartEvent', businessObject: { $type: 'bpmn:StartEvent' } },
                { type: 'bpmn:Task', businessObject: { $type: 'bpmn:Task' } },
                { type: 'bpmn:EndEvent', businessObject: { $type: 'bpmn:EndEvent' } },
                { type: 'bpmn:SequenceFlow', businessObject: { $type: 'bpmn:SequenceFlow' } }
              ])
            };
          }
          return null;
        })
      };

      const stats = getBpmnElementStats(mockModeler);

      expect(stats.startEvents).toBe(1);
      expect(stats.endEvents).toBe(1);
      expect(stats.tasks).toBe(1);
      expect(stats.sequenceFlows).toBe(1);
    });

    test('debe extraer flujos secuenciales de XML real', () => {
      const flows = extractSequenceFlowsFromXml(CLEAN_BPMN_DIAGRAM_XML);
      
      expect(flows).toBeInstanceOf(Array);
      expect(flows.length).toBeGreaterThan(0);
      
      flows.forEach(flow => {
        expect(flow).toHaveProperty('id');
        expect(flow).toHaveProperty('sourceRef');
        expect(flow).toHaveProperty('targetRef');
      });
    });

    test('debe detectar ciclos en flujos', () => {
      const cyclicFlows = [
        { sourceRef: 'A', targetRef: 'B' },
        { sourceRef: 'B', targetRef: 'C' },
        { sourceRef: 'C', targetRef: 'A' }
      ];

      const cycles = findCyclesInFlows(cyclicFlows);
      expect(cycles.length).toBeGreaterThan(0);
    });

    test('debe validar XML BPMN válido usando helper', () => {
      const validXml = createValidBpmnXml();
      
      // Usar el validador real para extraer flujos
      const flows = extractSequenceFlowsFromXml(validXml);
      expect(flows).toBeInstanceOf(Array);
      
      // Verificar que el XML contiene elementos esperados
      expect(validXml).toMatch(/bpmn:(start|Start)Event/);
      expect(validXml).toMatch(/bpmn:(end|End)Event/);
      expect(validXml).toMatch(/bpmn:(task|Task)/);
    });
  });

  describe('Validador PPINOT - Configuración Real', () => {
    
    test('debe validar tipos PPINOT soportados', () => {
      expect(isSupportedType('PPINOT:TimeMeasure')).toBe(true);
      expect(isSupportedType('PPINOT:CountMeasure')).toBe(true);
      expect(isSupportedType('INVALID:Type')).toBe(false);
    });

    test('debe obtener iconos PPINOT', () => {
      const icon = getIcon('timeMeasure');
      expect(icon).toBeDefined();
      expect(typeof icon).toBe('string');
    });

    test('debe validar tipos editables', () => {
      expect(PPINOTEditableTypes).toBeInstanceOf(Array);
      expect(PPINOTEditableTypes).toContain('PPINOT:Target');
      expect(PPINOTEditableTypes).toContain('PPINOT:Scope');
    });

    test('debe rechazar tipos no válidos', () => {
      expect(isSupportedType(null)).toBe(false);
      expect(isSupportedType(undefined)).toBe(false);
      expect(isSupportedType('')).toBe(false);
      expect(isSupportedType('BPMN:Task')).toBe(false);
    });
  });

  describe('Validador RALPH - Tipos Real', () => {
    
    test('debe validar elementos RALPH', () => {
      expect(RALPHTypes).toBeInstanceOf(Array);
      expect(RALPHTypes).toContain('RALph:Person');
      expect(RALPHTypes).toContain('RALph:RoleRALph');
    });

    test('debe validar conexiones RALPH', () => {
      expect(RALPHConnections).toBeInstanceOf(Array);
      expect(RALPHConnections).toContain('RALph:ResourceArc');
    });

    test('debe tener tipos de entidades organizacionales', () => {
      expect(RALPHTypes).toContain('RALph:Position');
      expect(RALPHTypes).toContain('RALph:Orgunit');
    });
  });

  describe('Validador RASCI - Lógica Real', () => {
    let validator;

    beforeEach(() => {
      validator = new RasciMatrixValidator();
      mockLocalStorage.clear();
    });

    test('debe validar matriz RASCI válida', () => {
      const roles = ['Manager', 'Developer'];
      const matrixData = {
        'Task_1': {
          'Manager': 'A',
          'Developer': 'R'
        }
      };

      const result = validator.validateMatrix(roles, matrixData);

      expect(result.isValid).toBe(true);
      expect(result.criticalErrors).toHaveLength(0);
    });

    test('debe detectar tareas sin responsable', () => {
      const roles = ['Manager', 'Developer'];
      const matrixData = {
        'Task_1': {
          'Manager': 'A',
          'Developer': 'C' // No hay responsable
        }
      };

      // Para test unitario, mantenemos las tareas para validar lógica de negocio
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: ['Task_1']
      };

      const result = validator.validateMatrix(roles, matrixData, testOptions);

      expect(result.isValid).toBe(false);
      expect(result.criticalErrors.length).toBeGreaterThan(0);
      expect(result.criticalErrors[0].message).toContain('no tiene ningún responsable');
    });

    test('debe detectar responsables duplicados', () => {
      const roles = ['Manager', 'Developer'];
      const matrixData = {
        'Task_1': {
          'Manager': 'R',
          'Developer': 'R' // Dos responsables
        }
      };

      // Para test unitario, mantenemos las tareas para validar lógica de negocio
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: ['Task_1']
      };

      const result = validator.validateMatrix(roles, matrixData, testOptions);

      expect(result.isValid).toBe(false);
      expect(result.criticalErrors.length).toBeGreaterThan(0);
      expect(result.criticalErrors[0].message).toContain('múltiples responsables');
    });

    test('debe validar celdas individuales', () => {
      const validResult = validator.validateCell('Manager', 'Task_1', 'R');
      expect(validResult.isValid).toBe(true);

      const invalidResult = validator.validateCell('Manager', 'Task_1', 'X');
      expect(invalidResult.isValid).toBe(false);
    });

    test('debe generar resumen de validación', () => {
      const roles = ['Manager'];
      const matrixData = {
        'Task_1': { 'Manager': 'R' }
      };

      // Para test unitario, mantenemos las tareas para validar lógica de negocio
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: ['Task_1']
      };

      validator.validateMatrix(roles, matrixData, testOptions);
      const summary = validator.getValidationSummary();

      expect(summary).toHaveProperty('totalTasks');
      expect(summary).toHaveProperty('totalRoles');
      expect(summary).toHaveProperty('criticalErrorCount');
      expect(summary).toHaveProperty('warningCount');
    });
  });

  describe('Integración entre Validadores', () => {
    
    test('debe combinar validación BPMN y RASCI', () => {
      const mockModeler = {
        get: jest.fn((serviceName) => {
          if (serviceName === 'elementRegistry') {
            return {
              getAll: jest.fn().mockReturnValue([
                { id: 'Task_1', type: 'bpmn:Task', businessObject: { $type: 'bpmn:Task' } },
                { id: 'Task_2', type: 'bpmn:Task', businessObject: { $type: 'bpmn:Task' } }
              ])
            };
          }
          return null;
        })
      };

      // Obtener tareas de BPMN
      const stats = getBpmnElementStats(mockModeler);
      const tasksFromBpmn = stats.tasks;

      // Validar RASCI para las mismas tareas
      const validator = new RasciMatrixValidator();
      const roles = ['Manager'];
      const matrixData = {
        'Task_1': { 'Manager': 'R' },
        'Task_2': { 'Manager': 'R' }
      };

      // Para test de integración, proporcionamos las tareas BPMN
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: ['Task_1', 'Task_2']
      };

      const rasciResult = validator.validateMatrix(roles, matrixData, testOptions);

      expect(tasksFromBpmn).toBe(2);
      expect(rasciResult.isValid).toBe(true);
      expect(Object.keys(matrixData)).toHaveLength(tasksFromBpmn);
    });

    test('debe detectar incompatibilidades entre notaciones', () => {
      // Simular PPINOT con tipos no válidos
      expect(isSupportedType('RALph:Person')).toBe(false);
      
      // Simular RALPH que no incluye elementos PPINOT
      expect(RALPHTypes.includes('PPINOT:TimeMeasure')).toBe(false);
    });
  });
});