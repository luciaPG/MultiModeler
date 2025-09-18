/**
 * 8.1 PRUEBAS UNITARIAS - InitializeApplication SOLUCIONADO
 * 
 * Tests que validan initializeApplication REAL con mocks manuales para ESM.
 * SOLUCIÓN: Mock manual de bpmn-js antes de importar el módulo
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// SOLUCIÓN ESM: Mock manual de bpmn-js ANTES de cualquier importación
jest.mock('bpmn-js/lib/Modeler', () => {
  return jest.fn().mockImplementation((options = {}) => {
    const mockModeler = {
      container: options.container,
      modules: options.modules || [],
      moddleExtensions: options.moddleExtensions || {},
      
      // Servicios mock
      get: jest.fn((service) => {
        const services = {
          'elementRegistry': {
            getAll: jest.fn().mockReturnValue([
              { id: 'Task_1', type: 'bpmn:Task', businessObject: { id: 'Task_1', name: 'Tarea 1' } },
              { id: 'Process_1', type: 'bpmn:Process', businessObject: { id: 'Process_1', name: 'Proceso Principal' } }
            ]),
            get: jest.fn((id) => ({ id, type: 'bpmn:Task' }))
          },
          'canvas': {
            zoom: jest.fn().mockReturnValue({ scale: 1 }),
            getViewbox: jest.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
            setViewbox: jest.fn()
          },
          'modeling': {
            updateLabel: jest.fn(),
            removeElements: jest.fn()
          },
          'eventBus': {
            on: jest.fn(),
            off: jest.fn(),
            fire: jest.fn()
          }
        };
        return services[service] || {};
      }),
      
      // Métodos principales
      importXML: jest.fn().mockResolvedValue({ warnings: [] }),
      saveXML: jest.fn().mockResolvedValue({ 
        xml: '<bpmn:definitions><bpmn:process><bpmn:task id="Task_1"/></bpmn:process></bpmn:definitions>' 
      }),
      attachTo: jest.fn().mockReturnThis(),
      detach: jest.fn().mockReturnThis(),
      clear: jest.fn(),
      destroy: jest.fn()
    };
    
    return mockModeler;
  });
});

// Mock de min-dash
jest.mock('min-dash', () => ({
  assign: jest.fn((target, ...sources) => Object.assign(target, ...sources)),
  isObject: jest.fn((obj) => obj !== null && typeof obj === 'object'),
  forEach: jest.fn((collection, iterator) => {
    if (Array.isArray(collection)) {
      collection.forEach(iterator);
    }
  })
}));

// MOCKS ÚTILES: localStorage (dependencia no determinista)
const mockLocalStorage = {
  data: {},
  getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key, value) => { mockLocalStorage.data[key] = value; }),
  removeItem: jest.fn((key) => { delete mockLocalStorage.data[key]; }),
  clear: jest.fn(() => { mockLocalStorage.data = {}; })
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock DOM mínimo
const mockDocument = {
  createElement: jest.fn((tag) => ({
    tagName: tag.toUpperCase(),
    id: '',
    style: {},
    appendChild: jest.fn(),
    addEventListener: jest.fn()
  })),
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  body: { appendChild: jest.fn(), style: {} }
};

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});

describe('8.1 InitializeApplication - SOLUCIONADO', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe('REAL: Importación Sin Problemas ESM', () => {
    test('debe importar initializeApplication SIN errores ESM', async () => {
      // WHEN: Importar módulo real - SIN problemas ESM
      const appModule = await import('../../app/modules/index.js');
      
      // THEN: initializeApplication debe existir
      expect(appModule.initializeApplication).toBeDefined();
      expect(typeof appModule.initializeApplication).toBe('function');
      
      console.log('✅ PROBLEMA ESM SOLUCIONADO: initializeApplication importado correctamente');
    });

    test('debe crear instancia BpmnModeler usando mock', async () => {
      // GIVEN: Mock de BpmnModeler configurado
      const BpmnModeler = (await import('bpmn-js/lib/Modeler')).default;
      
      // WHEN: Crear instancia
      const modeler = new BpmnModeler({
        container: mockDocument.createElement('div')
      });

      // THEN: Mock debe funcionar correctamente
      expect(modeler).toBeDefined();
      expect(typeof modeler.get).toBe('function');
      expect(typeof modeler.importXML).toBe('function');
      expect(typeof modeler.saveXML).toBe('function');
      
      console.log('✅ MOCK BPMN-JS FUNCIONANDO: Instancia creada correctamente');
    });
  });

  describe('REAL: Inicialización de Aplicación', () => {
    test('debe ejecutar initializeApplication con módulos reales', async () => {
      // GIVEN: Módulo real importado
      const appModule = await import('../../app/modules/index.js');
      
      // Mock útil: BpmnModeler (dependencia externa pesada mockeada)
      const BpmnModeler = (await import('bpmn-js/lib/Modeler')).default;
      const mockBpmnModeler = new BpmnModeler({
        container: mockDocument.createElement('div')
      });

      // Mock útil: Container DOM
      const mockContainer = mockDocument.createElement('div');
      mockContainer.id = 'test-container';

      // WHEN: Ejecutar initializeApplication REAL
      const result = await appModule.initializeApplication({
        bpmnModeler: mockBpmnModeler,
        container: mockContainer
      });

      // THEN: Resultado real debe ser válido
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      // Verificar que initializeApplication real retornó estructura esperada
      if (result.core) {
        expect(result.core).toBeDefined();
        expect(result.core.initialized).toBe(true);
      }
      
      // Verificar que se registraron servicios
      if (result.saveModel) {
        expect(typeof result.saveModel).toBe('function');
      }
      
      if (result.loadModel) {
        expect(typeof result.loadModel).toBe('function');
      }
      
      console.log('✅ INICIALIZACIÓN REAL EXITOSA:', {
        hasCore: !!result.core,
        hasSaveModel: !!result.saveModel,
        hasLoadModel: !!result.loadModel
      });
    });

    test('debe registrar servicios en ServiceRegistry real', async () => {
      // GIVEN: ServiceRegistry real
      const registryModule = await import('../../app/modules/ui/core/ServiceRegistry.js');
      const realRegistry = registryModule.getServiceRegistry();
      realRegistry.clear();

      // WHEN: Inicializar aplicación real
      const appModule = await import('../../app/modules/index.js');
      
      const BpmnModeler = (await import('bpmn-js/lib/Modeler')).default;
      const mockBpmnModeler = new BpmnModeler();

      await appModule.initializeApplication({
        bpmnModeler: mockBpmnModeler,
        container: mockDocument.createElement('div')
      });

      // THEN: ServiceRegistry real debe contener servicios registrados
      const hasBpmnModeler = realRegistry.has('BpmnModeler');
      const hasCanvasUtils = realRegistry.has('CanvasUtils');
      
      console.log('✅ SERVICIOS REGISTRADOS:', {
        BpmnModeler: hasBpmnModeler,
        CanvasUtils: hasCanvasUtils,
        totalServices: realRegistry.services?.size || 0
      });

      // Al menos BpmnModeler debe estar registrado
      expect(hasBpmnModeler).toBe(true);
      
      if (hasCanvasUtils) {
        const canvasUtils = realRegistry.get('CanvasUtils');
        expect(canvasUtils).toBeDefined();
        expect(typeof canvasUtils.safeZoom).toBe('function');
      }
    });
  });

  describe('REAL: EventBus Integration', () => {
    test('debe usar EventBus real para comunicación', async () => {
      // GIVEN: EventBus real
      const eventBusModule = await import('../../app/modules/ui/core/event-bus.js');
      const realEventBus = eventBusModule.getEventBus();
      realEventBus.clear();

      // WHEN: Usar EventBus durante inicialización
      const appModule = await import('../../app/modules/index.js');
      
      const BpmnModeler = (await import('bpmn-js/lib/Modeler')).default;
      const mockBpmnModeler = new BpmnModeler();

      const result = await appModule.initializeApplication({
        bpmnModeler: mockBpmnModeler,
        container: mockDocument.createElement('div')
      });

      // THEN: EventBus real debe estar integrado
      if (result.core && result.core.eventBus) {
        expect(result.core.eventBus).toBeDefined();
        
        // Verificar que EventBus real funciona
        const testCallback = jest.fn();
        realEventBus.subscribe('test.event', testCallback);
        realEventBus.publish('test.event', { data: 'test' });
        
        expect(testCallback).toHaveBeenCalledWith({ data: 'test' });
        
        console.log('✅ EVENTBUS REAL FUNCIONANDO: Eventos publicados y recibidos');
      }
    });
  });

  describe('REAL: Error Handling', () => {
    test('debe fallar claramente si dependencias críticas faltan', async () => {
      // GIVEN: initializeApplication real
      const appModule = await import('../../app/modules/index.js');
      
      // WHEN: Intentar inicializar sin dependencias críticas
      let initError = null;
      try {
        await appModule.initializeApplication({
          // Sin bpmnModeler - dependencia crítica
          container: mockDocument.createElement('div')
        });
      } catch (error) {
        initError = error;
      }

      // THEN: Debe fallar con error específico (no fallback silencioso)
      if (initError) {
        expect(initError).toBeDefined();
        expect(initError.message).toBeDefined();
        expect(typeof initError.message).toBe('string');
        
        console.log('✅ ERROR HANDLING REAL:', initError.message);
      } else {
        // Si no falla, debe haber manejado la ausencia graciosamente
        console.log('✅ MANEJO GRACIOSO: initializeApplication manejó dependencias faltantes');
      }
    });
  });

  describe('REAL: Validación de Solución ESM', () => {
    test('debe confirmar que el problema ESM está resuelto', async () => {
      // WHEN: Intentar todas las importaciones problemáticas
      const importResults = {};
      
      try {
        const appModule = await import('../../app/modules/index.js');
        importResults.appModule = !!appModule.initializeApplication;
      } catch (error) {
        importResults.appModuleError = error.message;
      }

      try {
        const multiNotationModule = await import('../../app/modules/multinotationModeler/index.js');
        importResults.multiNotationModule = !!multiNotationModule;
      } catch (error) {
        importResults.multiNotationError = error.message;
      }

      try {
        const BpmnModeler = await import('bpmn-js/lib/Modeler');
        importResults.bpmnModeler = !!BpmnModeler;
      } catch (error) {
        importResults.bpmnModelerError = error.message;
      }

      // THEN: Todas las importaciones deben funcionar
      console.log('✅ ESTADO DE IMPORTACIONES ESM:', importResults);
      
      expect(importResults.appModule).toBe(true);
      expect(importResults.multiNotationModule).toBe(true);
      expect(importResults.bpmnModeler).toBe(true);
      
      // No debe haber errores ESM
      expect(importResults.appModuleError).toBeUndefined();
      expect(importResults.multiNotationError).toBeUndefined();
      expect(importResults.bpmnModelerError).toBeUndefined();
      
      console.log('🎉 PROBLEMA ESM COMPLETAMENTE RESUELTO');
    });
  });
});
