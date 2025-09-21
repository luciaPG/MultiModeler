/**
 * 8.1 PRUEBAS UNITARIAS - LocalStorageManager
 * 
 * Valida el nuevo sistema de localStorage que reemplaza al autosave.
 * Funciona igual que ImportExportManager pero con persistencia automática.
 */

// Configurar localStorage para tests
require('../utils/ensure-localstorage.js');

// Mock para el EventBus
class MockEventBus {
  constructor() {
    this.subscribers = {};
    this.published = [];
  }
  
  subscribe(eventType, callback) {
    if (!this.subscribers[eventType]) {
      this.subscribers[eventType] = [];
    }
    this.subscribers[eventType].push(callback);
  }
  
  publish(eventType, data) {
    this.published.push({ eventType, data, timestamp: Date.now() });
    if (this.subscribers[eventType]) {
      this.subscribers[eventType].forEach(callback => callback(data));
    }
  }
  
  unsubscribe(eventType, callback) {
    if (this.subscribers[eventType]) {
      this.subscribers[eventType] = this.subscribers[eventType].filter(cb => cb !== callback);
    }
  }
}

// Mock para ServiceRegistry
class MockServiceRegistry {
  constructor() {
    this.services = new Map();
  }
  
  register(name, service) {
    this.services.set(name, service);
  }
  
  get(name) {
    return this.services.get(name);
  }
  
  has(name) {
    return this.services.has(name);
  }
}

// Mock para resolve function
const mockResolve = jest.fn();

jest.mock('../../app/services/global-access.js', () => ({
  resolve: mockResolve
}));

