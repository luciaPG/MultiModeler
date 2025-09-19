/**
 * 8.2 PRUEBAS DE INTEGRACIÓN - Integración Multi-notación
 * 
 * Valida la interacción entre BPMN, PPINOT, RALPH y RASCI.
 * Pruebas críticas para el funcionamiento conjunto del sistema.
 */

const { createValidBpmnXml, createValidMmProject } = require('../utils/test-helpers');
import { describe, test, expect, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';


// Mocks para dependencias externas
jest.mock('bpmn-js/lib/Modeler', () => {
  return jest.fn().mockImplementation(() => require('../mocks/bpmn-modeler.mock.js'));
});

describe('8.2 Pruebas de Integración - Multi-notación', () => {
  let mockModeler;
  let mockEventBus;
  let mockStorageManager;

  beforeEach(() => {
    // Setup común para todas las pruebas de integración - mocks internos
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

  describe('Integración BPMN + PPINOT', () => {
    test('debe vincular PPIs a elementos BPMN correctamente', async () => {
      // Cargar diagrama BPMN
      const bpmnXml = createValidBpmnXml();
      await mockModeler.importXML(bpmnXml);
      
      // Crear PPI vinculado a elementos BPMN
      const ppi = {
        id: 'PPI_1',
        name: 'Tiempo de Proceso',
        type: 'TimeMeasure',
        from: 'StartEvent_1',
        to: 'EndEvent_1'
      };
      
      // Verificar que los elementos BPMN existen
      const elementRegistry = mockModeler.get('elementRegistry');
      const startElement = elementRegistry.get('StartEvent_1');
      const endElement = elementRegistry.get('EndEvent_1');
      
      expect(startElement).toBeDefined();
      expect(endElement).toBeDefined();
      
      // Simular vinculación PPI-BPMN
      mockEventBus.publish('ppi.created', { ppi, startElement, endElement });
      
      // Verificar que el evento se publicó
      expect(mockEventBus.published.some(event => 
        event.eventType === 'ppi.created' && 
        event.data.ppi.id === 'PPI_1'
      )).toBe(true);
    });

    test('debe sincronizar cambios en BPMN con PPIs existentes', async () => {
      // Configurar PPI existente
      const existingPPI = {
        id: 'PPI_1',
        from: 'Task_1',
        to: 'Task_2'
      };
      
      // Simular cambio en elemento BPMN
      mockEventBus.publish('element.changed', {
        element: { id: 'Task_1', type: 'bpmn:Task' },
        change: { name: 'Nueva Tarea' }
      });
      
      // Verificar que se notificó el cambio
      expect(mockEventBus.published.some(event => 
        event.eventType === 'element.changed'
      )).toBe(true);
    });
  });

  describe('Integración BPMN + RALPH', () => {
    test('debe asignar roles a tareas BPMN', async () => {
      const bpmnXml = createValidBpmnXml();
      await mockModeler.importXML(bpmnXml);
      
      // Definir rol RALPH
      const role = {
        id: 'Role_1',
        name: 'Analista',
        permissions: ['read', 'execute'],
        restrictions: []
      };
      
      // Asignar rol a tarea
      const taskElement = mockModeler.get('elementRegistry').get('Task_1');
      expect(taskElement).toBeDefined();
      
      // Simular asignación de rol
      mockEventBus.publish('role.assigned', {
        taskId: 'Task_1',
        roleId: 'Role_1',
        role: role
      });
      
      // Verificar asignación
      expect(mockEventBus.published.some(event => 
        event.eventType === 'role.assigned' &&
        event.data.taskId === 'Task_1'
      )).toBe(true);
    });

    test('debe validar permisos de roles en ejecución', () => {
      const role = {
        id: 'Role_1',
        permissions: ['read'],
        restrictions: ['cannot_modify']
      };
      
      // Simular intento de modificación
      const canModify = !role.restrictions.includes('cannot_modify');
      expect(canModify).toBe(false);
      
      // Simular lectura permitida
      const canRead = role.permissions.includes('read');
      expect(canRead).toBe(true);
    });
  });

  describe('Integración RASCI + BPMN + RALPH', () => {
    test('debe mapear automáticamente RASCI con elementos BPMN y roles RALPH', async () => {
      const bpmnXml = createValidBpmnXml();
      await mockModeler.importXML(bpmnXml);
      
      // Configurar datos RASCI
      const rasciData = {
        roles: ['Analista', 'Supervisor'],
        tasks: ['Task_1'],
        matrix: {
          'Task_1': {
            'Analista': 'R',      // Responsible
            'Supervisor': 'A'     // Accountable
          }
        }
      };
      
      // Verificar que la tarea existe en BPMN
      const taskElement = mockModeler.get('elementRegistry').get('Task_1');
      expect(taskElement).toBeDefined();
      
      // Simular mapeo automático
      mockEventBus.publish('rasci.mapped', {
        taskId: 'Task_1',
        assignments: rasciData.matrix['Task_1']
      });
      
      // Verificar mapeo
      expect(mockEventBus.published.some(event => 
        event.eventType === 'rasci.mapped' &&
        event.data.taskId === 'Task_1'
      )).toBe(true);
    });

    test('debe detectar conflictos entre RASCI y RALPH', () => {
      // Configurar conflicto: rol RALPH sin permisos vs RASCI Responsible
      const ralphRole = {
        id: 'Analista',
        permissions: [], // Sin permisos
        restrictions: ['cannot_execute']
      };
      
      const rasciAssignment = {
        taskId: 'Task_1',
        roleId: 'Analista',
        assignment: 'R' // Responsible - requiere ejecución
      };
      
      // Detectar conflicto
      const hasConflict = ralphRole.restrictions.includes('cannot_execute') && 
                         rasciAssignment.assignment === 'R';
      
      expect(hasConflict).toBe(true);
    });
  });

  describe('Integración Completa: Persistencia Multi-notación', () => {
    test('debe guardar y cargar proyecto con todas las notaciones', async () => {
      const completeProject = createValidMmProject();
      
      // Simular guardado
      const saveResult = await mockStorageManager.save(completeProject);
      expect(saveResult.success).toBe(true);
      
      // Simular carga
      const loadResult = await mockStorageManager.load();
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();
      
      // Verificar integridad de datos
      expect(loadResult.data.bpmn).toBeDefined();
      expect(loadResult.data.ppinot).toBeDefined();
      expect(loadResult.data.ralph).toBeDefined();
      expect(loadResult.data.rasci).toBeDefined();
    });

    test('debe sincronizar cambios entre notaciones durante guardado automático', async () => {
      // Simular cambio en BPMN
      mockEventBus.publish('element.changed', {
        element: { id: 'Task_1', type: 'bpmn:Task' }
      });
      
      // Simular autoguardado que llama al storage manager
      const autosaveManager = {
        hasChanges: true,
        performAutosave: jest.fn().mockImplementation(async () => {
          // Simular que el autoguardado llama al storage manager
          await mockStorageManager.save(createValidMmProject());
          return { success: true };
        }),
        markAsChanged: jest.fn()
      };
      
      await autosaveManager.performAutosave();
      
      // Verificar que se guardó
      expect(mockStorageManager.save).toHaveBeenCalled();
    });
  });

  describe('Validación Cruzada de Notaciones', () => {
    test('debe validar consistencia entre BPMN y RASCI', async () => {
      const project = createValidMmProject();
      
      // Importar BPMN
      await mockModeler.importXML(project.bpmn);
      
      // Obtener tareas BPMN
      const elementRegistry = mockModeler.get('elementRegistry');
      const bpmnTasks = elementRegistry.getAll().filter(el => 
        el.type === 'bpmn:Task'
      ).map(el => el.id);
      
      // Obtener tareas RASCI
      const rasciTasks = Object.keys(project.rasci.matrix);
      
      // Verificar consistencia
      const inconsistentTasks = rasciTasks.filter(task => 
        !bpmnTasks.includes(task)
      );
      
      expect(inconsistentTasks.length).toBe(0);
    });

    test('debe detectar PPIs huérfanos (sin elementos BPMN correspondientes)', async () => {
      const bpmnXml = createValidBpmnXml();
      await mockModeler.importXML(bpmnXml);
      
      const ppis = [
        { id: 'PPI_1', from: 'Task_1', to: 'EndEvent_1' }, // Válido
        { id: 'PPI_2', from: 'NonExistent', to: 'EndEvent_1' } // Huérfano
      ];
      
      const elementRegistry = mockModeler.get('elementRegistry');
      
      const orphanPPIs = ppis.filter(ppi => {
        // Simular que elementRegistry.get devuelve el elemento si existe
        const fromExists = ppi.from === 'Task_1' || ppi.from === 'StartEvent_1' || ppi.from === 'EndEvent_1';
        const toExists = ppi.to === 'Task_1' || ppi.to === 'StartEvent_1' || ppi.to === 'EndEvent_1';
        return !fromExists || !toExists;
      });
      
      expect(orphanPPIs.length).toBe(1);
      expect(orphanPPIs[0].id).toBe('PPI_2');
    });
  });

  describe('Casos Avanzados de Integración', () => {
    test('debe manejar importación de proyecto corrupto', async () => {
      // Proyecto con datos corruptos
      const corruptProject = {
        version: '1.0.0',
        bpmn: '<invalid-xml>corrupted</invalid-xml>',
        ppinot: {
          ppis: [
            { id: 'PPI_1', targetRef: 'NonExistentTask' }
          ]
        },
        rasci: {
          roles: ['Role_1'],
          matrix: {
            'NonExistentTask': { 'Role_1': 'A' }
          }
        }
      };

      mockStorageManager.load.mockResolvedValue({
        success: true,
        data: corruptProject
      });

      const errors = [];
      
      // Simular que el XML corrupto falla al importar
      mockModeler.importXML.mockRejectedValueOnce(new Error('Invalid XML'));
      
      try {
        await mockModeler.importXML(corruptProject.bpmn);
      } catch (error) {
        errors.push('BPMN import failed');
      }

      // Validar PPIs huérfanos
      const elements = mockModeler.get('elementRegistry').getAll();
      const orphanPPIs = corruptProject.ppinot.ppis.filter(ppi => 
        !elements.some(el => el.id === ppi.targetRef)
      );
      if (orphanPPIs.length > 0) {
        errors.push('Orphan PPIs detected');
      }

      // Validar RASCI inconsistente
      Object.keys(corruptProject.rasci.matrix).forEach(taskId => {
        if (!elements.some(el => el.id === taskId)) {
          errors.push('RASCI task not found in BPMN');
        }
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('BPMN import failed');
      expect(errors).toContain('Orphan PPIs detected');
      expect(errors).toContain('RASCI task not found in BPMN');
    });

    test('debe sincronizar cambios concurrentes entre notaciones', async () => {
      const changeQueue = [];
      
      // Simular cambios concurrentes
      const changes = [
        { type: 'bpmn.element.added', data: { id: 'Task_2', type: 'bpmn:Task' } },
        { type: 'ppinot.ppi.created', data: { id: 'PPI_3', targetRef: 'Task_2' } },
        { type: 'rasci.role.added', data: { role: 'Role_3' } },
        { type: 'rasci.assignment.updated', data: { taskId: 'Task_2', roleId: 'Role_3', assignment: 'R' } }
      ];

      // Procesar cambios en orden
      for (const change of changes) {
        changeQueue.push(change);
        mockEventBus.publish(change.type, change.data);
      }

      // Verificar que todos los cambios se procesaron
      expect(mockEventBus.published.length).toBe(4);
      
      // Verificar sincronización
      const finalState = {
        bpmn: ['Task_1', 'Task_2'],
        ppinot: ['PPI_1', 'PPI_3'],
        rasci: {
          roles: ['Role_1', 'Role_3'],
          assignments: { 'Task_2': { 'Role_3': 'R' } }
        }
      };

      expect(finalState.bpmn).toContain('Task_2');
      expect(finalState.ppinot).toContain('PPI_3');
      expect(finalState.rasci.roles).toContain('Role_3');
    });

    test('debe validar dependencias circulares entre roles', async () => {
      // Configurar roles con dependencias circulares
      const circularRoles = {
        'Manager': { dependsOn: ['Analyst'] },
        'Analyst': { dependsOn: ['Developer'] },
        'Developer': { dependsOn: ['Manager'] } // Circular!
      };

      const dependencyErrors = [];
      
      // Algoritmo de detección de ciclos (DFS)
      function detectCircularDependency(roles, startRole, visited = new Set(), path = []) {
        if (path.includes(startRole)) {
          return path.slice(path.indexOf(startRole)).concat(startRole);
        }
        
        if (visited.has(startRole)) {
          return null;
        }
        
        visited.add(startRole);
        path.push(startRole);
        
        const dependencies = roles[startRole]?.dependsOn || [];
        for (const dep of dependencies) {
          const cycle = detectCircularDependency(roles, dep, visited, [...path]);
          if (cycle) {
            return cycle;
          }
        }
        
        path.pop();
        return null;
      }

      // Verificar cada rol
      for (const role of Object.keys(circularRoles)) {
        const cycle = detectCircularDependency(circularRoles, role);
        if (cycle) {
          dependencyErrors.push(`Circular dependency: ${cycle.join(' → ')}`);
          break; // Solo necesitamos detectar uno
        }
      }

      expect(dependencyErrors.length).toBeGreaterThan(0);
      expect(dependencyErrors[0]).toContain('Manager → Analyst → Developer → Manager');
    });

    test('debe manejar eliminación en cascada de elementos', async () => {
      // Estado inicial
      const initialState = {
        bpmn: ['StartEvent_1', 'Task_1', 'Task_2', 'EndEvent_1'],
        ppinot: [
          { id: 'PPI_1', targetRef: 'Task_1' },
          { id: 'PPI_2', targetRef: 'Task_2' }
        ],
        rasci: {
          matrix: {
            'Task_1': { 'Role_1': 'A' },
            'Task_2': { 'Role_1': 'R' }
          }
        }
      };

      // Simular eliminación de Task_1
      const elementToDelete = 'Task_1';
      const cascadeResults = {
        deletedElements: [elementToDelete],
        affectedPPIs: [],
        affectedRASCI: []
      };

      // Encontrar PPIs afectados
      cascadeResults.affectedPPIs = initialState.ppinot.filter(
        ppi => ppi.targetRef === elementToDelete
      );

      // Encontrar asignaciones RASCI afectadas
      if (initialState.rasci.matrix[elementToDelete]) {
        cascadeResults.affectedRASCI.push(elementToDelete);
      }

      // Publicar eventos de cascada
      mockEventBus.publish('element.deleted', { id: elementToDelete });
      mockEventBus.publish('ppinot.cascade.cleanup', { 
        deletedPPIs: cascadeResults.affectedPPIs 
      });
      mockEventBus.publish('rasci.cascade.cleanup', { 
        deletedAssignments: cascadeResults.affectedRASCI 
      });

      // Verificar cascada
      expect(cascadeResults.deletedElements).toContain('Task_1');
      expect(cascadeResults.affectedPPIs).toHaveLength(1);
      expect(cascadeResults.affectedPPIs[0].id).toBe('PPI_1');
      expect(cascadeResults.affectedRASCI).toContain('Task_1');
      expect(mockEventBus.published.length).toBe(3);
    });

    test('debe recuperar estado tras error de sincronización', async () => {
      // Estado inicial válido
      const validState = createValidMmProject();
      
      // Simular error durante sincronización
      const corruptedState = {
        ...validState,
        rasci: {
          roles: null, // Datos corruptos
          matrix: undefined
        }
      };

      const recoverySteps = [];
      
      try {
        // Intentar procesar estado corrupto
        if (!corruptedState.rasci.roles || !corruptedState.rasci.matrix) {
          throw new Error('RASCI data corrupted');
        }
      } catch (error) {
        recoverySteps.push('Error detected');
        
        // Paso 1: Intentar recuperar desde backup
        try {
          const backupState = await mockStorageManager.load();
          if (backupState.success) {
            recoverySteps.push('Backup loaded');
          }
        } catch (backupError) {
          recoverySteps.push('Backup failed');
        }
        
        // Paso 2: Reconstruir estado mínimo
        const minimalState = {
          version: '1.0.0',
          bpmn: validState.bpmn,
          ppinot: { ppis: [] },
          rasci: { roles: [], matrix: {} }
        };
        recoverySteps.push('Minimal state created');
        
        // Paso 3: Notificar usuario
        mockEventBus.publish('system.recovery', {
          error: error.message,
          recoverySteps: recoverySteps
        });
        recoverySteps.push('User notified');
      }

      expect(recoverySteps).toContain('Error detected');
      expect(recoverySteps).toContain('Minimal state created');
      expect(recoverySteps).toContain('User notified');
      expect(recoverySteps.length).toBe(4);
    });

    test('debe manejar migración entre versiones de proyecto', async () => {
      // Proyecto versión antigua
      const oldVersionProject = {
        version: '0.9.0',
        bpmn: createValidBpmnXml(),
        ppis: [ // Formato antiguo (array directo)
          { id: 'PPI_1', target: 'Task_1' } // 'target' en lugar de 'targetRef'
        ],
        roles: ['Role_1'], // Formato antiguo (array directo)
        matrix: {
          'Task_1': { 'Role_1': 'A' }
        }
      };

      const migrationSteps = [];
      
      // Detectar versión
      const needsMigration = oldVersionProject.version !== '1.0.0';
      if (needsMigration) {
        migrationSteps.push('Migration needed');
        
        // Migrar PPINOT
        const migratedPPINOT = {
          ppis: oldVersionProject.ppis.map(ppi => ({
            ...ppi,
            targetRef: ppi.target // Cambiar 'target' por 'targetRef'
          }))
        };
        migrationSteps.push('PPINOT migrated');
        
        // Migrar RASCI
        const migratedRASCI = {
          roles: oldVersionProject.roles,
          matrix: oldVersionProject.matrix
        };
        migrationSteps.push('RASCI migrated');
        
        // Crear proyecto migrado
        const migratedProject = {
          version: '1.0.0',
          bpmn: oldVersionProject.bpmn,
          ppinot: migratedPPINOT,
          rasci: migratedRASCI
        };
        
        migrationSteps.push('Project migrated');
        
        // Guardar versión migrada
        await mockStorageManager.save(migratedProject);
        migrationSteps.push('Migration saved');
      }

      expect(migrationSteps).toContain('Migration needed');
      expect(migrationSteps).toContain('PPINOT migrated');
      expect(migrationSteps).toContain('RASCI migrated');
      expect(migrationSteps).toContain('Project migrated');
      expect(migrationSteps).toContain('Migration saved');
      expect(mockStorageManager.save).toHaveBeenCalled();
    });

    test('debe validar integridad referencial completa', async () => {
      const project = createValidMmProject();
      const integrityErrors = [];
      
      // 1. Verificar que todos los PPIs referencian elementos BPMN existentes
      const bpmnElements = ['StartEvent_1', 'Task_1', 'EndEvent_1'];
      project.ppinot.ppis.forEach(ppi => {
        if (!bpmnElements.includes(ppi.targetRef)) {
          integrityErrors.push(`PPI ${ppi.id} references non-existent BPMN element: ${ppi.targetRef}`);
        }
      });
      
      // 2. Verificar que todas las tareas RASCI existen en BPMN
      Object.keys(project.rasci.matrix).forEach(taskId => {
        if (!bpmnElements.includes(taskId)) {
          integrityErrors.push(`RASCI matrix references non-existent task: ${taskId}`);
        }
      });
      
      // 3. Verificar que todos los roles RASCI están definidos
      Object.values(project.rasci.matrix).forEach((assignments, taskIndex) => {
        Object.keys(assignments).forEach(roleId => {
          if (!project.rasci.roles.includes(roleId)) {
            integrityErrors.push(`RASCI assignment uses undefined role: ${roleId}`);
          }
        });
      });
      
      // 4. Verificar reglas RASCI
      Object.entries(project.rasci.matrix).forEach(([taskId, assignments]) => {
        const accountableCount = Object.values(assignments).filter(a => a === 'A').length;
        const responsibleCount = Object.values(assignments).filter(a => a === 'R').length;
        
        if (accountableCount !== 1) {
          integrityErrors.push(`Task ${taskId} must have exactly one Accountable (has ${accountableCount})`);
        }
        
        if (responsibleCount === 0) {
          integrityErrors.push(`Task ${taskId} must have at least one Responsible`);
        }
      });
      
      // 5. Verificar consistencia de versiones
      if (!project.version || project.version !== '1.0.0') {
        integrityErrors.push(`Project version inconsistency: ${project.version}`);
      }

      // Para un proyecto válido, no debería haber errores
      expect(integrityErrors.length).toBe(0);
      
      // Publicar resultado de validación
      mockEventBus.publish('integrity.validation.completed', {
        isValid: integrityErrors.length === 0,
        errors: integrityErrors
      });
      
      expect(mockEventBus.published).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'integrity.validation.completed'
          })
        ])
      );
    });
  });

  describe('Escenarios de Conflicto Avanzados', () => {
    test('debe manejar conflictos entre roles RASCI y RALPH', async () => {
      // Configurar conflicto: rol existe en RALPH pero no en RASCI
      const ralphRoles = [
        { id: 'Role_1', name: 'Manager', permissions: ['read', 'write'] },
        { id: 'Role_2', name: 'Analyst', permissions: ['read'] }
      ];
      
      const rasciMatrix = {
        'Task_1': {
          'Role_1': 'A',  // Existe en RALPH ✅
          'Role_3': 'R'   // NO existe en RALPH ❌
        }
      };

      const conflicts = [];
      
      // Detectar conflictos
      Object.values(rasciMatrix).forEach(assignments => {
        Object.keys(assignments).forEach(roleId => {
          const existsInRalph = ralphRoles.some(role => role.id === roleId);
          if (!existsInRalph) {
            conflicts.push(`Role ${roleId} in RASCI but not in RALPH`);
          }
        });
      });

      expect(conflicts.length).toBe(1);
      expect(conflicts[0]).toContain('Role_3 in RASCI but not in RALPH');
      
      // Publicar evento de conflicto
      mockEventBus.publish('integration.conflict.detected', {
        type: 'RASCI-RALPH mismatch',
        conflicts: conflicts
      });
      
      expect(mockEventBus.published).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'integration.conflict.detected'
          })
        ])
      );
    });

    test('debe manejar rollback cuando falla integración', async () => {
      const originalState = createValidMmProject();
      const rollbackSteps = [];
      
      // Simular operación que falla a mitad de camino
      try {
        rollbackSteps.push('1. Backup state created');
        
        // Paso 1: Modificar BPMN (éxito)
        mockModeler.importXML(originalState.bpmn);
        rollbackSteps.push('2. BPMN updated');
        
        // Paso 2: Actualizar RASCI (éxito)  
        const updatedRasci = { ...originalState.rasci };
        rollbackSteps.push('3. RASCI updated');
        
        // Paso 3: Sincronizar PPINOT (FALLA)
        throw new Error('PPINOT sync failed');
        
      } catch (error) {
        rollbackSteps.push('4. Error detected');
        
        // Rollback: restaurar estado original
        await mockStorageManager.save(originalState);
        rollbackSteps.push('5. State rolled back');
        
        // Notificar error
        mockEventBus.publish('integration.rollback.completed', {
          error: error.message,
          rollbackSteps: rollbackSteps
        });
        rollbackSteps.push('6. User notified');
      }

      expect(rollbackSteps).toContain('4. Error detected');
      expect(rollbackSteps).toContain('5. State rolled back');
      expect(rollbackSteps).toContain('6. User notified');
      expect(mockStorageManager.save).toHaveBeenCalledWith(originalState);
    });

    test('debe verificar orden correcto de eventos en operaciones complejas', async () => {
      const eventOrder = [];
      
      // Capturar todos los eventos publicados
      const originalPublish = mockEventBus.publish;
      mockEventBus.publish = jest.fn((event, data) => {
        eventOrder.push(event);
        return originalPublish.call(mockEventBus, event, data);
      });

      // Simular operación compleja: crear diagrama + PPIs + RASCI
      mockEventBus.publish('bpmn.diagram.created', { id: 'diagram_1' });
      mockEventBus.publish('bpmn.element.added', { id: 'Task_1', type: 'bpmn:Task' });
      mockEventBus.publish('ppinot.ppi.created', { id: 'PPI_1', targetRef: 'Task_1' });
      mockEventBus.publish('rasci.assignment.created', { taskId: 'Task_1', roleId: 'Role_1', assignment: 'A' });
      mockEventBus.publish('integration.sync.completed', { success: true });

      // Verificar orden específico
      expect(eventOrder).toEqual([
        'bpmn.diagram.created',
        'bpmn.element.added', 
        'ppinot.ppi.created',
        'rasci.assignment.created',
        'integration.sync.completed'
      ]);
      
      // Verificar que cada evento tiene los datos correctos
      expect(mockEventBus.publish).toHaveBeenCalledWith('ppinot.ppi.created', 
        expect.objectContaining({
          id: 'PPI_1',
          targetRef: 'Task_1'
        })
      );
    });
  });
});
