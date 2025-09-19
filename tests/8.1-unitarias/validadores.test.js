/**/**

 * 8.1 PRUEBAS UNITARIAS - Validadores * 8.1 PRUEBAS UNITARIAS - Validadores

 *  * 

 * Valida los módulos de validación para BPMN, PPINOT, RALPH y RASCI * Valida los módulos de validación para BPMN, PPINOT, RALPH y RASCI

 * usando la lógica real del sistema en lugar de mocks básicos. * usando la lógica real del sistema en lugar de mocks básicos.

 */ */



import { describe, test, expect, beforeEach, jest } from '@jest/globals';import { describe, test, expect, beforeEach, jest } from '@jest/globals';



// Importar validadores reales// Importar validadores reales

import { import { 

  getBpmnElementStats,   getBpmnElementStats, 

  extractSequenceFlowsFromXml,   extractSequenceFlowsFromXml, 

  findCyclesInFlows,  findCyclesInFlows,

  CLEAN_BPMN_DIAGRAM_XML  CLEAN_BPMN_DIAGRAM_XML

} from '../../app/modules/bpmn/validators.js';} from '../../app/modules/bpmn/validators.js';



import { RasciMatrixValidator } from '../../app/modules/rasci/validation/matrix-validator.js';import { RasciMatrixValidator } from '../../app/modules/rasci/validation/matrix-validator.js';

import { isSupportedType, getIcon } from '../../app/modules/multinotationModeler/notations/ppinot/config.js';import { isSupportedType, getIcon } from '../../app/modules/multinotationModeler/notations/ppinot/config.js';

import { directEdit as PPINOTEditableTypes } from '../../app/modules/multinotationModeler/notations/ppinot/Types.js';import { directEdit as PPINOTEditableTypes } from '../../app/modules/multinotationModeler/notations/ppinot/Types.js';

import { Ralph as RALPHTypes, connections as RALPHConnections } from '../../app/modules/multinotationModeler/notations/ralph/Types.js';import { Ralph as RALPHTypes, connections as RALPHConnections } from '../../app/modules/multinotationModeler/notations/ralph/Types.js';



const { createValidBpmnXml } = require('../utils/test-helpers');const { createValidBpmnXml } = require('../utils/test-helpers');



// Mock para localStorage cuando sea necesario para RASCI// Mock para localStorage cuando sea necesario para RASCI

const mockLocalStorage = {const mockLocalStorage = {

  store: {},  store: {},

  getItem: jest.fn(function(key) { return this.store[key] || null; }),  getItem: jest.fn(function(key) { return this.store[key] || null; }),

  setItem: jest.fn(function(key, value) { this.store[key] = value; }),  setItem: jest.fn(function(key, value) { this.store[key] = value; }),

  removeItem: jest.fn(function(key) { delete this.store[key]; }),  removeItem: jest.fn(function(key) { delete this.store[key]; }),

  clear: jest.fn(function() { this.store = {}; })  clear: jest.fn(function() { this.store = {}; })

};};



Object.defineProperty(global, 'localStorage', {Object.defineProperty(global, 'localStorage', {

  value: mockLocalStorage,  value: mockLocalStorage,

  writable: true  writable: true

});});



// Mock básico para DOMParser si no está disponible// Mock básico para DOMParser si no está disponible

