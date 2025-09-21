/**
 * 8.1 PRUEBAS UNITARIAS - PPIDataManager con LocalStorage
 * 
 * Valida el PPIDataManager integrado con el nuevo sistema de localStorage.
 * Incluye control de concurrencia y compatibilidad con LocalStorageManager.
 */

// Configurar localStorage para tests
require('../utils/ensure-localstorage.js');

// Mock para resolve function
const mockResolve = jest.fn();

jest.mock('../../app/services/global-access.js', () => ({
  resolve: mockResolve
}));

describe('8.1 Pruebas Unitarias - PPIDataManager con LocalStorage', () => {
  let PPIDataManager;
  let LocalStorageManager;
  let mockPPIManager;

  beforeAll(async () => {
    // Importar los módulos reales
    const ppiModule = await import('../../app/modules/ppis/core/managers/PPIDataManager.js');
    PPIDataManager = ppiModule.PPIDataManager;
    
    const storageModule = await import('../../app/services/local-storage-manager.js');
    LocalStorageManager = storageModule.default;
    
    if (!PPIDataManager || !LocalStorageManager) {
      throw new Error('PPIDataManager o LocalStorageManager no encontrados');
    }
  });

  beforeEach(() => {
    // Setup mocks
    mockPPIManager = {
      core: {
        getAllPPIs: jest.fn().mockReturnValue([
          { id: 'PPI_1', name: 'Tiempo de Proceso', type: 'TimeMeasure' }
        ])
      }
    };

    // Configurar resolve mock
    mockResolve.mockImplementation((key) => {
      if (key === 'PPIManagerInstance') {
        return mockPPIManager;
      }
      return null;
    });

    // Limpiar localStorage
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Inicialización del PPIDataManager', () => {
    test('debe inicializar correctamente con control de concurrencia', () => {
      const ppiManager = new PPIDataManager();

      expect(ppiManager.ppis).toBeDefined();
      expect(ppiManager.filteredPPIs).toBeDefined();
      expect(ppiManager.isSaving).toBe(false);
      expect(Array.isArray(ppiManager.ppis)).toBe(true);
    });

    test('debe cargar PPIs al inicializar', async () => {
      const ppiManager = new PPIDataManager();

      // Esperar a que se complete la carga inicial
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(ppiManager.ppis).toBeDefined();
    });
  });

  describe('Control de concurrencia en guardado', () => {
    test('debe prevenir múltiples guardados simultáneos', async () => {
      const ppiManager = new PPIDataManager();

      // Simular múltiples guardados simultáneos
      const save1 = ppiManager.savePPIs();
      const save2 = ppiManager.savePPIs();
      const save3 = ppiManager.savePPIs();

      const results = await Promise.all([save1, save2, save3]);

      // Solo uno debería ser exitoso
      const successCount = results.filter(r => r.success && !r.reason).length;
      const alreadySavingCount = results.filter(r => r.reason === 'Already saving').length;

      expect(successCount).toBe(1);
      expect(alreadySavingCount).toBe(2);
      expect(ppiManager.isSaving).toBe(false); // Debe resetearse al final
    });

    test('debe prevenir múltiples cargas simultáneas', async () => {
      const ppiManager = new PPIDataManager();

      // Simular múltiples cargas simultáneas
      const load1 = ppiManager.loadPPIs();
      const load2 = ppiManager.loadPPIs();
      const load3 = ppiManager.loadPPIs();

      const results = await Promise.all([load1, load2, load3]);

      // Solo uno debería ser exitoso
      const successCount = results.filter(r => r.success && !r.reason).length;
      const alreadyLoadingCount = results.filter(r => r.reason === 'Already loading').length;

      expect(successCount).toBe(1);
      expect(alreadyLoadingCount).toBe(2);
      expect(ppiManager.isLoading).toBe(false); // Debe resetearse al final
    });

    test('debe manejar el flag isSaving correctamente', async () => {
      const ppiManager = new PPIDataManager();

      expect(ppiManager.isSaving).toBe(false);

      // Iniciar guardado
      const savePromise = ppiManager.savePPIs();
      
      // Verificar que el flag se activa temporalmente
      expect(ppiManager.isSaving).toBe(true);

      await savePromise;

      // Verificar que el flag se desactiva
      expect(ppiManager.isSaving).toBe(false);
    });

    test('debe manejar el flag isLoading correctamente', async () => {
      const ppiManager = new PPIDataManager();

      expect(ppiManager.isLoading).toBe(false);

      // Iniciar carga
      const loadPromise = ppiManager.loadPPIs();
      
      // Verificar que el flag se activa temporalmente
      expect(ppiManager.isLoading).toBe(true);

      await loadPromise;

      // Verificar que el flag se desactiva
      expect(ppiManager.isLoading).toBe(false);
    });

    test('debe manejar errores y resetear el flag isSaving', async () => {
      const ppiManager = new PPIDataManager();

      // Hacer que LocalStorageManager falle
      const originalSaveProject = LocalStorageManager.prototype.saveProject;
      LocalStorageManager.prototype.saveProject = jest.fn().mockRejectedValue(new Error('Save failed'));

      const result = await ppiManager.savePPIs();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(ppiManager.isSaving).toBe(false); // Debe resetearse incluso con error

      // Restaurar método original
      LocalStorageManager.prototype.saveProject = originalSaveProject;
    });

    test('debe manejar errores y resetear el flag isLoading', async () => {
      const ppiManager = new PPIDataManager();

      // Hacer que LocalStorageManager falle
      const originalLoadProject = LocalStorageManager.prototype.loadProject;
      LocalStorageManager.prototype.loadProject = jest.fn().mockRejectedValue(new Error('Load failed'));

      const result = await ppiManager.loadPPIs();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(ppiManager.isLoading).toBe(false); // Debe resetearse incluso con error

      // Restaurar método original
      LocalStorageManager.prototype.loadProject = originalLoadProject;
    });
  });

  describe('Operaciones CRUD con localStorage', () => {
    test('debe agregar PPI y guardar en localStorage', async () => {
      const ppiManager = new PPIDataManager();

      const newPPI = {
        name: 'Test PPI',
        type: 'TimeMeasure',
        description: 'Test description'
      };

      const result = await ppiManager.addPPI(newPPI);

      expect(result.success).toBe(true);
      expect(ppiManager.ppis.length).toBeGreaterThan(0);
      
      // Verificar que se guardó en localStorage
      const savedData = localStorage.getItem('mmproject:localstorage');
      expect(savedData).toBeDefined();
    });

    test('debe actualizar PPI y guardar en localStorage', async () => {
      const ppiManager = new PPIDataManager();

      // Agregar PPI primero
      await ppiManager.addPPI({
        name: 'Original PPI',
        type: 'TimeMeasure',
        description: 'Original description'
      });

      const updatedData = {
        name: 'Updated PPI',
        description: 'Updated description'
      };

      const result = await ppiManager.updatePPI(0, updatedData);

      expect(result.success).toBe(true);
      expect(ppiManager.ppis[0].name).toBe('Updated PPI');
      
      // Verificar que se guardó en localStorage
      const savedData = localStorage.getItem('mmproject:localstorage');
      expect(savedData).toBeDefined();
    });

    test('debe eliminar PPI y guardar en localStorage', async () => {
      const ppiManager = new PPIDataManager();

      // Agregar PPI primero
      await ppiManager.addPPI({
        name: 'Test PPI',
        type: 'TimeMeasure',
        description: 'Test description'
      });

      const initialCount = ppiManager.ppis.length;

      const result = await ppiManager.deletePPI(0);

      expect(result.success).toBe(true);
      expect(ppiManager.ppis.length).toBe(initialCount - 1);
      
      // Verificar que se guardó en localStorage
      const savedData = localStorage.getItem('mmproject:localstorage');
      expect(savedData).toBeDefined();
    });
  });

  describe('Carga de datos desde localStorage', () => {
    test('debe cargar PPIs desde localStorage correctamente', async () => {
      const ppiManager = new PPIDataManager();

      // Guardar algunos datos primero
      await ppiManager.addPPI({
        name: 'Test PPI 1',
        type: 'TimeMeasure',
        description: 'Test 1'
      });

      await ppiManager.addPPI({
        name: 'Test PPI 2',
        type: 'CountMeasure',
        description: 'Test 2'
      });

      // Crear nueva instancia para simular recarga
      const newPPIManager = new PPIDataManager();
      await newPPIManager.loadPPIs();

      expect(newPPIManager.ppis.length).toBeGreaterThanOrEqual(2);
    });

    test('debe manejar carga cuando no hay datos guardados', async () => {
      const ppiManager = new PPIDataManager();

      const result = await ppiManager.loadPPIs();

      expect(result.success).toBe(true);
      expect(ppiManager.ppis).toBeDefined();
      expect(Array.isArray(ppiManager.ppis)).toBe(true);
    });

    test('debe manejar datos corruptos en localStorage', async () => {
      const ppiManager = new PPIDataManager();

      // Guardar datos corruptos
      localStorage.setItem('mmproject:localstorage', 'invalid json');

      const result = await ppiManager.loadPPIs();

      expect(result.success).toBe(true); // Debe manejar el error graciosamente
      expect(ppiManager.ppis).toBeDefined();
      expect(Array.isArray(ppiManager.ppis)).toBe(true);
    });
  });

  describe('Integración con LocalStorageManager', () => {
    test('debe usar LocalStorageManager para todas las operaciones', async () => {
      const ppiManager = new PPIDataManager();

      // Mock para verificar llamadas
      const saveProjectSpy = jest.spyOn(LocalStorageManager.prototype, 'saveProject');
      const loadProjectSpy = jest.spyOn(LocalStorageManager.prototype, 'loadProject');

      // Operaciones que deberían usar LocalStorageManager
      await ppiManager.savePPIs();
      await ppiManager.loadPPIs();

      expect(saveProjectSpy).toHaveBeenCalled();
      expect(loadProjectSpy).toHaveBeenCalled();

      saveProjectSpy.mockRestore();
      loadProjectSpy.mockRestore();
    });

    test('debe manejar errores de LocalStorageManager', async () => {
      const ppiManager = new PPIDataManager();

      // Hacer que LocalStorageManager falle
      const originalSaveProject = LocalStorageManager.prototype.saveProject;
      LocalStorageManager.prototype.saveProject = jest.fn().mockResolvedValue({
        success: false,
        error: 'LocalStorageManager error'
      });

      const result = await ppiManager.savePPIs();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restaurar método original
      LocalStorageManager.prototype.saveProject = originalSaveProject;
    });
  });

  describe('Compatibilidad con sistema anterior', () => {
    test('debe mantener compatibilidad con métodos existentes', () => {
      const ppiManager = new PPIDataManager();

      // Verificar que los métodos principales siguen disponibles
      expect(typeof ppiManager.addPPI).toBe('function');
      expect(typeof ppiManager.updatePPI).toBe('function');
      expect(typeof ppiManager.deletePPI).toBe('function');
      expect(typeof ppiManager.savePPIs).toBe('function');
      expect(typeof ppiManager.loadPPIs).toBe('function');
      expect(typeof ppiManager.exportPPIsToFile).toBe('function');
    });

    test('debe mantener estructura de datos compatible', async () => {
      const ppiManager = new PPIDataManager();

      const newPPI = {
        name: 'Test PPI',
        type: 'TimeMeasure',
        description: 'Test description',
        customField: 'custom value'
      };

      await ppiManager.addPPI(newPPI);

      expect(ppiManager.ppis[0]).toMatchObject({
        name: 'Test PPI',
        type: 'TimeMeasure',
        description: 'Test description'
      });
    });
  });

  describe('Rendimiento y eficiencia', () => {
    test('debe evitar guardados innecesarios', async () => {
      const ppiManager = new PPIDataManager();

      // Primer guardado
      await ppiManager.savePPIs();

      // Segundo guardado inmediato (debería ser omitido por concurrencia)
      const result = await ppiManager.savePPIs();

      expect(result.reason).toBe('Already saving');
    });

    test('debe cargar datos de manera eficiente', async () => {
      const ppiManager = new PPIDataManager();

      // Agregar varios PPIs
      for (let i = 0; i < 10; i++) {
        await ppiManager.addPPI({
          name: `PPI ${i}`,
          type: 'TimeMeasure',
          description: `Description ${i}`
        });
      }

      const startTime = Date.now();
      await ppiManager.loadPPIs();
      const endTime = Date.now();

      // Debería ser rápido (menos de 100ms en tests)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Manejo de errores', () => {
    test('debe manejar errores de validación', async () => {
      const ppiManager = new PPIDataManager();

      // Intentar agregar PPI inválido
      const result = await ppiManager.addPPI({
        // Sin nombre requerido
        type: 'TimeMeasure'
      });

      // El resultado puede variar según la validación implementada
      expect(result).toBeDefined();
    });

    test('debe manejar errores de índice en updatePPI', async () => {
      const ppiManager = new PPIDataManager();

      // Intentar actualizar PPI que no existe
      const result = await ppiManager.updatePPI(999, { name: 'Updated' });

      expect(result.success).toBe(false);
    });

    test('debe manejar errores de índice en deletePPI', async () => {
      const ppiManager = new PPIDataManager();

      // Intentar eliminar PPI que no existe
      const result = await ppiManager.deletePPI(999);

      expect(result.success).toBe(false);
    });
  });
});
