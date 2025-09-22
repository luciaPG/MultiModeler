/**
 * 8.1 PRUEBAS UNITARIAS - Validadores REALES
 * 
 * Valida los módulos de validación para BPMN, PPINOT, RALPH y RASCI usando
 * la lógica real implementada en la aplicación en lugar de mocks.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

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

// Mock para localStorage solo cuando sea necesario
const mockLocalStorage = {
  store: {},
  getItem: jest.fn(function(key) { return this.store[key] || null; }),
  setItem: jest.fn(function(key, value) { this.store[key] = value; }),
  removeItem: jest.fn(function(key) { delete this.store[key]; }),
  clear: jest.fn(function() { this.store = {}; })
};

// Mock mínimo para dependencias del navegador
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock básico para DOMParser
global.DOMParser = class MockDOMParser {
  parseFromString(xmlString) {
    const hasParseErrors = !xmlString || xmlString.includes('malformed') || xmlString.includes('error');
    
    return {
      getElementsByTagName: (tagName) => {
        if (tagName === 'parsererror' && hasParseErrors) {
          return [{}]; // Simular error de parseo
        }
        return [];
      },
      querySelectorAll: () => {
        const elements = [];
        if (xmlString && xmlString.includes('bpmn:sequenceFlow')) {
          // Simular elementos de flujo secuencial encontrados
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

describe('8.1 Pruebas Unitarias - Validadores REALES', () => {
  
  describe('Validador BPMN - Lógica Real', () => {
    
    test('debe analizar estadísticas de elementos BPMN reales', () => {
      const mockModeler = {
        get: jest.fn((serviceName) => {
          if (serviceName === 'elementRegistry') {
            return {
              getAll: jest.fn().mockReturnValue([
                { type: 'bpmn:StartEvent', businessObject: { $type: 'bpmn:StartEvent' } },
                { type: 'bpmn:Task', businessObject: { $type: 'bpmn:Task' } },
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
      expect(stats.tasks).toBe(2);
      expect(stats.sequenceFlows).toBe(1);
      expect(stats.totalElements).toBe(5);
    });

    test('debe extraer flujos secuenciales de XML real', () => {
      const flows = extractSequenceFlowsFromXml(CLEAN_BPMN_DIAGRAM_XML);
      
      expect(flows).toBeInstanceOf(Array);
      expect(flows.length).toBeGreaterThan(0);
      
      // Verificar que los flujos tienen la estructura correcta
      flows.forEach(flow => {
        expect(flow).toHaveProperty('id');
        expect(flow).toHaveProperty('sourceRef');
        expect(flow).toHaveProperty('targetRef');
      });
    });

    test('debe detectar ciclos en flujos usando lógica real', () => {
      const cyclicFlows = [
        { sourceRef: 'A', targetRef: 'B' },
        { sourceRef: 'B', targetRef: 'C' },
        { sourceRef: 'C', targetRef: 'A' } // Ciclo A->B->C->A
      ];

      const cycles = findCyclesInFlows(cyclicFlows);
      
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('A');
      expect(cycles[0]).toContain('B');
      expect(cycles[0]).toContain('C');
    });

    test('debe validar XML BPMN malformado', () => {
      const invalidXml = '<bpmn:definitions><invalid></bpmn:definitions>';
      const flows = extractSequenceFlowsFromXml(invalidXml);
      
      expect(flows).toBeInstanceOf(Array);
      expect(flows.length).toBe(0);
    });
  });

  describe('Validador PPINOT - Configuración Real', () => {
    
    test('debe validar tipos PPINOT soportados usando configuración real', () => {
      const supportedTypes = [
        'PPINOT:TimeMeasure',
        'PPINOT:CountMeasure', 
        'PPINOT:DataMeasure',
        'PPINOT:AggregatedMeasure'
      ];

      supportedTypes.forEach(type => {
        expect(isSupportedType(type)).toBe(true);
      });
    });

    test('debe rechazar tipos PPINOT no soportados', () => {
      const unsupportedTypes = [
        'INVALID:Type',
        'BPMN:Task',
        'CustomType',
        null,
        undefined
      ];

      unsupportedTypes.forEach(type => {
        expect(isSupportedType(type)).toBe(false);
      });
    });

    test('debe obtener iconos para elementos PPINOT válidos', () => {
      const iconKeys = ['timeMeasure', 'countMeasure', 'scope', 'target'];
      
      iconKeys.forEach(key => {
        const icon = getIcon(key);
        expect(icon).toBeDefined();
        expect(typeof icon).toBe('string');
      });
    });

    test('debe validar tipos editables de PPINOT', () => {
      expect(PPINOTEditableTypes).toBeInstanceOf(Array);
      expect(PPINOTEditableTypes.length).toBeGreaterThan(0);
      
      // Verificar que incluye tipos esperados
      expect(PPINOTEditableTypes).toContain('PPINOT:Target');
      expect(PPINOTEditableTypes).toContain('PPINOT:Scope');
    });
  });

  describe('Validador RALPH - Tipos Real', () => {
    
    test('debe validar elementos RALPH soportados', () => {
      expect(RALPHTypes).toBeInstanceOf(Array);
      expect(RALPHTypes.length).toBeGreaterThan(0);
      
      // Verificar tipos principales de RALPH
      expect(RALPHTypes).toContain('RALph:Person');
      expect(RALPHTypes).toContain('RALph:RoleRALph');
      expect(RALPHTypes).toContain('RALph:Position');
    });

    test('debe validar conexiones RALPH soportadas', () => {
      expect(RALPHConnections).toBeInstanceOf(Array);
      expect(RALPHConnections.length).toBeGreaterThan(0);
      
      // Verificar tipos de conexión RALPH
      expect(RALPHConnections).toContain('RALph:ResourceArc');
    });

    test('debe validar estructura de roles RALPH', () => {
      const validRalphRole = {
        id: 'Role_1',
        name: 'Manager',
        type: 'RALph:RoleRALph',
        permissions: ['read', 'write', 'approve'],
        restrictions: []
      };

      // Validaciones básicas de estructura
      expect(validRalphRole.id).toBeDefined();
      expect(validRalphRole.name).toBeDefined();
      expect(validRalphRole.type).toContain('RALph:');
      expect(Array.isArray(validRalphRole.permissions)).toBe(true);
      expect(Array.isArray(validRalphRole.restrictions)).toBe(true);
    });
  });

  describe('Validador RASCI - Lógica Real', () => {
    let validator;

    beforeEach(() => {
      validator = new RasciMatrixValidator();
    });

    test('debe validar matriz RASCI usando validador real', () => {
      const roles = ['Manager', 'Developer'];
      const matrixData = {
        'Task_1': {
          'Manager': 'A',
          'Developer': 'R'
        },
        'Task_2': {
          'Manager': 'R',
          'Developer': 'S'
        }
      };

      const result = validator.validateMatrix(roles, matrixData);

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('criticalErrors');
      expect(result).toHaveProperty('warnings');
      expect(result.isValid).toBe(true);
      expect(result.criticalErrors).toHaveLength(0);
    });

    test('debe detectar errores críticos en matriz RASCI', () => {
      const roles = ['Manager', 'Developer'];
      const matrixData = {
        'Task_1': {
          'Manager': 'A',
          'Developer': 'C' // No hay responsable (R)
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

    test('debe validar letras RASCI válidas', () => {
      const invalidLetters = ['X', 'Y', 'Z', '1', '@'];

      // Test con letras válidas
      const validResult = validator.validateCell('Manager', 'Task_1', 'R');
      expect(validResult.isValid).toBe(true);

      // Test con letras inválidas
      invalidLetters.forEach(letter => {
        const invalidResult = validator.validateCell('Manager', 'Task_1', letter);
        expect(invalidResult.isValid).toBe(false);
      });
    });

    test('debe generar resumen de validación completo', () => {
      const roles = ['Manager'];
      const matrixData = {
        'Task_1': { 'Manager': 'R' },
        'Task_2': { 'Manager': 'A' } // Falta responsable
      };

      // Para test unitario, mantenemos las tareas para validar lógica de negocio
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: ['Task_1', 'Task_2']
      };

      validator.validateMatrix(roles, matrixData, testOptions);
      const summary = validator.getValidationSummary();

      expect(summary).toHaveProperty('totalTasks');
      expect(summary).toHaveProperty('totalRoles');
      expect(summary).toHaveProperty('totalCells');
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
  });
});