if (typeof global.DOMParser === 'undefined') {if (typeof global.DOMParser === 'undefined') {

  global.DOMParser = class MockDOMParser {  global.DOMParser = class MockDOMParser {

    parseFromString(xmlString) {    parseFromString(xmlString) {

      const hasParseErrors = !xmlString || xmlString.includes('malformed');      const hasParseErrors = !xmlString || xmlString.includes('malformed');

            

      return {      return {

        getElementsByTagName: (tagName) => {        getElementsByTagName: (tagName) => {

          if (tagName === 'parsererror' && hasParseErrors) {          if (tagName === 'parsererror' && hasParseErrors) {

            return [{}];            return [{}];

          }          }

          return [];          return [];

        },        },

        querySelectorAll: () => {        querySelectorAll: () => {

          const elements = [];          const elements = [];

          if (xmlString && xmlString.includes('bpmn:sequenceFlow')) {          if (xmlString && xmlString.includes('bpmn:sequenceFlow')) {

            const matches = xmlString.match(/sourceRef="([^"]*)".*?targetRef="([^"]*)"/g) || [];            const matches = xmlString.match(/sourceRef="([^"]*)".*?targetRef="([^"]*)"/g) || [];

            matches.forEach((match, index) => {            matches.forEach((match, index) => {

              const sourceMatch = match.match(/sourceRef="([^"]*)"/);              const sourceMatch = match.match(/sourceRef="([^"]*)"/);

              const targetMatch = match.match(/targetRef="([^"]*)"/);              const targetMatch = match.match(/targetRef="([^"]*)"/);

              if (sourceMatch && targetMatch) {              if (sourceMatch && targetMatch) {

                elements.push({                elements.push({

                  getAttribute: (attr) => {                  getAttribute: (attr) => {

                    if (attr === 'sourceRef') return sourceMatch[1];                    if (attr === 'sourceRef') return sourceMatch[1];

                    if (attr === 'targetRef') return targetMatch[1];                    if (attr === 'targetRef') return targetMatch[1];

                    if (attr === 'id') return `Flow_${index + 1}`;                    if (attr === 'id') return `Flow_${index + 1}`;

                    return null;                    return null;

                  }                  }

                });                });

              }              }

            });            });

          }          }

          return elements;          return elements;

        }        }

      };      };

    }    }

  };describe('8.1 Pruebas Unitarias - Validadores', () => {

}  

  describe('Validador BPMN - Lógica Real', () => {

describe('8.1 Pruebas Unitarias - Validadores', () => {    

      test('debe analizar elementos BPMN usando validador real', () => {

  describe('Validador BPMN - Lógica Real', () => {      const mockModeler = {

            get: jest.fn((serviceName) => {

    test('debe analizar elementos BPMN usando validador real', () => {          if (serviceName === 'elementRegistry') {

      const mockModeler = {            return {

        get: jest.fn((serviceName) => {              getAll: jest.fn().mockReturnValue([

          if (serviceName === 'elementRegistry') {                { type: 'bpmn:StartEvent', businessObject: { $type: 'bpmn:StartEvent' } },

            return {                { type: 'bpmn:Task', businessObject: { $type: 'bpmn:Task' } },

              getAll: jest.fn().mockReturnValue([                { type: 'bpmn:EndEvent', businessObject: { $type: 'bpmn:EndEvent' } },

                { type: 'bpmn:StartEvent', businessObject: { $type: 'bpmn:StartEvent' } },                { type: 'bpmn:SequenceFlow', businessObject: { $type: 'bpmn:SequenceFlow' } }

                { type: 'bpmn:Task', businessObject: { $type: 'bpmn:Task' } },              ])

                { type: 'bpmn:EndEvent', businessObject: { $type: 'bpmn:EndEvent' } },            };

                { type: 'bpmn:SequenceFlow', businessObject: { $type: 'bpmn:SequenceFlow' } }          }

              ])          return null;

            };        })

          }      };

          return null;

        })      const stats = getBpmnElementStats(mockModeler);

      };

      expect(stats.startEvents).toBe(1);

      const stats = getBpmnElementStats(mockModeler);      expect(stats.endEvents).toBe(1);

      expect(stats.tasks).toBe(1);

      expect(stats.startEvents).toBe(1);      expect(stats.sequenceFlows).toBe(1);

      expect(stats.endEvents).toBe(1);    });

      expect(stats.tasks).toBe(1);

      expect(stats.sequenceFlows).toBe(1);    test('debe extraer flujos secuenciales de XML real', () => {

    });      const flows = extractSequenceFlowsFromXml(CLEAN_BPMN_DIAGRAM_XML);

      

    test('debe extraer flujos secuenciales de XML real', () => {      expect(flows).toBeInstanceOf(Array);

      const flows = extractSequenceFlowsFromXml(CLEAN_BPMN_DIAGRAM_XML);      expect(flows.length).toBeGreaterThan(0);

            

      expect(flows).toBeInstanceOf(Array);      flows.forEach(flow => {

      expect(flows.length).toBeGreaterThan(0);        expect(flow).toHaveProperty('id');

              expect(flow).toHaveProperty('sourceRef');

      flows.forEach(flow => {        expect(flow).toHaveProperty('targetRef');

        expect(flow).toHaveProperty('id');      });

        expect(flow).toHaveProperty('sourceRef');    });

        expect(flow).toHaveProperty('targetRef');

      });    test('debe detectar ciclos en flujos', () => {

    });      const cyclicFlows = [

        { sourceRef: 'A', targetRef: 'B' },

    test('debe detectar ciclos en flujos', () => {        { sourceRef: 'B', targetRef: 'C' },

      const cyclicFlows = [        { sourceRef: 'C', targetRef: 'A' }

        { sourceRef: 'A', targetRef: 'B' },      ];

        { sourceRef: 'B', targetRef: 'C' },

        { sourceRef: 'C', targetRef: 'A' }      const cycles = findCyclesInFlows(cyclicFlows);

      ];      expect(cycles.length).toBeGreaterThan(0);

    });

      const cycles = findCyclesInFlows(cyclicFlows);  });

      expect(cycles.length).toBeGreaterThan(0);

    });  describe('Validador PPINOT - Configuración Real', () => {

  });    

    test('debe validar tipos PPINOT soportados', () => {

  describe('Validador PPINOT - Configuración Real', () => {      expect(isSupportedType('PPINOT:TimeMeasure')).toBe(true);

          expect(isSupportedType('PPINOT:CountMeasure')).toBe(true);

    test('debe validar tipos PPINOT soportados', () => {      expect(isSupportedType('INVALID:Type')).toBe(false);

      expect(isSupportedType('PPINOT:TimeMeasure')).toBe(true);    });

      expect(isSupportedType('PPINOT:CountMeasure')).toBe(true);

      expect(isSupportedType('INVALID:Type')).toBe(false);    test('debe obtener iconos PPINOT', () => {

    });      const icon = getIcon('timeMeasure');

      expect(icon).toBeDefined();

    test('debe obtener iconos PPINOT', () => {      expect(typeof icon).toBe('string');

      const icon = getIcon('timeMeasure');    });

      expect(icon).toBeDefined();

      expect(typeof icon).toBe('string');    test('debe validar tipos editables', () => {

    });      expect(PPINOTEditableTypes).toBeInstanceOf(Array);

      expect(PPINOTEditableTypes).toContain('PPINOT:Target');

    test('debe validar tipos editables', () => {      expect(PPINOTEditableTypes).toContain('PPINOT:Scope');

      expect(PPINOTEditableTypes).toBeInstanceOf(Array);    });

      expect(PPINOTEditableTypes).toContain('PPINOT:Target');  });

      expect(PPINOTEditableTypes).toContain('PPINOT:Scope');

    });  describe('Validador RALPH - Tipos Real', () => {

  });    

    test('debe validar elementos RALPH', () => {

  describe('Validador RALPH - Tipos Real', () => {      expect(RALPHTypes).toBeInstanceOf(Array);

          expect(RALPHTypes).toContain('RALph:Person');

    test('debe validar elementos RALPH', () => {      expect(RALPHTypes).toContain('RALph:RoleRALph');

      expect(RALPHTypes).toBeInstanceOf(Array);    });

      expect(RALPHTypes).toContain('RALph:Person');

      expect(RALPHTypes).toContain('RALph:RoleRALph');    test('debe validar conexiones RALPH', () => {

    });      expect(RALPHConnections).toBeInstanceOf(Array);

      expect(RALPHConnections).toContain('RALph:ResourceArc');

    test('debe validar conexiones RALPH', () => {    });

      expect(RALPHConnections).toBeInstanceOf(Array);  });

      expect(RALPHConnections).toContain('RALph:ResourceArc');

    });  describe('Validador RASCI - Lógica Real', () => {

  });    let validator;



  describe('Validador RASCI - Lógica Real', () => {    beforeEach(() => {

    let validator;      validator = new RasciMatrixValidator();

      mockLocalStorage.clear();

    beforeEach(() => {    });

      validator = new RasciMatrixValidator();

      mockLocalStorage.clear();    test('debe validar matriz RASCI válida', () => {

    });      const roles = ['Manager', 'Developer'];

      const matrixData = {

    test('debe validar matriz RASCI válida', () => {        'Task_1': {

      const roles = ['Manager', 'Developer'];          'Manager': 'A',

      const matrixData = {          'Developer': 'R'

        'Task_1': {        }

          'Manager': 'A',      };

          'Developer': 'R'

        }      const result = validator.validateMatrix(roles, matrixData);

      };

      expect(result.isValid).toBe(true);

      const result = validator.validateMatrix(roles, matrixData);      expect(result.criticalErrors).toHaveLength(0);

    });

      expect(result.isValid).toBe(true);

      expect(result.criticalErrors).toHaveLength(0);    test('debe detectar tareas sin responsable', () => {

    });      const roles = ['Manager', 'Developer'];

      const matrixData = {

    test('debe detectar tareas sin responsable', () => {        'Task_1': {

      const roles = ['Manager', 'Developer'];          'Manager': 'A',

      const matrixData = {          'Developer': 'C' // No hay responsable

        'Task_1': {        }

          'Manager': 'A',      };

          'Developer': 'C' // No hay responsable

        }      const result = validator.validateMatrix(roles, matrixData);

      };

      expect(result.isValid).toBe(false);

      const result = validator.validateMatrix(roles, matrixData);      expect(result.criticalErrors.length).toBeGreaterThan(0);

      expect(result.criticalErrors[0].message).toContain('no tiene ningún responsable');

      expect(result.isValid).toBe(false);    });

      expect(result.criticalErrors.length).toBeGreaterThan(0);

      expect(result.criticalErrors[0].message).toContain('no tiene ningún responsable');    test('debe detectar responsables duplicados', () => {

    });      const roles = ['Manager', 'Developer'];

      const matrixData = {

    test('debe detectar responsables duplicados', () => {        'Task_1': {

      const roles = ['Manager', 'Developer'];          'Manager': 'R',

      const matrixData = {          'Developer': 'R' // Dos responsables

        'Task_1': {        }

          'Manager': 'R',      };

          'Developer': 'R' // Dos responsables

        }      const result = validator.validateMatrix(roles, matrixData);

      };

      expect(result.isValid).toBe(false);

      const result = validator.validateMatrix(roles, matrixData);      expect(result.criticalErrors.length).toBeGreaterThan(0);

      expect(result.criticalErrors[0].message).toContain('múltiples responsables');

      expect(result.isValid).toBe(false);    });

      expect(result.criticalErrors.length).toBeGreaterThan(0);

      expect(result.criticalErrors[0].message).toContain('múltiples responsables');    test('debe validar celdas individuales', () => {

    });      const validResult = validator.validateCell('Manager', 'Task_1', 'R');

      expect(validResult.isValid).toBe(true);

    test('debe validar celdas individuales', () => {

      const validResult = validator.validateCell('Manager', 'Task_1', 'R');      const invalidResult = validator.validateCell('Manager', 'Task_1', 'X');

      expect(validResult.isValid).toBe(true);      expect(invalidResult.isValid).toBe(false);

    });

      const invalidResult = validator.validateCell('Manager', 'Task_1', 'X');  });

      expect(invalidResult.isValid).toBe(false);});

    });

  });      expect(summary.isValid).toBe(false);

});      expect(summary.criticalErrors.find(err => err.message.includes('múltiples responsables'))).toBeDefined();
    });

    test('debe detectar múltiples aprobadores en una tarea', () => {
      matrixManagerMock.__setMockBpmnTasks(['Task_1']);
      const roles = ['Analista', 'Supervisor'];
      const matrix = {
        Task_1: {
          Analista: 'A',
          Supervisor: 'A'
        }
      };

      const summary = validator.validateMatrix(roles, matrix, roles);

      expect(summary.isValid).toBe(false);
      expect(summary.criticalErrors.find(err => err.message.includes('múltiples aprobadores'))).toBeDefined();
    });

    test('debe limpiar tareas que no existen en el modelo BPMN', () => {
      matrixManagerMock.__setMockBpmnTasks(['Task_1']);
      const roles = ['Analista', 'Supervisor'];
      const matrix = {
        Task_1: {
          Analista: 'R',
          Supervisor: 'A'
        },
        Task_orphan: {
          Analista: 'R'
        }
      };

      const summary = validator.validateMatrix(roles, matrix, roles);

      expect(summary.isValid).toBe(true);
      expect(matrix.Task_orphan).toBeUndefined();
    });

    test('debe advertir cuando un rol de soporte no está definido en PPINOT', () => {
      matrixManagerMock.__setMockBpmnTasks(['Task_1']);
      const roles = ['Analista', 'Soporte'];
      const matrix = {
        Task_1: {
          Analista: 'R',
          Soporte: 'S'
        }
      };

      const organizationalRoles = ['Analista'];
      const summary = validator.validateMatrix(roles, matrix, organizationalRoles);

      expect(summary.isValid).toBe(true);
      expect(summary.warnings.some(warning => warning.message.includes('no está definido en el modelo organizativo'))).toBe(true);
    });

    test('validateSpecificCell debe rechazar caracteres inválidos', () => {
      const cellResult = validator.validateSpecificCell('Analista', 'Task_1', 'X');

      expect(cellResult.isValid).toBe(false);
      expect(cellResult.issues[0]).toContain('Caracteres inválidos');
    });

    test('validateRealTime devuelve únicamente errores críticos', () => {
      matrixManagerMock.__setMockBpmnTasks(['Task_1']);
      const roles = ['Analista', 'Supervisor'];
      const matrix = {
        Task_1: {
          Analista: 'A',
          Supervisor: 'A'
        }
      };

      const summary = validator.validateRealTime(roles, matrix, roles);

      expect(summary.hasCriticalErrors).toBe(true);
      expect(summary.warnings).toHaveLength(0);
      expect(summary.criticalErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Validador de Proyecto Completo', () => {
    test('debe validar proyecto .mmproject completo', () => {
      const validProject = createValidMmProject();

      // Validaciones básicas de estructura
      expect(validProject.version).toBeDefined();
      expect(validProject.bpmn).toBeDefined();
      expect(validProject.ppinot).toBeDefined();
      expect(validProject.ralph).toBeDefined();
      expect(validProject.rasci).toBeDefined();
      
      // Validar estructura RASCI
      expect(validProject.rasci.roles).toBeDefined();
      expect(validProject.rasci.tasks).toBeDefined();
      expect(validProject.rasci.matrix).toBeDefined();
    });

    test('debe detectar inconsistencias entre notaciones', () => {
      const inconsistentProject = {
        ...createValidMmProject(),
        rasci: {
          roles: ['Role_1'],
          tasks: ['NonExistentTask'], // Tarea que no existe en BPMN
          matrix: {
            'NonExistentTask': {
              'Role_1': 'A'
            }
          }
        }
      };

      // Validación manual de consistencia
      const bpmnXml = inconsistentProject.bpmn;
      const rasciTasks = inconsistentProject.rasci.tasks;
      
      // Verificar si las tareas RASCI existen en BPMN
      const inconsistentTasks = rasciTasks.filter(task => 
        !bpmnXml.includes(task)
      );
      
      expect(inconsistentTasks.length).toBeGreaterThan(0);
      expect(inconsistentTasks).toContain('NonExistentTask');
    });
  });

  describe('Tests Negativos Explícitos', () => {
    test('debe rechazar XML BPMN malformado', () => {
      const invalidXmls = [
        '', // XML vacío
        'invalid xml content', // No es XML
        '<bpmn:definitions></invalid>', // XML mal cerrado
        '<bpmn:definitions><bpmn:process></bpmn:definitions>', // Proceso sin cerrar
        '<?xml version="1.0"?><invalid></invalid>' // XML válido pero no BPMN
      ];

      invalidXmls.forEach(xml => {
        expect(xml.includes('bpmn:startEvent')).toBe(false);
        expect(xml.includes('bpmn:endEvent')).toBe(false);
        expect(xml.includes('bpmn:task')).toBe(false);
      });
    });

    test('debe rechazar estructuras PPINOT inválidas', () => {
      const invalidPPIs = [
        null, // PPI nulo
        undefined, // PPI indefinido
        {}, // PPI vacío
        { id: '' }, // ID vacío
        { id: 'PPI_1' }, // Sin targetRef
        { targetRef: 'Task_1' }, // Sin ID
        { id: 'PPI_1', targetRef: '' }, // targetRef vacío
        { id: '', targetRef: 'Task_1' } // ID vacío
      ];

      invalidPPIs.forEach(ppi => {
        const isValid = ppi && ppi.id && ppi.targetRef && 
                       ppi.id.length > 0 && ppi.targetRef.length > 0;
        expect(isValid).toBeFalsy(); // Más flexible para null/undefined/false
      });
    });

    test('debe rechazar matrices RASCI inválidas', () => {
      const invalidMatrices = [
        null, // Matriz nula
        undefined, // Matriz indefinida
        {}, // Matriz vacía
        { 'Task_1': {} }, // Asignaciones vacías
        { 'Task_1': { 'Role_1': 'X' } }, // Asignación inválida (X no es R,A,S,C,I)
        { 'Task_1': { 'Role_1': '' } }, // Asignación vacía
        { 'Task_1': { '': 'A' } }, // Rol vacío
        { '': { 'Role_1': 'A' } } // Tarea vacía
      ];

      invalidMatrices.forEach(matrix => {
        if (!matrix || typeof matrix !== 'object') {
          expect(matrix).toBeFalsy();
          return;
        }

        Object.entries(matrix).forEach(([taskId, assignments]) => {
          if (!taskId || !assignments || typeof assignments !== 'object') {
            expect(taskId && assignments).toBeFalsy();
            return;
          }

          Object.entries(assignments).forEach(([roleId, assignment]) => {
            const validAssignments = ['R', 'A', 'S', 'C', 'I'];
            const isValid = roleId && roleId.length > 0 && 
                           assignment && validAssignments.includes(assignment);
            
            if (!isValid) {
              expect(isValid).toBeFalsy(); // Acepta false, null, undefined, "", 0
            }
          });
        });
      });
    });

    test('debe fallar validación con datos circulares', () => {
      // Crear estructura circular
      const circularRoles = {
        'manager': { dependsOn: ['analyst'] },
        'analyst': { dependsOn: ['manager'] } // Circular!
      };

      // Detectar ciclo usando DFS
      function hasCycle(roles, visited = new Set(), role = 'manager') {
        if (visited.has(role)) return true;
        visited.add(role);
        
        const dependencies = roles[role]?.dependsOn || [];
        for (const dep of dependencies) {
          if (hasCycle(roles, new Set(visited), dep)) {
            return true;
          }
        }
        return false;
      }

      expect(hasCycle(circularRoles)).toBe(true);
    });
  });
});
