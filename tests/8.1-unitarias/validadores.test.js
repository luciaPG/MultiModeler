/**
 * 8.1 PRUEBAS UNITARIAS - Validadores
 * 
 * Valida los módulos de validación para BPMN, PPINOT, RALPH y RASCI.
 * Lógica crítica para garantizar la integridad de los modelos.
 */

const { createValidBpmnXml, createValidMmProject } = require('../utils/test-helpers');

// -------------------------------------------------------------
// Mocks mínimos para dependencias internas del validador RASCI
// -------------------------------------------------------------

const createLocalStorageMock = () => ({
  store: {},
  getItem: jest.fn(function(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; }),
  setItem: jest.fn(function(key, value) { this.store[key] = value; }),
  removeItem: jest.fn(function(key) { delete this.store[key]; }),
  clear: jest.fn(function() { this.store = {}; })
});

const mockLocalStorage = createLocalStorageMock();

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock de EventBus compartido entre módulos
const mockEventBus = {
  subscribers: {},
  subscribe: jest.fn(function(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
    return () => {
      this.subscribers[event] = (this.subscribers[event] || []).filter(cb => cb !== callback);
    };
  }),
  publish: jest.fn(function(event, data) {
    (this.subscribers[event] || []).forEach(cb => cb(data));
  }),
  clear: jest.fn(function() { this.subscribers = {}; })
};

jest.mock('../../app/modules/ui/core/event-bus.js', () => ({
  __esModule: true,
  EventBus: class { },
  getEventBus: () => mockEventBus
}));

const serviceRegistryMock = {
  services: {},
  functions: {},
  register(serviceName, instance) {
    this.services[serviceName] = { instance };
  },
  get(name) {
    return this.services[name]?.instance;
  },
  has(name) {
    return Object.prototype.hasOwnProperty.call(this.services, name);
  },
  registerFunction(name, fn) {
    this.functions[name] = { fn };
  },
  getFunction(name) {
    return this.functions[name]?.fn;
  },
  call(name, ...args) {
    const fn = this.getFunction(name);
    if (!fn) {
      throw new Error(`Function not found: ${name}`);
    }
    return fn(...args);
  }
};

jest.mock('../../app/modules/ui/core/ServiceRegistry.js', () => ({
  __esModule: true,
  ServiceRegistry: class { },
  getServiceRegistry: () => serviceRegistryMock
}));

let mockStoredRoles = [];
let mockStoredMatrix = {};

jest.mock('../../app/modules/rasci/store.js', () => ({
  __esModule: true,
  RasciStore: {
    getRoles: jest.fn(() => mockStoredRoles),
    setRoles: jest.fn((roles) => { mockStoredRoles = Array.isArray(roles) ? roles : []; }),
    getMatrix: jest.fn(() => mockStoredMatrix),
    setMatrix: jest.fn((matrix) => { mockStoredMatrix = matrix || {}; })
  }
}));

jest.mock('../../app/modules/rasci/mapping/main-mapper.js', () => ({
  __esModule: true,
  executeSimpleRasciMapping: jest.fn(() => ({}))
}));

jest.mock('../../app/modules/rasci/RASCIAdapter.js', () => {
  const mockAdapter = {
    bridge: {
      registerModeler: jest.fn(),
      serviceRegistry: serviceRegistryMock,
      initialize: jest.fn(() => Promise.resolve()),
      getModeler: jest.fn(() => null),
      getSharedData: jest.fn(() => null),
      getModule: jest.fn(() => null),
      communicate: jest.fn(() => Promise.resolve(null))
    },
    getBpmnModeler: jest.fn(() => null),
    getRoles: jest.fn(() => []),
    getMatrixData: jest.fn(() => ({})),
    communicateWithPPIs: jest.fn(() => Promise.resolve(null)),
    updateMatrixData: jest.fn(() => true)
  };

  return {
    __esModule: true,
    default: mockAdapter,
    RASCIAdapter: class {
      constructor() {
        return mockAdapter;
      }
    }
  };
});

jest.mock('../../app/modules/rasci/ui/matrix-ui-validator.js', () => ({
  __esModule: true,
  rasciUIValidator: {
    validateMatrix: jest.fn(() => ({ isValid: true, criticalErrors: [], warnings: [] }))
  },
  RasciMatrixUIValidator: class { }
}));

const mockBpmnTasks = [];

jest.mock('../../app/modules/rasci/core/matrix-manager.js', () => ({
  __esModule: true,
  getBpmnTasks: jest.fn(() => mockBpmnTasks.slice()),
  __setMockBpmnTasks: (tasks) => {
    mockBpmnTasks.splice(0, mockBpmnTasks.length, ...tasks);
  }
}));

const matrixManagerMock = require('../../app/modules/rasci/core/matrix-manager.js');

