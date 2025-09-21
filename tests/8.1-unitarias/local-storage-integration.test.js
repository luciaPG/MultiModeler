/**
 * 8.1 PRUEBAS UNITARIAS - LocalStorageIntegration
 * 
 * Valida la capa de integración que conecta LocalStorageManager con el sistema existente.
 * Incluye migración desde el sistema anterior y registro en ServiceRegistry.
 */

// Configurar localStorage para tests
require('../utils/ensure-localstorage.js');

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
  
  clear() {
    this.services.clear();
  }
}

// Mock para resolve function
const mockResolve = jest.fn();

jest.mock('../../app/services/global-access.js', () => ({
  resolve: mockResolve
}));

describe('8.1 Pruebas Unitarias - LocalStorageIntegration', () => {
  let LocalStorageIntegration;
  let mockServiceRegistry;

  beforeAll(async () => {
    // Importar el LocalStorageIntegration real
    const integrationModule = await import('../../app/services/local-storage-integration.js');
    LocalStorageIntegration = integrationModule.default;
    
    if (!LocalStorageIntegration) {
      throw new Error('LocalStorageIntegration no encontrado - test debe fallar si la implementación no existe');
    }
  });

  beforeEach(() => {
    mockServiceRegistry = new MockServiceRegistry();
    
    // Configurar resolve mock
    mockResolve.mockImplementation((key) => {
      if (key === 'ServiceRegistry') {
        return mockServiceRegistry;
      }
      return null;
    });

    // Limpiar localStorage
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Inicialización del LocalStorageIntegration', () => {
    test('debe inicializar correctamente y registrar servicios', () => {
      const integration = new LocalStorageIntegration();

      expect(integration).toBeDefined();
      expect(integration.storageManager).toBeDefined();
      expect(integration.initialized).toBe(true);

      // Verificar que se registró en ServiceRegistry
      expect(mockServiceRegistry.get('LocalStorageIntegration')).toBe(integration);
      expect(mockServiceRegistry.get('LocalStorageManager')).toBe(integration.storageManager);
    });

    test('debe configurar el ServiceRegistry correctamente', () => {
      const integration = new LocalStorageIntegration();

      expect(mockServiceRegistry.has('LocalStorageIntegration')).toBe(true);
      expect(mockServiceRegistry.has('LocalStorageManager')).toBe(true);
    });
  });

  describe('Migración desde sistema anterior', () => {
    test('debe migrar datos del formato anterior', () => {
      const integration = new LocalStorageIntegration();

      // Simular datos del sistema anterior
      const oldData = {
        savedAt: Date.now(),
        value: {
          bpmn: { xml: '<?xml version="1.0"?><bpmn:definitions><bpmn:process><bpmn:startEvent id="StartEvent_1"/></bpmn:process></bpmn:definitions>' },
          ppi: { indicators: [{ id: 'PPI_1', name: 'Test PPI' }] },
          rasci: { roles: ['Analista'], matrix: {} }
        }
      };

      localStorage.setItem('draft:multinotation', JSON.stringify(oldData));

      const result = integration.migrateFromOldSystem();

      expect(result).toBe(true);
      
      // Verificar que se migró al nuevo formato
      const newData = localStorage.getItem('mmproject:localstorage');
      expect(newData).toBeDefined();
      
      const parsedNewData = JSON.parse(newData);
      expect(parsedNewData.version).toBe('2.0.0');
      expect(parsedNewData.bpmn).toBeDefined();
      expect(parsedNewData.ppi).toBeDefined();
      expect(parsedNewData.rasci).toBeDefined();
    });

    test('debe manejar migración cuando no hay datos anteriores', () => {
      const integration = new LocalStorageIntegration();

      const result = integration.migrateFromOldSystem();

      expect(result).toBe(true);
      // No debería haber errores cuando no hay datos que migrar
    });

    test('debe manejar datos corruptos durante migración', () => {
      const integration = new LocalStorageIntegration();

      // Simular datos corruptos
      localStorage.setItem('draft:multinotation', 'invalid json');

      const result = integration.migrateFromOldSystem();

      expect(result).toBe(true);
      // Debería manejar el error graciosamente
    });
  });

  describe('Métodos de conveniencia', () => {
    test('debe exponer saveProject correctamente', async () => {
      const integration = new LocalStorageIntegration();

      // Mock del storageManager
      const mockSaveProject = jest.fn().mockResolvedValue({ success: true });
      integration.storageManager.saveProject = mockSaveProject;

      const result = await integration.saveProject();

      expect(result.success).toBe(true);
      expect(mockSaveProject).toHaveBeenCalled();
    });

    test('debe exponer loadProject correctamente', async () => {
      const integration = new LocalStorageIntegration();

      // Mock del storageManager
      const mockLoadProject = jest.fn().mockResolvedValue({ success: true, data: {} });
      integration.storageManager.loadProject = mockLoadProject;

      const result = await integration.loadProject();

      expect(result.success).toBe(true);
      expect(mockLoadProject).toHaveBeenCalled();
    });

    test('debe exponer clearSavedData correctamente', () => {
      const integration = new LocalStorageIntegration();

      // Mock del storageManager
      const mockClearSavedData = jest.fn().mockReturnValue(true);
      integration.storageManager.clearSavedData = mockClearSavedData;

      const result = integration.clearSavedData();

      expect(result).toBe(true);
      expect(mockClearSavedData).toHaveBeenCalled();
    });

    test('debe exponer hasSavedData correctamente', () => {
      const integration = new LocalStorageIntegration();

      // Mock del storageManager
      const mockHasSavedData = jest.fn().mockReturnValue(true);
      integration.storageManager.hasSavedData = mockHasSavedData;

      const result = integration.hasSavedData();

      expect(result).toBe(true);
      expect(mockHasSavedData).toHaveBeenCalled();
    });

    test('debe exponer getStorageInfo correctamente', () => {
      const integration = new LocalStorageIntegration();

      // Mock del storageManager
      const mockGetStorageInfo = jest.fn().mockReturnValue({ hasData: true });
      integration.storageManager.getStorageInfo = mockGetStorageInfo;

      const result = integration.getStorageInfo();

      expect(result.hasData).toBe(true);
      expect(mockGetStorageInfo).toHaveBeenCalled();
    });
  });

  describe('Métodos de estado', () => {
    test('debe manejar markRestored correctamente', () => {
      const integration = new LocalStorageIntegration();

      integration.markRestored();

      expect(integration.restored).toBe(true);
    });

    test('debe manejar isRestored correctamente', () => {
      const integration = new LocalStorageIntegration();

      expect(integration.isRestored()).toBe(false);

      integration.markRestored();

      expect(integration.isRestored()).toBe(true);
    });
  });

  describe('Integración con sistema existente', () => {
    test('debe ser compatible con PPIDataManager', async () => {
      const integration = new LocalStorageIntegration();

      // Simular que PPIDataManager llama a los métodos
      const saveResult = await integration.saveProject();
      const loadResult = await integration.loadProject();

      expect(saveResult).toBeDefined();
      expect(loadResult).toBeDefined();
    });

    test('debe manejar errores de manera consistente', async () => {
      const integration = new LocalStorageIntegration();

      // Hacer que el storageManager falle
      integration.storageManager.saveProject = jest.fn().mockRejectedValue(new Error('Save failed'));

      const result = await integration.saveProject();

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Save failed');
    });
  });

  describe('Compatibilidad con app.js', () => {
    test('debe proporcionar métodos que app.js necesita', () => {
      const integration = new LocalStorageIntegration();

      // Verificar que todos los métodos necesarios están disponibles
      expect(typeof integration.saveProject).toBe('function');
      expect(typeof integration.loadProject).toBe('function');
      expect(typeof integration.clearSavedData).toBe('function');
      expect(typeof integration.hasSavedData).toBe('function');
      expect(typeof integration.getStorageInfo).toBe('function');
      expect(typeof integration.markRestored).toBe('function');
      expect(typeof integration.isRestored).toBe('function');
      expect(typeof integration.migrateFromOldSystem).toBe('function');
    });

    test('debe estar disponible a través del ServiceRegistry', () => {
      const integration = new LocalStorageIntegration();

      // Verificar que se puede obtener desde el ServiceRegistry
      const retrievedIntegration = mockServiceRegistry.get('LocalStorageIntegration');
      expect(retrievedIntegration).toBe(integration);
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar errores de inicialización graciosamente', () => {
      // Hacer que resolve falle
      mockResolve.mockImplementation(() => {
        throw new Error('ServiceRegistry not available');
      });

      expect(() => {
        new LocalStorageIntegration();
      }).not.toThrow();
    });

    test('debe manejar errores de migración graciosamente', () => {
      const integration = new LocalStorageIntegration();

      // Hacer que localStorage falle
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      const result = integration.migrateFromOldSystem();

      expect(result).toBe(false);

      // Restaurar localStorage
      localStorage.setItem = originalSetItem;
    });
  });
});

