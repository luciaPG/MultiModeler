/**
 * 8.1 PRUEBAS UNITARIAS - Sistema LocalStorage (Reemplazo de Autosave)
 * 
 * Valida el nuevo sistema de localStorage que reemplaza completamente al autosave.
 * Funciona igual que ImportExportManager pero con persistencia automática.
 */

// Configurar localStorage para tests
require('../utils/ensure-localstorage.js');

const { createValidBpmnXml } = require('../utils/test-helpers');

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

// Mock para resolve function
const mockResolve = jest.fn();

jest.mock('../../app/services/global-access.js', () => ({
  resolve: mockResolve
}));

describe('8.1 Pruebas Unitarias - Sistema LocalStorage (Reemplazo de Autosave)', () => {
  let LocalStorageManager;
  let LocalStorageIntegration;
  let PPIDataManager;
  let mockModeler;
  let mockPPIManager;
  let mockEventBus;

  beforeAll(async () => {
    // Importar los módulos reales
    const storageModule = await import('../../app/services/local-storage-manager.js');
    LocalStorageManager = storageModule.default;
    
    const integrationModule = await import('../../app/services/local-storage-integration.js');
    LocalStorageIntegration = integrationModule.default;
    
    const ppiModule = await import('../../app/modules/ppis/core/managers/PPIDataManager.js');
    PPIDataManager = ppiModule.PPIDataManager;
    
    if (!LocalStorageManager || !LocalStorageIntegration || !PPIDataManager) {
      throw new Error('Módulos del sistema localStorage no encontrados');
    }
  });

  beforeEach(() => {
    // Setup mocks
    mockModeler = {
      saveXML: jest.fn().mockResolvedValue({ 
        xml: createValidBpmnXml() 
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

    mockEventBus = new MockEventBus();

    // Configurar resolve mock
    mockResolve.mockImplementation((key) => {
      const services = {
        'BpmnModeler': mockModeler,
        'PPIManagerInstance': mockPPIManager,
        'EventBus': mockEventBus
      };
      return services[key] || null;
    });

    // Limpiar localStorage
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Reemplazo del AutosaveManager', () => {
    test('LocalStorageIntegration debe reemplazar completamente al AutosaveManager', () => {
      const integration = new LocalStorageIntegration();

      expect(integration).toBeDefined();
      expect(integration.storageManager).toBeInstanceOf(LocalStorageManager);
      expect(integration.initialized).toBe(true);

      // Verificar que no depende de AutosaveManager
      expect(integration.autosaveManager).toBeUndefined();
    });

    test('debe proporcionar funcionalidad equivalente al AutosaveManager', async () => {
      const integration = new LocalStorageIntegration();

      // Simular guardado automático (equivalente a performAutosave)
      const saveResult = await integration.saveProject();
      expect(saveResult.success).toBe(true);

      // Simular carga automática (equivalente a loadAutosave)
      const loadResult = await integration.loadProject();
      expect(loadResult.success).toBe(true);

      // Verificar persistencia en localStorage
      expect(integration.hasSavedData()).toBe(true);
    });
  });

  describe('Integración con PPIDataManager', () => {
    test('PPIDataManager debe usar LocalStorageManager en lugar de autosave', async () => {
      const ppiManager = new PPIDataManager();

      // Verificar que tiene control de concurrencia
      expect(ppiManager.isSaving).toBe(false);

      // Simular guardado
      const result = await ppiManager.savePPIs();

      expect(result.success).toBe(true);
      expect(ppiManager.isSaving).toBe(false);
    });

    test('PPIDataManager debe prevenir guardados concurrentes', async () => {
      const ppiManager = new PPIDataManager();

      // Simular múltiples guardados simultáneos
      const save1 = ppiManager.savePPIs();
      const save2 = ppiManager.savePPIs();
      const save3 = ppiManager.savePPIs();

      const results = await Promise.all([save1, save2, save3]);

      // Solo uno debería ser exitoso, los otros deberían retornar "Already saving"
      const successCount = results.filter(r => r.success && !r.reason).length;
      const alreadySavingCount = results.filter(r => r.reason === 'Already saving').length;

      expect(successCount).toBe(1);
      expect(alreadySavingCount).toBe(2);
    });

    test('PPIDataManager debe cargar datos correctamente', async () => {
      const ppiManager = new PPIDataManager();

      // Primero guardar algunos datos
      await ppiManager.addPPI({
        name: 'Test PPI',
        type: 'TimeMeasure',
        description: 'Test description'
      });

      // Luego cargar
      const result = await ppiManager.loadPPIs();

      expect(result.success).toBe(true);
      expect(ppiManager.ppis.length).toBeGreaterThan(0);
    });
  });

  describe('Captura y restauración de relaciones padre-hijo', () => {
    test('debe capturar relaciones igual que ImportExportManager', async () => {
      const storageManager = new LocalStorageManager();

      const bpmnData = await storageManager.captureBpmnData();

      expect(bpmnData).toBeDefined();
      expect(bpmnData.diagram).toBeDefined();
      expect(bpmnData.relationships).toBeDefined();
      expect(Array.isArray(bpmnData.relationships)).toBe(true);

      // Verificar que se llamó saveXML
      expect(mockModeler.saveXML).toHaveBeenCalled();
    });

    test('debe restaurar relaciones igual que ImportExportManager', async () => {
      const storageManager = new LocalStorageManager();

      // Crear datos con relaciones
      const bpmnData = {
        diagram: createValidBpmnXml(),
        relationships: [
          {
            parentId: 'Process_1',
            childId: 'StartEvent_1',
            type: 'parent-child'
          }
        ]
      };

      await storageManager.restoreBpmnData(bpmnData);

      expect(mockModeler.importXML).toHaveBeenCalled();
    });
  });

  describe('Persistencia del nombre del diagrama', () => {
    test('debe capturar y restaurar el nombre del diagrama', async () => {
      const storageManager = new LocalStorageManager();

      // Capturar metadata
      const metadata = await storageManager.captureMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.diagramName).toBeDefined();
      expect(metadata.captureDate).toBeDefined();

      // Restaurar metadata
      await storageManager.restoreMetadata(metadata);

      // No debería haber errores
      expect(true).toBe(true);
    });
  });

  describe('Eventos del sistema', () => {
    test('debe publicar eventos de guardado exitoso', async () => {
      const integration = new LocalStorageIntegration();

      await integration.saveProject();

      const saveEvents = mockEventBus.published.filter(
        event => event.eventType === 'localStorage.save.success'
      );

      expect(saveEvents.length).toBe(1);
      expect(saveEvents[0].data.success).toBe(true);
    });

    test('debe publicar eventos de limpieza exitosa', () => {
      const integration = new LocalStorageIntegration();

      // Guardar datos primero
      localStorage.setItem('mmproject:localstorage', JSON.stringify({
        version: '2.0.0',
        saveDate: new Date().toISOString(),
        bpmn: { diagram: 'test' }
      }));

      integration.clearSavedData();

      const clearEvents = mockEventBus.published.filter(
        event => event.eventType === 'localStorage.clear.success'
      );

      expect(clearEvents.length).toBe(1);
    });
  });

  describe('Migración desde sistema anterior', () => {
    test('debe migrar datos del formato draft:multinotation', () => {
      const integration = new LocalStorageIntegration();

      // Simular datos del sistema anterior
      const oldData = {
        savedAt: Date.now(),
        value: {
          bpmn: { xml: createValidBpmnXml() },
          ppi: { indicators: [{ id: 'PPI_1', name: 'Test PPI' }] },
          rasci: { roles: ['Analista'], matrix: {} }
        }
      };

      localStorage.setItem('draft:multinotation', JSON.stringify(oldData));

      const result = integration.migrateFromOldSystem();

      expect(result).toBe(true);
      
      // Verificar migración
      const newData = localStorage.getItem('mmproject:localstorage');
      expect(newData).toBeDefined();
      
      const parsedNewData = JSON.parse(newData);
      expect(parsedNewData.version).toBe('2.0.0');
      expect(parsedNewData.bpmn).toBeDefined();
      expect(parsedNewData.ppi).toBeDefined();
      expect(parsedNewData.rasci).toBeDefined();
    });
  });

  describe('Compatibilidad con app.js', () => {
    test('debe proporcionar todos los métodos que app.js necesita', () => {
      const integration = new LocalStorageIntegration();

      // Métodos que app.js usa
      expect(typeof integration.saveProject).toBe('function');
      expect(typeof integration.loadProject).toBe('function');
      expect(typeof integration.clearSavedData).toBe('function');
      expect(typeof integration.hasSavedData).toBe('function');
      expect(typeof integration.getStorageInfo).toBe('function');
      expect(typeof integration.markRestored).toBe('function');
      expect(typeof integration.isRestored).toBe('function');
    });

    test('debe manejar el botón "Continuar diagrama" correctamente', () => {
      const integration = new LocalStorageIntegration();

      // Sin datos
      expect(integration.hasSavedData()).toBe(false);

      // Con datos
      localStorage.setItem('mmproject:localstorage', JSON.stringify({
        version: '2.0.0',
        saveDate: new Date().toISOString(),
        bpmn: { diagram: 'test' }
      }));

      expect(integration.hasSavedData()).toBe(true);
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar errores de localStorage graciosamente', () => {
      const integration = new LocalStorageIntegration();

      // Hacer que localStorage.setItem falle
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('localStorage quota exceeded');
      });

      // No debería lanzar excepciones
      expect(() => integration.clearSavedData()).not.toThrow();

      // Restaurar localStorage
      localStorage.setItem = originalSetItem;
    });

    test('debe manejar errores de modeler graciosamente', async () => {
      const storageManager = new LocalStorageManager();

      // Hacer que saveXML falle
      mockModeler.saveXML.mockRejectedValue(new Error('BPMN save failed'));

      const result = await storageManager.saveProject();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Rendimiento y eficiencia', () => {
    test('debe evitar guardados innecesarios', async () => {
      const ppiManager = new PPIDataManager();

      // Primer guardado
      await ppiManager.savePPIs();

      // Segundo guardado inmediato (debería ser omitido)
      const result = await ppiManager.savePPIs();

      expect(result.reason).toBe('Already saving');
    });

    test('debe cargar datos de manera eficiente', async () => {
      const integration = new LocalStorageIntegration();

      // Guardar datos
      await integration.saveProject();

      const startTime = Date.now();
      await integration.loadProject();
      const endTime = Date.now();

      // Debería ser rápido (menos de 100ms en tests)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
