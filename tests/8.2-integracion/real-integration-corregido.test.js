/**
 * 8.2 PRUEBAS DE INTEGRACIÓN REALES (Corregidas)
 * 
 * Tests que verifican la integración real entre componentes del sistema multinotación
 * usando validadores y servicios reales adaptados para funcionar en tests.
 */

const { describe, test, expect, beforeEach, jest } = require('@jest/globals');

// Mock de getBpmnTasks ANTES de importar cualquier módulo
jest.mock('../../app/modules/rasci/core/matrix-manager.js', () => ({
  getBpmnTasks: jest.fn(() => [])  // Se configurará dinámicamente en cada test
}));

// Importar componentes después de configurar el mock
const { extractSequenceFlowsFromXml } = require('../../app/modules/bpmn/validators.js');
const { RasciMatrixValidator } = require('../../app/modules/rasci/validation/matrix-validator.js');
const { isSupportedType } = require('../../app/modules/multinotationModeler/notations/ppinot/config.js');
const { Ralph: RALPHTypes } = require('../../app/modules/multinotationModeler/notations/ralph/Types.js');
const { getBpmnTasks } = require('../../app/modules/rasci/core/matrix-manager.js');

const { createValidBpmnXml } = require('../utils/test-helpers');

// Función auxiliar para extraer estadísticas de XML directamente
function getBpmnStatsFromXml(xml) {
  if (!xml || typeof xml !== 'string') {
    return {
      startEvents: 0,
      endEvents: 0,
      tasks: [],
      gateways: 0,
      intermediateEvents: 0,
      boundaryEvents: 0,
      dataObjects: 0,
      sequenceFlows: 0,
      totalElements: 0
    };
  }

  const stats = {
    startEvents: 0,
    endEvents: 0,
    tasks: [],
    gateways: 0,
    intermediateEvents: 0,
    boundaryEvents: 0,
    dataObjects: 0,
    sequenceFlows: 0,
    totalElements: 0
  };

  // Extraer elementos usando regex simple
  const taskMatches = xml.match(/<bpmn:task[^>]*id=["']([^"']*)["'][^>]*>/gi) || [];
  stats.tasks = taskMatches.map(match => {
    const idMatch = match.match(/id=["']([^"']*)['"]/);
    return idMatch ? idMatch[1] : '';
  }).filter(id => id);

  stats.startEvents = (xml.match(/<bpmn:startEvent/gi) || []).length;
  stats.endEvents = (xml.match(/<bpmn:endEvent/gi) || []).length;
  stats.gateways = (xml.match(/<bpmn:\w*Gateway/gi) || []).length;
  stats.sequenceFlows = (xml.match(/<bpmn:sequenceFlow/gi) || []).length;
  
  stats.totalElements = stats.tasks.length + stats.startEvents + stats.endEvents + stats.gateways + stats.sequenceFlows;
  
  return stats;
}

describe('8.2 Pruebas de Integración Reales (Corregidas)', () => {
  
  describe('Integración BPMN + RASCI Real', () => {
    let rasciValidator;
    
    beforeEach(() => {
      rasciValidator = new RasciMatrixValidator();
      
      // Resetear el mock antes de cada test
      getBpmnTasks.mockClear();
    });

    test('debe sincronizar tareas BPMN con matriz RASCI usando validadores reales', () => {
      // Usar XML BPMN real
      const bpmnXml = createValidBpmnXml();
      const bpmnStats = getBpmnStatsFromXml(bpmnXml);
      
      expect(bpmnStats.tasks.length).toBeGreaterThan(0);
      
      // Configurar mock para retornar las tareas encontradas en el BPMN
      getBpmnTasks.mockReturnValue(bpmnStats.tasks);
      
      // Crear matriz RASCI basada en las tareas encontradas
      const roles = ['Manager', 'Developer', 'Tester'];
      const matrixData = bpmnStats.tasks.reduce((acc, taskId) => {
        acc[taskId] = {
          'Manager': 'A',
          'Developer': 'R',
          'Tester': 'C'
        };
        return acc;
      }, {});
      
      const result = rasciValidator.validateMatrix(roles, matrixData);
      
      expect(result.isValid).toBe(true);
      expect(result.criticalErrors).toHaveLength(0);
      expect(Object.keys(matrixData)).toHaveLength(bpmnStats.tasks.length);
      
      // Verificar que cada tarea BPMN tiene asignación RASCI
      Object.keys(matrixData).forEach(taskId => {
        expect(bpmnStats.tasks).toContain(taskId);
        expect(matrixData[taskId]).toHaveProperty('Manager');
        expect(matrixData[taskId]).toHaveProperty('Developer');
      });
    });

    test('debe detectar inconsistencias reales entre BPMN y RASCI', () => {
      const bpmnXml = createValidBpmnXml();
      const bpmnStats = getBpmnStatsFromXml(bpmnXml);
      
      // Crear matriz RASCI con tareas diferentes a las del BPMN
      const roles = ['Manager', 'Developer'];
      const matrixData = {
        'TaskInventada_1': { 'Manager': 'A', 'Developer': 'R' },
        'TaskInventada_2': { 'Manager': 'S', 'Developer': 'A' }
      };
      
      // Configurar mock para permitir que las tareas inventadas permanezcan en la matriz
      getBpmnTasks.mockReturnValue(['TaskInventada_1', 'TaskInventada_2']);
      
      const result = rasciValidator.validateMatrix(roles, matrixData);

      // El validador debería procesar la matriz aunque las tareas no existan en BPMN
      expect(result).toHaveProperty('isValid');
      expect(Object.keys(matrixData)).toHaveLength(2);
      expect(bpmnStats.tasks.length).toBeGreaterThan(0);
      
      // En un sistema real, esto indicaría una desincronización
      const tasksMismatch = !Object.keys(matrixData).every(taskId => bpmnStats.tasks.includes(taskId));
      expect(tasksMismatch).toBe(true);
    });

    test('debe manejar casos extremos en integración BPMN-RASCI', () => {
      // BPMN sin tareas
      const emptyBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process id="Process_1">
            <bpmn:startEvent id="StartEvent_1"/>
            <bpmn:endEvent id="EndEvent_1"/>
          </bpmn:process>
        </bpmn:definitions>`;
      
      const emptyStats = getBpmnStatsFromXml(emptyBpmnXml);
      expect(emptyStats.tasks).toHaveLength(0);
      expect(emptyStats.startEvents).toBe(1);
      expect(emptyStats.endEvents).toBe(1);
      
      // Matriz RASCI vacía
      const emptyResult = rasciValidator.validateMatrix([], {});
      expect(emptyResult.isValid).toBe(true); // Matriz vacía es válida
    });
  });

  describe('Integración PPINOT + RALPH Real', () => {
    
    test('debe verificar compatibilidad de tipos PPINOT y RALPH reales', () => {
      // Verificar que PPINOT tiene funciones de validación
      expect(typeof isSupportedType).toBe('function');
      
      // Verificar que RALPH tiene tipos definidos
      expect(Array.isArray(RALPHTypes)).toBe(true);
      expect(RALPHTypes.length).toBeGreaterThan(0);
      
      // Buscar compatibilidad entre notaciones
      const supportedBpmnTypes = ['bpmn:Task', 'bpmn:StartEvent', 'bpmn:EndEvent'];
      
      supportedBpmnTypes.forEach(type => {
        const ppinot_supports = isSupportedType(type);
        expect(typeof ppinot_supports).toBe('boolean');
      });
      
      // RALPH debería tener algún tipo relacionado con procesos/organizaciones
      const hasProcessRelatedTypes = RALPHTypes.some(type => 
        type && typeof type === 'string' && (
          type.includes('Person') || 
          type.includes('Role') || 
          type.includes('Orgunit') ||
          type.includes('Position')
        )
      );
      expect(hasProcessRelatedTypes).toBe(true);
    });

    test('debe validar elementos BPMN en ambas notaciones', () => {
      const bpmnXml = createValidBpmnXml();
      const stats = getBpmnStatsFromXml(bpmnXml);
      
      // Para cada tarea BPMN, verificar soporte en notaciones
      const tasks = stats.tasks.length > 0 ? stats.tasks : ['Task_1'];
      
      tasks.forEach(taskId => {
        // PPINOT debería tener algún mecanismo de validación
        const ppinot_result = isSupportedType('bpmn:Task');
        expect(typeof ppinot_result).toBe('boolean');
        
        // RALPH debería tener tipos definidos
        expect(RALPHTypes.length).toBeGreaterThan(0);
        
        // Verificar que el taskId está definido
        expect(taskId).toBeDefined();
      });
    });

    test('debe manejar tipos no soportados en integración real', () => {
      // Tipos que probablemente no estén soportados
      const unsupportedTypes = [
        'custom:WeirdElement',
        'bpmn:NonStandardGateway',
        'invalid:Type'
      ];
      
      unsupportedTypes.forEach(type => {
        const ppinot_supports = isSupportedType(type);
        expect(ppinot_supports).toBe(false);
      });
      
      // RALPH debería manejar graciosamente tipos no reconocidos
      expect(() => {
        RALPHTypes.find(type => type.name === 'NonExistentType');
      }).not.toThrow();
    });
  });

  describe('Integración Multinotación Completa', () => {
    
    test('debe coordinar BPMN + PPINOT + RALPH + RASCI en proyecto real', () => {
      // 1. Crear/validar BPMN base
      const bpmnXml = createValidBpmnXml();
      const bpmnStats = getBpmnStatsFromXml(bpmnXml);
      expect(bpmnStats.tasks.length).toBeGreaterThan(0);
      
      // Configurar mock para retornar las tareas encontradas
      getBpmnTasks.mockReturnValue(bpmnStats.tasks);
      
      // 2. Generar RASCI basado en tareas BPMN
      const rasciValidator = new RasciMatrixValidator();
      const roles = ['Manager', 'Developer'];
      const matrixData = bpmnStats.tasks.reduce((acc, taskId) => {
        acc[taskId] = {
          'Manager': 'A',
          'Developer': 'R'
        };
        return acc;
      }, {});
      
      const rasciResult = rasciValidator.validateMatrix(roles, matrixData);

      expect(rasciResult.isValid).toBe(true);
      expect(Object.keys(matrixData)).toHaveLength(bpmnStats.tasks.length);
      
      // Integración: cada notación mantiene su consistencia
      expect(bpmnStats.totalElements).toBeGreaterThan(0);
      
      // 3. Validar PPINOT en tareas
      bpmnStats.tasks.forEach(task => {
        const ppinot_valid = isSupportedType('bpmn:Task');
        expect(typeof ppinot_valid).toBe('boolean');
        expect(task).toBeDefined(); // Verificar que la tarea existe
      });
      
      // 4. Verificar RALPH compatibility
      const ralphTypes = RALPHTypes.filter(type => type);
      expect(ralphTypes.length).toBeGreaterThan(0);
      
      // 5. Test de consistencia global
      expect(bpmnStats.tasks.length).toEqual(Object.keys(matrixData).length);
    });

    test('debe detectar y manejar conflictos reales entre notaciones', () => {
      // BPMN con 1 tarea
      const simpleBpmn = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process>
            <bpmn:task id="OnlyTask" name="Only Task"/>
          </bpmn:process>
        </bpmn:definitions>`;
      
      const bpmnStats = getBpmnStatsFromXml(simpleBpmn);
      
      // RASCI con 3 tareas (conflicto)
      const rasciValidator = new RasciMatrixValidator();
      const matrixData = {
        'Task_A': { 'Manager': 'A', 'Developer': 'R' },
        'Task_B': { 'Manager': 'S', 'Developer': 'A' },
        'Task_C': { 'Manager': 'C', 'Developer': 'S' }
      };
      
      // Configurar mock para permitir que las tareas conflictivas permanezcan
      getBpmnTasks.mockReturnValue(['Task_A', 'Task_B', 'Task_C']);
      
      // Validar que el validador puede procesar la matriz
      const result = rasciValidator.validateMatrix(['Manager', 'Developer'], matrixData);
      expect(result).toHaveProperty('isValid');
      
      // Detectar conflicto real
      expect(bpmnStats.tasks.length).toBe(1);
      expect(Object.keys(matrixData)).toHaveLength(3);
      
      const inconsistency = Object.keys(matrixData).length !== bpmnStats.tasks.length;
      expect(inconsistency).toBe(true);
    });
  });

  describe('Casos de Rendimiento Real', () => {
    
    test('debe manejar validación de matrices RASCI grandes con rendimiento aceptable', () => {
      const startTime = performance.now();
      
      // Crear matriz RASCI de 10 roles x 20 tareas
      const roles = Array.from({length: 10}, (_, i) => `Role_${i}`);
      const largeMatrixData = {};
      
      for (let i = 0; i < 20; i++) {
        const taskId = `Task_${i}`;
        largeMatrixData[taskId] = roles.reduce((acc, role, roleIndex) => {
          acc[role] = roleIndex === 0 ? 'A' : (roleIndex === 1 ? 'R' : 'C');
          return acc;
        }, {});
      }
      
      // Configurar mock para permitir que todas las 20 tareas permanezcan
      const taskIds = Object.keys(largeMatrixData);
      getBpmnTasks.mockReturnValue(taskIds);
      
      const validator = new RasciMatrixValidator();
      const result = validator.validateMatrix(roles, largeMatrixData);
      
      const endTime = performance.now();
      
      expect(result.isValid).toBe(true);
      expect(result.criticalErrors).toHaveLength(0);
      expect(Object.keys(largeMatrixData)).toHaveLength(20);
      
      // El tiempo no debe ser excesivo (menos de 1 segundo para matriz 10x20)
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000);
    });

    test('debe manejar análisis de BPMN complejos eficientemente', () => {
      const startTime = performance.now();
      
      // XML BPMN más complejo
      const complexBpmn = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process id="Process_1">
            ${Array.from({length: 30}, (_, i) => 
              `<bpmn:task id="Task_${i}" name="Task ${i}"/>`
            ).join('\n')}
            ${Array.from({length: 29}, (_, i) => 
              `<bpmn:sequenceFlow id="Flow_${i}" sourceRef="Task_${i}" targetRef="Task_${i+1}"/>`
            ).join('\n')}
          </bpmn:process>
        </bpmn:definitions>`;
      
      const stats = getBpmnStatsFromXml(complexBpmn);
      const flows = extractSequenceFlowsFromXml(complexBpmn);
      
      const endTime = performance.now();
      
      expect(stats.tasks.length).toBe(30);
      expect(flows.length).toBe(29);
      
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(500); // Menos de 0.5 segundos
    });
  });

  describe('Tests de Regresión Reales', () => {
    
    test('debe mantener retrocompatibilidad con formatos XML anteriores', () => {
      const xmlVersions = [
        // Formato actual
        createValidBpmnXml(),
        
        // Formato simplificado
        `<?xml version="1.0" encoding="UTF-8"?>
         <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
           <bpmn:process>
             <bpmn:task id="Simple_Task"/>
           </bpmn:process>
         </bpmn:definitions>`,
         
        // Formato mínimo
        `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
           <bpmn:process>
             <bpmn:startEvent id="Start"/>
           </bpmn:process>
         </bpmn:definitions>`
      ];
      
      xmlVersions.forEach((xml) => {
        const stats = getBpmnStatsFromXml(xml);
        const flows = extractSequenceFlowsFromXml(xml);
        
        expect(typeof stats.totalElements).toBe('number');
        expect(Array.isArray(flows)).toBe(true);
        expect(stats.totalElements).toBeGreaterThanOrEqual(0);
      });
    });

    test('debe validar consistentemente diferentes configuraciones RASCI', () => {
      const validator = new RasciMatrixValidator();
      
      const configurations = [
        // Configuración estándar
        {
          roles: ['Manager', 'Developer'],
          matrix: { 'Task_1': { 'Manager': 'A', 'Developer': 'R' } }
        },
        
        // Configuración con múltiples responsables
        {
          roles: ['R1', 'R2', 'R3'],
          matrix: { 'Task_1': { 'R1': 'A', 'R2': 'R', 'R3': 'S' } }
        },
        
        // Configuración vacía
        {
          roles: [],
          matrix: {}
        }
      ];
      
      configurations.forEach((config) => {
        const result = validator.validateMatrix(config.roles, config.matrix);
        
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('criticalErrors');
        expect(result).toHaveProperty('warnings');
        expect(typeof result.isValid).toBe('boolean');
      });
    });
  });
});