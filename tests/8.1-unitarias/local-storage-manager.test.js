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
    // Importar el LocalStorageManager real
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
      get: jest.fn().mockReturnValue({
        getAll: jest.fn().mockReturnValue([])
      })
    };

    mockPPIManager = {
      core: {
        getAllPPIs: jest.fn().mockReturnValue([
          { id: 'PPI_1', name: 'Tiempo de Proceso', type: 'TimeMeasure' }
        ])
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

    // Limpiar localStorage
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Inicialización del LocalStorageManager', () => {
    test('debe inicializar correctamente con configuración por defecto', () => {
      const storageManager = new LocalStorageManager();

      expect(storageManager.config).toBeDefined();
      expect(storageManager.config.storageKey).toBe('mmproject:localstorage');
      expect(storageManager.config.version).toBe('2.0.0');
      expect(storageManager.eventBus).toBe(mockEventBus);
    });

    test('debe inicializar con configuración personalizada', () => {
      const customConfig = {
        storageKey: 'custom:key',
        version: '3.0.0',
        maxDistance: 500
      };

      const storageManager = new LocalStorageManager(customConfig);

      expect(storageManager.config.storageKey).toBe('custom:key');
      expect(storageManager.config.version).toBe('3.0.0');
      expect(storageManager.config.maxDistance).toBe(500);
    });
  });

  describe('Captura de datos del proyecto', () => {
    test('debe capturar datos BPMN con relaciones padre-hijo', async () => {
      const storageManager = new LocalStorageManager();

      const bpmnData = await storageManager.captureBpmnData();

      expect(bpmnData).toBeDefined();
      expect(bpmnData.diagram).toBeDefined();
      expect(bpmnData.relationships).toBeDefined();
      expect(Array.isArray(bpmnData.relationships)).toBe(true);
      expect(mockModeler.saveXML).toHaveBeenCalled();
    });

    test('debe capturar datos PPI correctamente', async () => {
      const storageManager = new LocalStorageManager();

      const ppiData = await storageManager.capturePPIData();

      expect(ppiData).toBeDefined();
      expect(ppiData.indicators).toBeDefined();
      expect(Array.isArray(ppiData.indicators)).toBe(true);
      expect(ppiData.indicators.length).toBe(1);
      expect(ppiData.captureDate).toBeDefined();
    });

    test('debe capturar datos RASCI correctamente', async () => {
      const storageManager = new LocalStorageManager();

      const rasciData = await storageManager.captureRasciData();

      expect(rasciData).toBeDefined();
      expect(rasciData.roles).toBeDefined();
      expect(Array.isArray(rasciData.roles)).toBe(true);
      expect(rasciData.matrix).toBeDefined();
      expect(rasciData.captureDate).toBeDefined();
    });

    test('debe capturar metadata del proyecto', async () => {
      const storageManager = new LocalStorageManager();

      const metadata = await storageManager.captureMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.diagramName).toBeDefined();
      expect(metadata.captureDate).toBeDefined();
    });

    test('debe capturar proyecto completo', async () => {
      const storageManager = new LocalStorageManager();

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
  });

  describe('Guardado del proyecto', () => {
    test('debe guardar proyecto completo en localStorage', async () => {
      const storageManager = new LocalStorageManager();

      const result = await storageManager.saveProject();

      expect(result.success).toBe(true);
      
      // Verificar que se guardó en localStorage
      const savedData = localStorage.getItem('mmproject:localstorage');
      expect(savedData).toBeDefined();
      
      const parsedData = JSON.parse(savedData);
      expect(parsedData.version).toBe('2.0.0');
      expect(parsedData.bpmn).toBeDefined();
      expect(parsedData.ppi).toBeDefined();
      expect(parsedData.rasci).toBeDefined();
      expect(parsedData.ralph).toBeDefined();
      expect(parsedData.metadata).toBeDefined();
    });

    test('debe publicar evento de guardado exitoso', async () => {
      const storageManager = new LocalStorageManager();

      await storageManager.saveProject();

      const saveEvents = mockEventBus.published.filter(
        event => event.eventType === 'localStorage.save.success'
      );

      expect(saveEvents.length).toBe(1);
      expect(saveEvents[0].data.success).toBe(true);
    });

    test('debe manejar errores durante el guardado', async () => {
      // Hacer que saveXML falle
      mockModeler.saveXML.mockRejectedValue(new Error('BPMN save failed'));

      const storageManager = new LocalStorageManager();
      const result = await storageManager.saveProject();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Carga del proyecto', () => {
    test('debe cargar proyecto desde localStorage', async () => {
      const storageManager = new LocalStorageManager();

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
      const storageManager = new LocalStorageManager();

      // Guardar proyecto con datos
      await storageManager.saveProject();

      // Cargar proyecto
      const result = await storageManager.loadProject();

      expect(result.success).toBe(true);
      expect(mockModeler.importXML).toHaveBeenCalled();
    });

    test('debe manejar carga cuando no hay datos guardados', async () => {
      const storageManager = new LocalStorageManager();

      const result = await storageManager.loadProject();

      expect(result.success).toBe(false);
      expect(result.reason).toContain('No hay datos guardados');
    });
  });

  describe('Verificación de datos guardados', () => {
    test('debe verificar si hay datos guardados', () => {
      const storageManager = new LocalStorageManager();

      // Sin datos
      expect(storageManager.hasSavedData()).toBe(false);

      // Con datos
      localStorage.setItem('mmproject:localstorage', JSON.stringify({
        version: '2.0.0',
        saveDate: new Date().toISOString(),
        bpmn: { diagram: 'test' }
      }));

      expect(storageManager.hasSavedData()).toBe(true);
    });

    test('debe obtener información de almacenamiento', () => {
      const storageManager = new LocalStorageManager();

      // Sin datos
      let info = storageManager.getStorageInfo();
      expect(info.hasData).toBe(false);

      // Con datos
      localStorage.setItem('mmproject:localstorage', JSON.stringify({
        version: '2.0.0',
        saveDate: new Date().toISOString(),
        bpmn: { diagram: 'test' }
      }));

      info = storageManager.getStorageInfo();
      expect(info.hasData).toBe(true);
      expect(info.version).toBe('2.0.0');
      expect(info.dataSize).toBeGreaterThan(0);
    });
  });

  describe('Limpieza de datos', () => {
    test('debe limpiar datos guardados', () => {
      const storageManager = new LocalStorageManager();

      // Guardar datos
      localStorage.setItem('mmproject:localstorage', JSON.stringify({
        version: '2.0.0',
        saveDate: new Date().toISOString(),
        bpmn: { diagram: 'test' }
      }));

      expect(storageManager.hasSavedData()).toBe(true);

      // Limpiar
      const result = storageManager.clearSavedData();

      expect(result).toBe(true);
      expect(storageManager.hasSavedData()).toBe(false);
    });

    test('debe publicar evento de limpieza exitosa', () => {
      const storageManager = new LocalStorageManager();

      // Guardar datos primero
      localStorage.setItem('mmproject:localstorage', JSON.stringify({
        version: '2.0.0',
        saveDate: new Date().toISOString(),
        bpmn: { diagram: 'test' }
      }));

      storageManager.clearSavedData();

      const clearEvents = mockEventBus.published.filter(
        event => event.eventType === 'localStorage.clear.success'
      );

      expect(clearEvents.length).toBe(1);
    });
  });

  describe('Integración con PPIDataManager', () => {
    test('debe ser compatible con PPIDataManager.savePPIs', async () => {
      const storageManager = new LocalStorageManager();

      const result = await storageManager.saveProject();

      expect(result.success).toBe(true);
      // Verificar que PPIDataManager puede usar este método
      expect(typeof storageManager.saveProject).toBe('function');
    });

    test('debe ser compatible con PPIDataManager.loadPPIs', async () => {
      const storageManager = new LocalStorageManager();

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
      const storageManager = new LocalStorageManager();

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
      const storageManager = new LocalStorageManager();

      // Guardar datos corruptos
      localStorage.setItem('mmproject:localstorage', 'invalid json');

      const result = await storageManager.loadProject();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