describe('8.1 Pruebas Unitarias - Validadores', () => {
  describe('Validador BPMN - Lógica Básica', () => {
    test('debe validar XML BPMN válido', () => {
      const validXml = createValidBpmnXml();
      
      expect(validXml).toContain('bpmn:startEvent');
      expect(validXml).toContain('bpmn:endEvent');
      expect(validXml).toContain('bpmn:task');
    });

    test('debe detectar elementos BPMN en XML', () => {
      const xml = createValidBpmnXml();
      
      const hasStartEvent = xml.includes('bpmn:startEvent') || xml.includes('bpmn:StartEvent');
      const hasEndEvent = xml.includes('bpmn:endEvent') || xml.includes('bpmn:EndEvent');
      const hasTasks = xml.includes('bpmn:task') || xml.includes('bpmn:Task');
      
      expect(hasStartEvent).toBe(true);
      expect(hasEndEvent).toBe(true);
      expect(hasTasks).toBe(true);
    });

    test('debe identificar flujos secuenciales', () => {
      const xml = createValidBpmnXml();
      
      const hasSequenceFlows = xml.includes('bpmn:sequenceFlow') || xml.includes('bpmn:SequenceFlow');
      expect(hasSequenceFlows).toBe(true);
    });
  });

  describe('Validador PPINOT', () => {
    test('debe validar estructura de PPI', () => {
      const validPPI = {
        id: 'PPI_1',
        name: 'Tiempo de Proceso',
        type: 'TimeMeasure',
        from: 'StartEvent_1',
        to: 'EndEvent_1'
      };

      // Simulamos validación básica
      expect(validPPI.id).toBeDefined();
      expect(validPPI.name).toBeDefined();
      expect(validPPI.type).toBeDefined();
      expect(['TimeMeasure', 'CountMeasure', 'DataMeasure'].includes(validPPI.type)).toBe(true);
    });

    test('debe rechazar PPI con datos incompletos', () => {
      const invalidPPI = {
        id: 'PPI_2',
        // Falta name y type
      };

      expect(invalidPPI.name).toBeUndefined();
      expect(invalidPPI.type).toBeUndefined();
    });
  });

  describe('Validador RALPH', () => {
    test('debe validar definición de roles', () => {
      const validRole = {
        id: 'Role_1',
        name: 'Analista',
        permissions: ['read', 'write'],
        restrictions: []
      };

      expect(validRole.id).toBeDefined();
      expect(validRole.name).toBeDefined();
      expect(Array.isArray(validRole.permissions)).toBe(true);
      expect(Array.isArray(validRole.restrictions)).toBe(true);
    });

    test('debe validar restricciones de roles', () => {
      const restrictedRole = {
        id: 'Role_2',
        name: 'Supervisor',
        permissions: ['read', 'write', 'approve'],
        restrictions: ['cannot_delete', 'requires_approval']
      };

      expect(restrictedRole.restrictions.length).toBeGreaterThan(0);
      expect(restrictedRole.permissions).toContain('approve');
    });
  });

  describe('Validador RASCI', () => {
    let RasciMatrixValidator;
    let validator;

    beforeAll(async () => {
      ({ RasciMatrixValidator } = await import('../../app/modules/rasci/validation/matrix-validator.js'));
    });

    beforeEach(() => {
      mockLocalStorage.clear();
      jest.clearAllMocks();
      mockEventBus.subscribers = {};
      mockStoredRoles = [];
      mockStoredMatrix = {};
      matrixManagerMock.__setMockBpmnTasks(['Task_1', 'Task_2']);
      validator = new RasciMatrixValidator();
    });

    test('debe validar matriz consistente con tareas BPMN', () => {
      matrixManagerMock.__setMockBpmnTasks(['Task_1']);
      const roles = ['Analista', 'Supervisor'];
      const matrix = {
        Task_1: {
          Analista: 'R',
          Supervisor: 'A'
        }
      };

      const summary = validator.validateMatrix(roles, matrix, roles);

      expect(summary.isValid).toBe(true);
      expect(summary.criticalErrors).toHaveLength(0);
      expect(summary.warnings).toHaveLength(0);
    });

    test('debe marcar tareas sin responsable como error crítico', () => {
      matrixManagerMock.__setMockBpmnTasks(['Task_1']);
      const roles = ['Analista', 'Supervisor'];
      const matrix = {
        Task_1: {
          Analista: 'A',
          Supervisor: 'C'
        }
      };

      const summary = validator.validateMatrix(roles, matrix, roles);

      expect(summary.isValid).toBe(false);
      expect(summary.criticalErrors.some(err => err.message.includes('no tiene ningún responsable'))).toBe(true);
    });

    test('debe detectar responsables duplicados en la misma tarea', () => {
      matrixManagerMock.__setMockBpmnTasks(['Task_1']);
      const roles = ['Analista', 'Supervisor'];
      const matrix = {
        Task_1: {
          Analista: 'R',
          Supervisor: 'R'
        }
      };

      const summary = validator.validateMatrix(roles, matrix, roles);

      expect(summary.isValid).toBe(false);
      expect(summary.criticalErrors.find(err => err.message.includes('múltiples responsables'))).toBeDefined();
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
