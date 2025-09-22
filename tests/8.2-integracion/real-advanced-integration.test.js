/**
 * 8.2 PRUEBAS DE INTEGRACIÓN AVANZADAS - Tests Reales
 * 
 * Tests que verifican la integración real entre      const invali      const invalidMatrix = {};
      tasksFromBpmn.forEach(task => {
        invalidMatrix[task] = {
          'role1': 'A',  // Solo aprobador, sin responsable
          'role2': 'S',
          'role3': 'C'
          // Falta responsable (R) - esto SÍ genera error
        };
      }); {};
      tasksFromBpmn.forEach(task => {
        invalidMatrix[task] = {
          'role1': 'A',  // Solo aprobador, sin responsable
          'role2': 'S',
          'role3': 'C'
          // Falta responsable (R) - esto SÍ genera error
        };
      });
      
      // Opciones para test de integración
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: tasksFromBpmn
      };
      
      const validation = rasciValidator.validateMatrix(roles, invalidMatrix, testOptions);
      expect(validation.isValid).toBe(false);
      expect(validation.criticalErrors.length).toBeGreaterThan(0);stema multinotación
 * usando validadores y servicios reales para detectar problemas de regresión reales.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// Importar componentes reales para tests de integración
import { extractSequenceFlowsFromXml, getBpmnElementStats } from '../../app/modules/bpmn/validators.js';
import { RasciMatrixValidator } from '../../app/modules/rasci/validation/matrix-validator.js';
import { isSupportedType } from '../../app/modules/multinotationModeler/notations/ppinot/config.js';
import { Ralph as RALPHTypes } from '../../app/modules/multinotationModeler/notations/ralph/Types.js';

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

describe('8.2 Pruebas de Integración Avanzadas - Componentes Reales', () => {
  
  describe('Integración BPMN + RASCI con validación real', () => {
    let rasciValidator;
    
    beforeEach(() => {
      rasciValidator = new RasciMatrixValidator();
    });

    test('Validación completa BPMN+RASCI con datos reales', async () => {
      // Usar XML BPMN real
      const bpmnXml = createValidBpmnXml();
      
      // Extraer estadísticas reales del BPMN
      const bpmnStats = getBpmnStatsFromXml(bpmnXml);
      expect(bpmnStats).toHaveProperty('tasks');
      expect(bpmnStats).toHaveProperty('gateways');
      expect(bpmnStats).toHaveProperty('startEvents');
      
      // Crear matriz RASCI basada en las tareas encontradas
      const tasks = bpmnStats.tasks || ['Task_1', 'Task_2', 'Task_3'];
      const roles = ['manager', 'developer', 'tester'];
      
      const rasciMatrix = {};
      tasks.forEach(task => {
        rasciMatrix[task] = {
          'manager': 'A',
          'developer': 'R', 
          'tester': 'C'
        };
      });
      
      // Opciones para test de integración
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: tasks
      };
      
      // Validar con el validador real
      const validation = rasciValidator.validateMatrix(roles, rasciMatrix, testOptions);
      expect(validation.isValid).toBe(true);
      expect(validation.criticalErrors).toHaveLength(0);
    });

    test('Detección de inconsistencias reales BPMN-RASCI', async () => {
      const bpmnXml = createValidBpmnXml();
      const bpmnStats = getBpmnElementStats(bpmnXml);
      
      // Crear matriz RASCI inválida (sin roles A) usando tareas del BPMN
      const tasksFromBpmn = bpmnStats.tasks && bpmnStats.tasks.length > 0 ? bpmnStats.tasks : ['Task_1'];
      const roles = ['role1', 'role2', 'role3'];
      
      const invalidMatrix = {};
      tasksFromBpmn.slice(0, 1).forEach(task => {
        invalidMatrix[task] = {
          'role1': 'A',  // Solo aprobador, sin responsable
          'role2': 'S', 
          'role3': 'C'
          // Falta responsable (R) - esto SÍ genera error
        };
      });
      
      // Opciones para test de integración
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: tasksFromBpmn
      };
      
      const validation = rasciValidator.validateMatrix(roles, invalidMatrix, testOptions);
      expect(validation.isValid).toBe(false);
      expect(validation.criticalErrors.length).toBeGreaterThan(0);
    });

    test('Rendimiento con BPMN complejo + RASCI grande', () => {
      const start = performance.now();
      
      // XML BPMN más complejo
      const complexBpmn = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process id="Process_1">
            ${Array.from({length: 50}, (_, i) => 
              `<bpmn:task id="Task_${i}" name="Task ${i}"/>`
            ).join('\n')}
          </bpmn:process>
        </bpmn:definitions>`;
      
      const stats = getBpmnStatsFromXml(complexBpmn);
      expect(stats.tasks.length).toBe(50);
      
      // Matriz RASCI grande
      const largeMatrix = Array.from({length: 50}, (_, i) => ({
        task: `Task_${i}`,
        manager: 'A',
        developer: i % 2 === 0 ? 'R' : 'S',
        tester: 'C'
      }));
      
      const validation = rasciValidator.validateMatrix(largeMatrix);
      
      const end = performance.now();
      expect(end - start).toBeLessThan(1000); // Menos de 1 segundo
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Integración PPINOT + RALPH con tipos reales', () => {
    
    test('Compatibilidad de tipos PPINOT y RALPH reales', () => {
      // Verificar que PPINOT soporta elementos PPINOT (no BPMN básicos)
      expect(isSupportedType('PPINOT:TimeMeasure')).toBe(true);
      expect(isSupportedType('PPINOT:Ppi')).toBe(true);
      expect(isSupportedType('PPINOT:Target')).toBe(true);
      
      // Verificar que BPMN básicos no son soportados por PPINOT (comportamiento real)
      expect(isSupportedType('bpmn:Task')).toBe(false);
      expect(isSupportedType('bpmn:StartEvent')).toBe(false);
      expect(isSupportedType('bpmn:EndEvent')).toBe(false);
      
      // Verificar que RALPH tiene tipos definidos
      expect(Array.isArray(RALPHTypes)).toBe(true);
      expect(RALPHTypes.length).toBeGreaterThan(0);
      
      // Verificar compatibilidad básica: RALPH tiene tipos definidos independientemente de BPMN
      const ralphCompatible = RALPHTypes.length > 0 && 
        RALPHTypes.some(type => typeof type === 'string' && type.includes('RALph'));
      
      expect(ralphCompatible).toBe(true);
    });

    test('Validación cruzada PPINOT-RALPH en elementos BPMN', () => {
      const bpmnXml = createValidBpmnXml();
      const stats = getBpmnStatsFromXml(bpmnXml);
      
      // Para cada tarea BPMN, verificar soporte en ambas notaciones
      const tasks = stats.tasks || ['Task_1'];
      
      tasks.forEach(taskId => {
        // PPINOT no soporta tareas BPMN directamente (comportamiento real)
        expect(isSupportedType('bpmn:Task')).toBe(false);
        
        // RALPH debe tener definiciones relacionadas con roles/personas (no tareas específicas)
        const ralphOrgTypes = RALPHTypes.filter(type => 
          type.includes('Person') || type.includes('Role') || type.includes('Orgunit')
        );
        expect(ralphOrgTypes.length).toBeGreaterThan(0);
      });
    });

    test('Manejo de tipos no soportados en integración real', () => {
      // Tipos que no deberían estar soportados
      const unsupportedTypes = [
        'custom:WeirdElement',
        'bpmn:NonStandardGateway',
        'invalid:Type'
      ];
      
      unsupportedTypes.forEach(type => {
        expect(isSupportedType(type)).toBe(false);
      });
      
      // RALPH debería manejar graciosamente tipos no reconocidos
      expect(() => {
        RALPHTypes.find(type => type.name === 'NonExistentType');
      }).not.toThrow();
    });
  });

  describe('Coordinación completa multinotación real', () => {
    
    test('Workflow completo con todas las notaciones integradas', async () => {
      // 1. Crear/validar BPMN base
      const bpmnXml = createValidBpmnXml();
      const bpmnStats = getBpmnStatsFromXml(bpmnXml);
      expect(bpmnStats.tasks.length).toBeGreaterThan(0);
      
      // 2. Generar RASCI basado en tareas BPMN
      const rasciValidator = new RasciMatrixValidator();
      const roles = ['manager', 'developer', 'tester'];
      const rasciMatrix = {};
      bpmnStats.tasks.forEach(task => {
        rasciMatrix[task] = {
          'manager': 'A',
          'developer': 'R',
          'tester': 'C'
        };
      });
      
      // Opciones para test de integración
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: bpmnStats.tasks
      };
      
      const rasciValidation = rasciValidator.validateMatrix(roles, rasciMatrix, testOptions);
      expect(rasciValidation.isValid).toBe(true);
      
      // 3. Validar PPINOT en tareas
      bpmnStats.tasks.forEach(task => {
        expect(isSupportedType('bpmn:Task')).toBe(false); // PPINOT no soporta tipos BPMN básicos
        expect(task).toBeDefined(); // Verificar que la tarea existe
      });
      
      // 4. Verificar RALPH compatibility
      const ralphTypes = RALPHTypes.filter(type => typeof type === 'string');
      expect(ralphTypes.length).toBeGreaterThan(0);
      
      // 5. Test de consistencia global
      expect(bpmnStats.tasks.length).toEqual(Object.keys(rasciMatrix).length);
    });

    test('Manejo de errores en cascada multinotación', () => {
      // XML BPMN inválido
      const invalidBpmn = '<invalid>xml</invalid>';
      
      expect(() => {
        getBpmnStatsFromXml(invalidBpmn);
      }).not.toThrow(); // Debe manejar graciosamente errores
      
      // Matriz RASCI inconsistente
      const rasciValidator = new RasciMatrixValidator();
      const roles = ['role1'];
      const invalidMatrix = {
        'Task_1': { 'role1': 'X' } // Rol inválido (X no es RASCI válido)
      };
      
      // Opciones para test de integración
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: ['Task_1']
      };
      
      const validation = rasciValidator.validateMatrix(roles, invalidMatrix, testOptions);
      expect(validation.isValid).toBe(false);
      expect(validation.criticalErrors.length).toBeGreaterThan(0);
      
      // Tipo PPINOT no soportado
      expect(isSupportedType('invalid:Element')).toBe(false);
    });

    test('Sincronización de cambios entre notaciones', () => {
      // Simular cambio en BPMN
      const originalBpmn = createValidBpmnXml();
      const originalStats = getBpmnStatsFromXml(originalBpmn);
      
      // Simular adición de nueva tarea
      const modifiedBpmn = originalBpmn.replace(
        '</bpmn:process>',
        '<bpmn:task id="NewTask_1" name="Nueva Tarea"/></bpmn:process>'
      );
      
      const newStats = getBpmnStatsFromXml(modifiedBpmn);
      expect(newStats.tasks.length).toBe(originalStats.tasks.length + 1);
      
      // RASCI debe actualizarse para incluir nueva tarea
      const rasciValidator = new RasciMatrixValidator();
      const roles = ['manager', 'developer', 'tester'];
      const updatedMatrix = {};
      newStats.tasks.forEach(task => {
        updatedMatrix[task] = {
          'manager': 'A',
          'developer': 'R',  // Todas las tareas necesitan responsable
          'tester': 'C'
        };
      });
      
      // Opciones para test de integración
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: newStats.tasks
      };
      
      const validation = rasciValidator.validateMatrix(roles, updatedMatrix, testOptions);
      expect(validation.isValid).toBe(true);
      
      // PPINOT no soporta tipos BPMN básicos (comportamiento real)
      expect(isSupportedType('bpmn:Task')).toBe(false);
    });
  });

  describe('Tests de regresión con componentes reales', () => {
    
    test('Regresión: Validación de secuencias BPMN', () => {
      const bpmnWithFlows = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process id="Process_1">
            <bpmn:startEvent id="StartEvent_1"/>
            <bpmn:task id="Task_1"/>
            <bpmn:endEvent id="EndEvent_1"/>
            <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
            <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/>
          </bpmn:process>
        </bpmn:definitions>`;
      
      // Esta función debe extraer correctamente los flujos
      const flows = extractSequenceFlowsFromXml(bpmnWithFlows);
      expect(flows).toBeDefined();
      expect(Array.isArray(flows)).toBe(true);
      expect(flows.length).toBe(2);
    });

    test('Regresión: RASCI matrix con roles edge case', () => {
      const rasciValidator = new RasciMatrixValidator();
      
      // Edge case: múltiples accountables (debería ser error)
      const roles = ['role1', 'role2', 'role3'];
      const multipleAccountables = {
        'Task_1': { 'role1': 'A', 'role2': 'A', 'role3': 'R' } // Múltiples A no permitido
      };
      
      // Opciones para test de integración
      const testOptions = {
        skipOrphanedTaskCleanup: true,
        customBpmnTasks: ['Task_1']
      };
      
      const validation = rasciValidator.validateMatrix(roles, multipleAccountables, testOptions);
      // Debería validar según reglas RASCI (solo un A por tarea)
      expect(validation.isValid).toBe(false);
    });

    test('Regresión: PPINOT types con elementos complejos', () => {
      // Test con tipos BPMN complejos
      const complexTypes = [
        'bpmn:ExclusiveGateway',
        'bpmn:ParallelGateway',
        'bpmn:IntermediateCatchEvent',
        'bpmn:SubProcess'
      ];
      
      complexTypes.forEach(type => {
        const isSupported = isSupportedType(type);
        // Verificar que el comportamiento es consistente
        expect(typeof isSupported).toBe('boolean');
      });
    });
  });
});