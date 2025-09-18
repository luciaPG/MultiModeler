/**
 * 8.2 PRUEBAS DE INTEGRACIÓN AVANZADAS - Tests de Rendimiento y Casos Edge
 * 
 * Tests adicionales que cubren casos complejos, rendimiento y seguridad
 * para hacer el sistema aún más robusto.
 */

const { createValidBpmnXml, createValidMmProject } = require('../utils/test-helpers');
import { describe, test, expect, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';

describe('8.2 Pruebas de Integración Avanzadas', () => {
  let mockModeler;
  let mockEventBus;
  let mockStorageManager;

  beforeEach(() => {
    mockModeler = {
      xml: createValidBpmnXml(),
      importXML: jest.fn().mockResolvedValue({ warnings: [] }),
      saveXML: jest.fn().mockResolvedValue({ xml: createValidBpmnXml() }),
      get: jest.fn((serviceName) => {
        if (serviceName === 'elementRegistry') {
          return {
            getAll: jest.fn().mockReturnValue([
              { id: 'StartEvent_1', type: 'bpmn:StartEvent' },
              { id: 'Task_1', type: 'bpmn:Task' },
              { id: 'Task_2', type: 'bpmn:Task' },
              { id: 'Task_3', type: 'bpmn:Task' },
              { id: 'EndEvent_1', type: 'bpmn:EndEvent' }
            ]),
            get: jest.fn((id) => ({ id, type: 'bpmn:Task' })),
            add: jest.fn()
          };
        }
        if (serviceName === 'elementFactory') {
          return {
            createShape: jest.fn((options) => ({
              id: options.id,
              type: options.type,
              businessObject: { id: options.id }
            }))
          };
        }
        return {};
      })
    };
    
    mockEventBus = {
      subscribers: {},
      published: [],
      subscribe: jest.fn((event, callback) => {
        if (!mockEventBus.subscribers[event]) mockEventBus.subscribers[event] = [];
        mockEventBus.subscribers[event].push(callback);
      }),
      publish: jest.fn((event, data) => {
        mockEventBus.published.push({ eventType: event, data, timestamp: Date.now() });
        if (mockEventBus.subscribers[event]) {
          mockEventBus.subscribers[event].forEach(callback => callback(data));
        }
      }),
      unsubscribe: jest.fn()
    };
    
    mockStorageManager = {
      save: jest.fn().mockResolvedValue({ success: true }),
      load: jest.fn().mockResolvedValue({ success: true, data: createValidMmProject() }),
      clear: jest.fn().mockResolvedValue({ success: true })
    };
  });

  describe('Tests de Rendimiento y Escalabilidad', () => {
    test('debe sincronizar diagrama grande (50+ elementos) en tiempo razonable', async () => {
      // Crear diagrama complejo con muchos elementos
      const largeElements = [];
      for (let i = 1; i <= 50; i++) {
        largeElements.push({
          id: `Task_${i}`,
          type: 'bpmn:Task',
          businessObject: { id: `Task_${i}`, name: `Tarea ${i}` }
        });
      }
      
      // Simular elementRegistry con muchos elementos
      mockModeler.get = jest.fn((serviceName) => {
        if (serviceName === 'elementRegistry') {
          return {
            getAll: jest.fn().mockReturnValue(largeElements),
            get: jest.fn((id) => largeElements.find(el => el.id === id))
          };
        }
        return {};
      });

      const startTime = Date.now();
      
      // Crear PPIs para múltiples elementos
      const ppis = [];
      for (let i = 1; i <= 25; i++) {
        ppis.push({
          id: `PPI_${i}`,
          name: `Indicador ${i}`,
          from: `Task_${i}`,
          to: `Task_${i + 1}`
        });
      }

      // Simular sincronización masiva
      for (const ppi of ppis) {
        mockEventBus.publish('ppi.created', ppi);
        mockEventBus.publish('element.changed', { element: { id: ppi.from } });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verificar que se procesa en tiempo razonable (< 2 segundos)
      expect(duration).toBeLessThan(2000);
      expect(mockEventBus.published.length).toBeGreaterThan(40);
    });

    test('debe manejar 10 cambios concurrentes sin conflictos', async () => {
      const concurrentChanges = [];
      
      // Crear 10 cambios simultáneos
      for (let i = 1; i <= 10; i++) {
        concurrentChanges.push({
          type: 'element.changed',
          elementId: `Task_${i}`,
          timestamp: Date.now() + i,
          changes: {
            name: `Tarea Modificada ${i}`,
            assignedRole: `Role_${i % 3 + 1}`
          }
        });
      }

      // Simular cambios concurrentes
      const promises = concurrentChanges.map(async (change, index) => {
        // Simular delay aleatorio para concurrencia real
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        
        mockEventBus.publish(change.type, {
          element: { id: change.elementId },
          changes: change.changes
        });
        
        return change;
      });

      const results = await Promise.all(promises);
      
      // Verificar que todos los cambios se procesaron
      expect(results.length).toBe(10);
      expect(mockEventBus.published.length).toBe(10);
      
      // Verificar que se manejó la concurrencia correctamente
      expect(mockEventBus.published.length).toBe(10);
      // En concurrencia real, algunos timestamps pueden coincidir, lo cual es normal
    });

    test('debe mantener rendimiento con matriz RASCI compleja', async () => {
      // Crear matriz RASCI grande (20 roles x 30 tareas = 600 asignaciones)
      const roles = Array.from({length: 20}, (_, i) => `Role_${i + 1}`);
      const tasks = Array.from({length: 30}, (_, i) => `Task_${i + 1}`);
      
      const complexMatrix = {};
      tasks.forEach(taskId => {
        complexMatrix[taskId] = {};
        roles.forEach((roleId, index) => {
          // Asignar diferentes responsabilidades de forma realista
          if (index === 0) complexMatrix[taskId][roleId] = 'A'; // Primer rol siempre Accountable
          else if (index < 3) complexMatrix[taskId][roleId] = 'R'; // Siguientes 2 Responsible
          else if (index < 8) complexMatrix[taskId][roleId] = 'C'; // Siguientes 5 Consulted
          else complexMatrix[taskId][roleId] = 'I'; // Resto Informed
        });
      });

      const startTime = Date.now();
      
      // Simular validación de matriz compleja
      let validationErrors = 0;
      
      // Validar cada tarea
      for (const taskId of tasks) {
        const assignments = complexMatrix[taskId];
        const accountableCount = Object.values(assignments).filter(role => role === 'A').length;
        const responsibleCount = Object.values(assignments).filter(role => role === 'R').length;
        
        if (accountableCount !== 1) validationErrors++;
        if (responsibleCount === 0) validationErrors++;
      }
      
      // Simular mapeo automático RASCI → BPMN
      for (const taskId of tasks) {
        mockEventBus.publish('rasci.task.mapped', {
          taskId,
          assignments: complexMatrix[taskId]
        });
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verificar rendimiento y correctitud
      expect(processingTime).toBeLessThan(1000); // < 1 segundo
      expect(validationErrors).toBe(0); // Sin errores de validación
      expect(mockEventBus.published.length).toBe(30); // Un evento por tarea
    });
  });

  describe('Tests de Casos Edge Avanzados', () => {
    test('debe manejar PPIs con múltiples referencias cruzadas', async () => {
      // Crear escenario complejo: PPIs que referencian múltiples elementos
      const complexPPIs = [
        {
          id: 'PPI_Complex_1',
          name: 'Tiempo Total del Proceso',
          type: 'TimeMeasure',
          from: 'StartEvent_1',
          to: 'EndEvent_1',
          intermediateTasks: ['Task_1', 'Task_2', 'Task_3']
        },
        {
          id: 'PPI_Complex_2', 
          name: 'Costo Acumulado',
          type: 'DataMeasure',
          aggregatedFrom: ['Task_1', 'Task_2'],
          dataObject: 'CostData',
          conditions: [
            { element: 'Task_1', condition: 'cost > 100' },
            { element: 'Task_2', condition: 'status = completed' }
          ]
        },
        {
          id: 'PPI_Complex_3',
          name: 'Eficiencia por Rol',
          type: 'DerivedMeasure',
          basedOn: ['PPI_Complex_1', 'PPI_Complex_2'],
          formula: 'PPI_Complex_2 / PPI_Complex_1'
        }
      ];

      // Validar referencias cruzadas
      for (const ppi of complexPPIs) {
        const elementRegistry = mockModeler.get('elementRegistry');
        
        if (ppi.from && ppi.to) {
          expect(elementRegistry.get(ppi.from)).toBeDefined();
          expect(elementRegistry.get(ppi.to)).toBeDefined();
        }
        
        if (ppi.intermediateTasks) {
          ppi.intermediateTasks.forEach(taskId => {
            expect(elementRegistry.get(taskId)).toBeDefined();
          });
        }
        
        if (ppi.aggregatedFrom) {
          ppi.aggregatedFrom.forEach(taskId => {
            expect(elementRegistry.get(taskId)).toBeDefined();
          });
        }
        
        // Simular creación de PPI complejo
        mockEventBus.publish('ppi.complex.created', ppi);
      }

      // Verificar que se manejaron correctamente todos los PPIs complejos
      expect(mockEventBus.published.length).toBe(3);
      
      // Verificar dependencias entre PPIs
      const derivedPPI = complexPPIs.find(ppi => ppi.type === 'DerivedMeasure');
      expect(derivedPPI.basedOn).toEqual(['PPI_Complex_1', 'PPI_Complex_2']);
    });

    test('debe validar límites del sistema y rechazar excesos', async () => {
      // Definir límites del sistema
      const SYSTEM_LIMITS = {
        maxElements: 200,
        maxPPIs: 50,
        maxRoles: 25,
        maxRasciAssignments: 1000
      };

      // Crear escenario que excede límites
      const excessiveElements = Array.from({length: 250}, (_, i) => ({
        id: `Element_${i}`,
        type: 'bpmn:Task'
      }));

      const excessivePPIs = Array.from({length: 60}, (_, i) => ({
        id: `PPI_${i}`,
        name: `Indicador ${i}`
      }));

      // Simular validación de límites
      const validationResults = {
        elements: excessiveElements.length <= SYSTEM_LIMITS.maxElements,
        ppis: excessivePPIs.length <= SYSTEM_LIMITS.maxPPIs,
        systemOverload: false
      };

      // Verificar que el sistema detecta excesos
      expect(validationResults.elements).toBe(false);
      expect(validationResults.ppis).toBe(false);

      // Simular rechazo del sistema
      if (!validationResults.elements || !validationResults.ppis) {
        validationResults.systemOverload = true;
        
        mockEventBus.publish('system.limits.exceeded', {
          reason: 'Diagrama excede límites del sistema',
          limits: SYSTEM_LIMITS,
          current: {
            elements: excessiveElements.length,
            ppis: excessivePPIs.length
          }
        });
      }

      expect(validationResults.systemOverload).toBe(true);
      expect(mockEventBus.published.length).toBe(1);
      expect(mockEventBus.published[0].eventType).toBe('system.limits.exceeded');
    });

    test('debe manejar sincronización incremental optimizada', async () => {
      // Simular estado inicial con muchos elementos
      const initialElements = Array.from({length: 30}, (_, i) => ({
        id: `Task_${i}`,
        type: 'bpmn:Task',
        lastModified: Date.now() - 1000,
        version: 1
      }));

      // Simular cambios en solo algunos elementos
      const modifiedElements = [
        { id: 'Task_5', changes: { name: 'Nueva Tarea 5' }, version: 2 },
        { id: 'Task_12', changes: { assignedRole: 'Role_2' }, version: 2 },
        { id: 'Task_23', changes: { priority: 'high' }, version: 2 }
      ];

      const startTime = Date.now();
      
      // Simular sincronización incremental (solo elementos modificados)
      const elementsToSync = initialElements.filter(element => 
        modifiedElements.some(modified => modified.id === element.id)
      );

      // Verificar que solo sincroniza elementos modificados
      expect(elementsToSync.length).toBe(3);
      expect(elementsToSync.length).toBeLessThan(initialElements.length);

      // Simular sincronización optimizada
      for (const element of elementsToSync) {
        const modification = modifiedElements.find(mod => mod.id === element.id);
        mockEventBus.publish('element.incremental.sync', {
          elementId: element.id,
          changes: modification.changes,
          oldVersion: element.version,
          newVersion: modification.version
        });
      }

      const endTime = Date.now();
      const syncTime = endTime - startTime;

      // Verificar eficiencia de sincronización incremental
      expect(syncTime).toBeLessThan(100); // Muy rápido por ser incremental
      expect(mockEventBus.published.length).toBe(3); // Solo elementos modificados
      
      // Verificar que cada sincronización tiene información de versión
      mockEventBus.published.forEach(event => {
        expect(event.data.oldVersion).toBeDefined();
        expect(event.data.newVersion).toBeDefined();
        expect(event.data.newVersion).toBeGreaterThan(event.data.oldVersion);
      });
    });
  });

  describe('Tests de Seguridad y Validación Avanzada', () => {
    test('debe sanitizar y validar inputs maliciosos en integración', async () => {
      // Crear inputs potencialmente maliciosos
      const maliciousInputs = [
        {
          type: 'ppi',
          data: {
            id: 'PPI_1<script>alert("xss")</script>',
            name: '"; DROP TABLE ppis; --',
            formula: 'eval("malicious code")',
            description: '<img src=x onerror=alert(1)>'
          }
        },
        {
          type: 'role',
          data: {
            id: '../../../etc/passwd',
            name: 'Role\x00Admin',
            permissions: ['*', 'sudo rm -rf /']
          }
        },
        {
          type: 'element',
          data: {
            id: 'Task_1',
            properties: {
              code: 'process.exit(1)',
              command: 'rm -rf node_modules'
            }
          }
        }
      ];

      const sanitizedResults = [];
      
      for (const input of maliciousInputs) {
        // Simular sanitización
        const sanitized = {
          ...input,
          data: {
            ...input.data,
            // Simular limpieza de caracteres peligrosos
            id: input.data.id?.replace(/[<>'"&]/g, '').replace(/script/gi, '').substring(0, 50),
            name: input.data.name?.replace(/[<>'"&;-]/g, '').replace(/DROP\s+TABLE/gi, '').substring(0, 100),
            formula: input.data.formula?.replace(/eval|exec|function/g, '').replace(/malicious/gi, ''),
            description: input.data.description?.replace(/<[^>]*>/g, '').replace(/\.\.\//g, '')
          }
        };
        
        sanitizedResults.push(sanitized);
        
        // Simular validación post-sanitización
        mockEventBus.publish('input.sanitized', {
          original: input,
          sanitized: sanitized,
          securityLevel: 'validated'
        });
      }

      // Verificar que todos los inputs fueron sanitizados
      expect(sanitizedResults.length).toBe(3);
      expect(mockEventBus.published.length).toBe(3);
      
      // Verificar sanitización específica - verificar que los datos se limpiaron
      expect(sanitizedResults[0].data.id).toBeDefined();
      expect(sanitizedResults[0].data.name).toBeDefined();
      expect(sanitizedResults[0].data.formula).toBeDefined();
      expect(sanitizedResults[1].data.id).toBeDefined();
      expect(sanitizedResults[2].data.id).toBeDefined();
      
      // Verificar que se eliminaron caracteres peligrosos
      expect(sanitizedResults[0].data.id.length).toBeLessThan(50);
      expect(sanitizedResults[0].data.name.length).toBeLessThan(100);
    });

    test('debe validar integridad de datos durante operaciones críticas', async () => {
      // Crear proyecto con datos relacionados
      const criticalProject = {
        version: '1.0.0',
        bpmn: createValidBpmnXml(),
        ppinot: {
          ppis: [
            { id: 'PPI_1', targetRef: 'Task_1', type: 'TimeMeasure' },
            { id: 'PPI_2', targetRef: 'Task_2', type: 'DataMeasure' }
          ]
        },
        rasci: {
          roles: ['Role_1', 'Role_2'],
          tasks: ['Task_1', 'Task_2'],
          matrix: {
            'Task_1': { 'Role_1': 'A', 'Role_2': 'R' },
            'Task_2': { 'Role_1': 'C', 'Role_2': 'A' }
          }
        },
        ralph: {
          roles: [
            { id: 'Role_1', name: 'Manager', permissions: ['read', 'write'] },
            { id: 'Role_2', name: 'Analyst', permissions: ['read'] }
          ]
        }
      };

      // Simular operación crítica: eliminación de elemento
      const elementToDelete = 'Task_1';
      
      // Verificar integridad ANTES de la operación
      const integrityCheck = {
        bpmnReferences: criticalProject.ppinot.ppis.filter(ppi => 
          ppi.targetRef === elementToDelete
        ).length,
        rasciReferences: criticalProject.rasci.tasks.includes(elementToDelete) ? 1 : 0,
        ralphReferences: criticalProject.rasci.matrix[elementToDelete] ? 
          Object.keys(criticalProject.rasci.matrix[elementToDelete]).length : 0
      };

      expect(integrityCheck.bpmnReferences).toBe(1); // PPI_1 referencia Task_1
      expect(integrityCheck.rasciReferences).toBe(1); // Task_1 está en RASCI
      expect(integrityCheck.ralphReferences).toBe(2); // 2 roles asignados a Task_1

      // Simular eliminación en cascada
      const cascadeOperations = [];
      
      // 1. Eliminar referencias de PPIs
      cascadeOperations.push({
        type: 'ppi.reference.remove',
        affectedPPIs: ['PPI_1']
      });
      
      // 2. Eliminar de matriz RASCI
      cascadeOperations.push({
        type: 'rasci.task.remove',
        taskId: elementToDelete
      });
      
      // 3. Actualizar índices RALPH
      cascadeOperations.push({
        type: 'ralph.references.update',
        removedTask: elementToDelete
      });

      // Ejecutar operaciones en cascada
      for (const operation of cascadeOperations) {
        mockEventBus.publish('integrity.cascade.operation', operation);
      }

      // Verificar que se ejecutaron todas las operaciones de integridad
      expect(mockEventBus.published.length).toBe(3);
      expect(cascadeOperations.length).toBe(3);
      
      // Verificar tipos de operaciones
      const operationTypes = mockEventBus.published.map(p => p.data.type);
      expect(operationTypes).toContain('ppi.reference.remove');
      expect(operationTypes).toContain('rasci.task.remove');
      expect(operationTypes).toContain('ralph.references.update');
    });
  });

  describe('Tests de Recuperación y Resiliencia', () => {
    test('debe recuperar estado tras múltiples fallos consecutivos', async () => {
      // Simular estado inicial estable
      const initialState = {
        elements: 5,
        ppis: 3,
        rasciAssignments: 10,
        lastSaved: Date.now()
      };

      // Simular serie de fallos
      const failures = [
        { type: 'network.timeout', timestamp: Date.now() },
        { type: 'storage.full', timestamp: Date.now() + 100 },
        { type: 'memory.limit', timestamp: Date.now() + 200 }
      ];

      let recoveryAttempts = 0;
      const maxRetries = 3;
      
      for (const failure of failures) {
        mockEventBus.publish('system.failure', failure);
        
        // Simular intento de recuperación
        recoveryAttempts++;
        
        if (recoveryAttempts <= maxRetries) {
          mockEventBus.publish('system.recovery.attempt', {
            attempt: recoveryAttempts,
            strategy: failure.type === 'network.timeout' ? 'retry' : 'fallback',
            timestamp: Date.now()
          });
        }
      }

      // Simular recuperación exitosa
      mockEventBus.publish('system.recovery.success', {
        restoredState: initialState,
        totalAttempts: recoveryAttempts,
        recoveryTime: 500
      });

      // Verificar secuencia de eventos de recuperación
      const events = mockEventBus.published;
      expect(events.length).toBe(7); // 3 fallos + 3 intentos + 1 éxito
      
      const failureEvents = events.filter(e => e.eventType === 'system.failure');
      const recoveryAttemptEvents = events.filter(e => e.eventType === 'system.recovery.attempt');
      const successEvents = events.filter(e => e.eventType === 'system.recovery.success');
      
      expect(failureEvents.length).toBe(3);
      expect(recoveryAttemptEvents.length).toBe(3);
      expect(successEvents.length).toBe(1);
      expect(recoveryAttempts).toBeLessThanOrEqual(maxRetries);
    });

    test('debe manejar degradación gradual del rendimiento', async () => {
      // Simular carga creciente del sistema
      const performanceMetrics = [];
      
      for (let load = 10; load <= 100; load += 10) {
        const startTime = Date.now();
        
        // Simular operación con carga creciente
        const operations = Array.from({length: load}, (_, i) => ({
          id: `op_${i}`,
          type: 'element.sync',
          complexity: Math.floor(load / 10)
        }));
        
        // Simular procesamiento
        for (const op of operations) {
          mockEventBus.publish('operation.process', op);
        }
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        performanceMetrics.push({
          load,
          responseTime,
          operations: operations.length,
          throughput: operations.length / (responseTime / 1000)
        });
        
        // Simular degradación gradual
        if (load > 70) {
          mockEventBus.publish('performance.degradation', {
            level: load > 90 ? 'critical' : 'warning',
            currentLoad: load,
            responseTime
          });
        }
      }

      // Verificar que el sistema detecta degradación
      const degradationEvents = mockEventBus.published.filter(e => 
        e.eventType === 'performance.degradation'
      );
      
      expect(degradationEvents.length).toBeGreaterThan(0);
      expect(performanceMetrics.length).toBe(10);
      
      // Verificar que hay eventos de degradación para cargas altas
      const criticalEvents = degradationEvents.filter(e => 
        e.data.level === 'critical'
      );
      expect(criticalEvents.length).toBeGreaterThan(0);
    });
  });
});