describe('8.1 Pruebas Unitarias - LocalStorageManager', () => {
  let LocalStorageManager;
  let mockModeler;
  let mockPPIManager;
  let mockRasciManager;
  let mockRalphManager;
  let mockEventBus;
  let mockServiceRegistry;

  beforeAll(async () => {
    // Importar la instancia singleton del LocalStorageManager
    const storageModule = await import('../../app/services/local-storage-manager.js');
    LocalStorageManager = storageModule.default;
    
    if (!LocalStorageManager) {
      throw new Error('LocalStorageManager no encontrado - test debe fallar si la implementación no existe');
    }
  });

  beforeEach(() => {
    // Setup mocks
    mockModeler = {
      saveXML: jest.fn().mockResolvedValue({ 
        xml: '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI"><bpmn:process id="Process_1"><bpmn:startEvent id="StartEvent_1"/></bpmn:process></bpmn:definitions>'
      }),
      importXML: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockImplementation((service) => {
        const services = {
          'elementRegistry': {
            getAll: jest.fn().mockReturnValue([])
          },
          'canvas': {
            zoom: jest.fn().mockReturnValue(1),
            viewbox: jest.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
            getRootElement: jest.fn().mockReturnValue({ id: 'Process_1' }),
            getContainer: jest.fn().mockReturnValue(document.createElement('div'))
          },
          'modeling': {},
          'elementFactory': {},
          'moddle': {}
        };
        return services[service] || { getAll: jest.fn().mockReturnValue([]) };
      })
    };

    mockPPIManager = {
      core: {
        getAllPPIs: jest.fn().mockReturnValue([
          { id: 'PPI_1', name: 'Tiempo de Proceso', type: 'TimeMeasure' }
        ]),
        addPPI: jest.fn().mockResolvedValue(true),
        clearAllPPIs: jest.fn().mockResolvedValue(true)
      }
    };

    mockRasciManager = {
      core: {
        getRoles: jest.fn().mockReturnValue(['Analista', 'Desarrollador']),
        getMatrix: jest.fn().mockReturnValue({
          'Task_1': { 'Analista': 'R', 'Desarrollador': 'A' }
        })
      }
    };

    mockRalphManager = {
      core: {
        getAllRALphElements: jest.fn().mockReturnValue([
          { id: 'RALPH_1', name: 'Elemento RALPH', type: 'RALPH:Element' }
        ])
      }
    };

    mockEventBus = new MockEventBus();
    mockServiceRegistry = new MockServiceRegistry();

    // Configurar resolve mock
    mockResolve.mockImplementation((key) => {
      const services = {
        'BpmnModeler': mockModeler,
        'PPIManagerInstance': mockPPIManager,
        'RasciManagerInstance': mockRasciManager,
        'RALphManagerInstance': mockRalphManager,
        'EventBus': mockEventBus,
        'ServiceRegistry': mockServiceRegistry
      };
      return services[key] || null;
    });

    // Asegurarse de que el ServiceRegistry devuelva el EventBus
    mockServiceRegistry.register('EventBus', mockEventBus);
    mockServiceRegistry.register('PPIManagerInstance', mockPPIManager);
    mockServiceRegistry.register('RasciManagerInstance', mockRasciManager);
    mockServiceRegistry.register('RALphManagerInstance', mockRalphManager);
    mockServiceRegistry.register('BpmnModeler', mockModeler);

    // Limpiar localStorage
    localStorage.clear();
    jest.clearAllMocks();

    // CRITICAL: Reinicializar el eventBus del LocalStorageManager singleton
    if (LocalStorageManager) {
      LocalStorageManager.eventBus = mockEventBus;
    }
  });

  describe('Inicialización del LocalStorageManager', () => {
    test('debe inicializar correctamente con configuración por defecto', () => {
      const storageManager = LocalStorageManager;

      expect(storageManager.config).toBeDefined();
      expect(storageManager.config.storageKey).toBe('multinotation_project_data');
      expect(storageManager.config.version).toBe('2.0.0');
    });

    test('debe tener configuración válida', () => {
      const storageManager = LocalStorageManager;

      expect(storageManager.config.storageKey).toBe('multinotation_project_data');
      expect(storageManager.config.version).toBe('2.0.0');
      expect(storageManager.config.maxDistance).toBeDefined();
    });
  });

  describe('Captura de datos del proyecto', () => {
    test('debe capturar proyecto completo', async () => {
      const storageManager = LocalStorageManager;

      const projectData = await storageManager.captureCompleteProject();

      expect(projectData).toBeDefined();
      expect(projectData.version).toBe('2.0.0');
      expect(projectData.bpmn).toBeDefined();
      expect(projectData.ppi).toBeDefined();
      expect(projectData.rasci).toBeDefined();
      expect(projectData.ralph).toBeDefined();
      expect(projectData.metadata).toBeDefined();
      expect(projectData.saveDate).toBeDefined();
    });

    test('debe incluir datos BPMN con relaciones padre-hijo en proyecto completo', async () => {
      const storageManager = LocalStorageManager;

      const projectData = await storageManager.captureCompleteProject();

      expect(projectData.bpmn).toBeDefined();
      expect(projectData.bpmn.diagram).toBeDefined();
      expect(projectData.bpmn.relationships).toBeDefined();
      expect(Array.isArray(projectData.bpmn.relationships)).toBe(true);
      expect(mockModeler.saveXML).toHaveBeenCalled();
    });

    test('debe incluir datos PPI en proyecto completo', async () => {
      const storageManager = LocalStorageManager;

      const projectData = await storageManager.captureCompleteProject();

      expect(projectData.ppi).toBeDefined();
      expect(projectData.ppi.indicators).toBeDefined();
      expect(Array.isArray(projectData.ppi.indicators)).toBe(true);
    });

    test('debe incluir datos RASCI en proyecto completo', async () => {
      const storageManager = LocalStorageManager;

      const projectData = await storageManager.captureCompleteProject();

      expect(projectData.rasci).toBeDefined();
      expect(projectData.rasci.roles).toBeDefined();
      expect(Array.isArray(projectData.rasci.roles)).toBe(true);
      expect(projectData.rasci.matrix).toBeDefined();
    });

    test('debe incluir metadata en proyecto completo', async () => {
      const storageManager = LocalStorageManager;

      const projectData = await storageManager.captureCompleteProject();

      expect(projectData.metadata).toBeDefined();
      expect(projectData.metadata.diagramName).toBeDefined();
      expect(projectData.metadata.captureDate).toBeDefined();
    });
  });

  describe('Guardado del proyecto', () => {
    test('debe guardar proyecto completo en localStorage', async () => {
      const storageManager = LocalStorageManager;

      const result = await storageManager.saveProject();

      expect(result.success).toBe(true);
      
      // Verificar que se guardó en localStorage
      const savedData = localStorage.getItem('multinotation_project_data');
      expect(savedData).toBeDefined();
      
      const parsedData = JSON.parse(savedData);
      expect(parsedData.version).toBe('2.0.0');
      expect(parsedData.data.bpmn).toBeDefined();
      expect(parsedData.data.ppi).toBeDefined();
      expect(parsedData.data.rasci).toBeDefined();
      expect(parsedData.data.ralph).toBeDefined();
      expect(parsedData.data.metadata).toBeDefined();
    });

    test('debe publicar evento de guardado exitoso', async () => {
      const storageManager = LocalStorageManager;

      await storageManager.saveProject();

      const saveEvents = mockEventBus.published.filter(
        event => event.eventType === 'localStorage.save.success'
      );

      expect(saveEvents.length).toBe(1);
      expect(saveEvents[0].data.success).toBe(true);
    });

    test('debe manejar errores durante el guardado', async () => {
      // Hacer que JSON.stringify falle para simular un error real
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('Cannot stringify data');
      });

      const storageManager = LocalStorageManager;
      const result = await storageManager.saveProject();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restaurar JSON.stringify
      JSON.stringify = originalStringify;
    });
  });

  describe('Carga del proyecto', () => {
    test('debe cargar proyecto desde localStorage', async () => {
      const storageManager = LocalStorageManager;

      // Primero guardar datos
      await storageManager.saveProject();

      // Luego cargar
      const result = await storageManager.loadProject();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.bpmn).toBeDefined();
      expect(result.data.ppi).toBeDefined();
      expect(result.data.rasci).toBeDefined();
      expect(result.data.ralph).toBeDefined();
      expect(result.data.metadata).toBeDefined();
    });

    test('debe restaurar BPMN con relaciones padre-hijo', async () => {
      const storageManager = LocalStorageManager;

      // Guardar proyecto con datos
      await storageManager.saveProject();

      // Cargar proyecto
      const result = await storageManager.loadProject();

      expect(result.success).toBe(true);
      expect(mockModeler.importXML).toHaveBeenCalled();
    });

    test('debe manejar carga cuando no hay datos guardados', async () => {
      const storageManager = LocalStorageManager;

      const result = await storageManager.loadProject();

      expect(result.success).toBe(false);
      expect(result.reason).toContain('No saved data');
    });
  });

  describe('Verificación de datos guardados', () => {
    test('debe verificar si hay datos guardados', () => {
      const storageManager = LocalStorageManager;

      // Sin datos
      expect(storageManager.hasSavedData()).toBe(false);

      // Con datos
      localStorage.setItem('multinotation_project_data', JSON.stringify({
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        data: { bpmn: { diagram: 'test' } }
      }));

      expect(storageManager.hasSavedData()).toBe(true);
    });

    test('debe obtener información de almacenamiento', () => {
      const storageManager = LocalStorageManager;

      // Sin datos
      let info = storageManager.getStorageInfo();
      expect(info.hasData).toBe(false);

      // Con datos
      localStorage.setItem('multinotation_project_data', JSON.stringify({
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        data: { bpmn: { diagram: 'test' } }
      }));

      info = storageManager.getStorageInfo();
      expect(info.hasData).toBe(true);
      expect(info.version).toBe('2.0.0');
      expect(info.dataSize).toBeGreaterThan(0);
    });
  });

  describe('Limpieza de datos', () => {
    test('debe limpiar datos guardados', async () => {
      const storageManager = LocalStorageManager;

      // Guardar datos usando el método del LocalStorageManager
      await storageManager.saveProject();

      expect(storageManager.hasSavedData()).toBe(true);

      // Limpiar
      const result = storageManager.clearSavedData();

      expect(result).toBe(true);
      expect(storageManager.hasSavedData()).toBe(false);
    });

    test('debe publicar evento de limpieza exitosa', async () => {
      const storageManager = LocalStorageManager;

      // Guardar datos primero usando el método del LocalStorageManager
      await storageManager.saveProject();

      storageManager.clearSavedData();

      const clearEvents = mockEventBus.published.filter(
        event => event.eventType === 'localStorage.clear.success'
      );

      expect(clearEvents.length).toBe(1);
    });
  });

  describe('Integración con PPIDataManager', () => {
    test('debe ser compatible con PPIDataManager.savePPIs', async () => {
      const storageManager = LocalStorageManager;

      const result = await storageManager.saveProject();

      expect(result.success).toBe(true);
      // Verificar que PPIDataManager puede usar este método
      expect(typeof storageManager.saveProject).toBe('function');
    });

    test('debe ser compatible con PPIDataManager.loadPPIs', async () => {
      const storageManager = LocalStorageManager;

      // Guardar datos primero
      await storageManager.saveProject();

      const result = await storageManager.loadProject();

      expect(result.success).toBe(true);
      // Verificar que PPIDataManager puede usar este método
      expect(typeof storageManager.loadProject).toBe('function');
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar errores de localStorage', () => {
      const storageManager = LocalStorageManager;

      // Hacer que localStorage.setItem falle
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      // Esto debería manejar el error graciosamente
      expect(() => storageManager.clearSavedData()).not.toThrow();

      // Restaurar localStorage
      localStorage.setItem = originalSetItem;
    });

    test('debe manejar datos corruptos en localStorage', async () => {
      const storageManager = LocalStorageManager;

      // Guardar datos corruptos
      localStorage.setItem('multinotation_project_data', 'invalid json');

      const result = await storageManager.loadProject();

      expect(result.success).toBe(false);
      expect(result.reason || result.error).toBeDefined();
    });
  });
});

