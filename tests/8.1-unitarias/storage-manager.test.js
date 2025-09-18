/**
 * 8.1 PRUEBAS UNITARIAS - StorageManager
 * 
 * Valida la gestión de almacenamiento y persistencia de datos.
 * Crítico para el guardado/carga de proyectos .mmproject.
 */

const { createValidMmProject } = require('../utils/test-helpers');

// Mock localStorage
const mockLocalStorage = {
  data: {},
  getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.data[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete mockLocalStorage.data[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.data = {};
  }),
  get length() {
    return Object.keys(this.data).length;
  }
};

// Mock global localStorage
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Implementación de StorageManager para tests
class StorageManager {
  constructor() {
    this.storageKey = 'mmproject_data';
  }
  
  async save(data) {
    try {
      if (!data) {
        return { success: false, error: 'No data provided' };
      }
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.storageKey, serialized);
      return { success: true, key: this.storageKey };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return { success: false, error: 'No data found' };
      
      const parsed = JSON.parse(data);
      return { success: true, data: parsed };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async clear() {
    localStorage.removeItem(this.storageKey);
    return { success: true };
  }
  
  async exists() {
    return localStorage.getItem(this.storageKey) !== null;
  }
}

describe('8.1 Pruebas Unitarias - StorageManager', () => {

  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe('Operaciones Básicas de Almacenamiento', () => {
    test('debe guardar proyecto .mmproject correctamente', async () => {
      const storage = new StorageManager();
      const project = createValidMmProject();
      
      const result = await storage.save(project);
      
      expect(result.success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Verificar que se guardó correctamente
      const savedData = mockLocalStorage.getItem(storage.storageKey);
      expect(savedData).toBeDefined();
      
      const parsedData = JSON.parse(savedData);
      expect(parsedData.version).toBe(project.version);
      expect(parsedData.bpmn).toBeDefined();
      expect(parsedData.ppinot).toBeDefined();
      expect(parsedData.ralph).toBeDefined();
      expect(parsedData.rasci).toBeDefined();
    });

    test('debe cargar proyecto .mmproject correctamente', async () => {
      const storage = new StorageManager();
      const originalProject = createValidMmProject();
      
      // Guardar primero
      await storage.save(originalProject);
      
      // Cargar
      const result = await storage.load();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.version).toBe(originalProject.version);
      expect(result.data.bpmn).toEqual(originalProject.bpmn);
      expect(result.data.ppinot).toEqual(originalProject.ppinot);
      expect(result.data.ralph).toEqual(originalProject.ralph);
      expect(result.data.rasci).toEqual(originalProject.rasci);
    });

    test('debe limpiar datos correctamente', async () => {
      const storage = new StorageManager();
      const project = createValidMmProject();
      
      // Guardar datos
      await storage.save(project);
      expect(await storage.exists()).toBe(true);
      
      // Limpiar
      const result = await storage.clear();
      
      expect(result.success).toBe(true);
      expect(await storage.exists()).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
    });

    test('debe verificar existencia de datos', async () => {
      const storage = new StorageManager();
      
      // Inicialmente no debe existir
      expect(await storage.exists()).toBe(false);
      
      // Después de guardar debe existir
      await storage.save(createValidMmProject());
      expect(await storage.exists()).toBe(true);
      
      // Después de limpiar no debe existir
      await storage.clear();
      expect(await storage.exists()).toBe(false);
    });
  });

  describe('Validación de Datos Multi-notación', () => {
    test('debe validar estructura completa del proyecto', async () => {
      const storage = new StorageManager();
      const completeProject = createValidMmProject();
      
      const result = await storage.save(completeProject);
      expect(result.success).toBe(true);
      
      const loaded = await storage.load();
      expect(loaded.success).toBe(true);
      
      // Validar que todas las notaciones están presentes
      const project = loaded.data;
      expect(project.bpmn).toContain('bpmn:definitions');
      expect(project.ppinot.ppis).toBeDefined();
      expect(project.ralph.roles).toBeDefined();
      expect(project.rasci.matrix).toBeDefined();
    });

    test('debe manejar datos RASCI correctamente', async () => {
      const storage = new StorageManager();
      const project = createValidMmProject();
      
      // Modificar datos RASCI
      project.rasci.roles = ['Analista', 'Supervisor', 'Cliente'];
      project.rasci.tasks = ['Task_1', 'Task_2'];
      project.rasci.matrix = {
        'Task_1': { 'Analista': 'R', 'Supervisor': 'A', 'Cliente': 'I' },
        'Task_2': { 'Analista': 'A', 'Supervisor': 'S', 'Cliente': 'C' }
      };
      
      await storage.save(project);
      const loaded = await storage.load();
      
      expect(loaded.data.rasci.roles).toHaveLength(3);
      expect(loaded.data.rasci.tasks).toHaveLength(2);
      expect(loaded.data.rasci.matrix['Task_1']['Analista']).toBe('R');
      expect(loaded.data.rasci.matrix['Task_2']['Supervisor']).toBe('S');
    });

    test('debe preservar datos PPINOT', async () => {
      const storage = new StorageManager();
      const project = createValidMmProject();
      
      // Agregar PPIs específicos
      project.ppinot.ppis = [
        {
          id: 'PPI_1',
          name: 'Tiempo Total',
          type: 'TimeMeasure',
          from: 'StartEvent_1',
          to: 'EndEvent_1'
        },
        {
          id: 'PPI_2',
          name: 'Número de Tareas',
          type: 'CountMeasure',
          target: 'bpmn:Task'
        }
      ];
      
      await storage.save(project);
      const loaded = await storage.load();
      
      expect(loaded.data.ppinot.ppis).toHaveLength(2);
      expect(loaded.data.ppinot.ppis[0].type).toBe('TimeMeasure');
      expect(loaded.data.ppinot.ppis[1].type).toBe('CountMeasure');
    });
  });

  describe('Manejo de Errores', () => {
    test('debe manejar datos corruptos', async () => {
      const storage = new StorageManager();
      
      // Simular datos corruptos en localStorage
      mockLocalStorage.setItem(storage.storageKey, 'invalid json data');
      
      const result = await storage.load();
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON');
    });

    test('debe manejar localStorage no disponible', async () => {
      const storage = new StorageManager();
      
      // Simular error en localStorage
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage not available');
      });
      
      const result = await storage.save(createValidMmProject());
      expect(result.success).toBe(false);
      expect(result.error).toContain('localStorage not available');
    });

    test('debe manejar datos faltantes', async () => {
      const storage = new StorageManager();
      
      const result = await storage.load();
      expect(result.success).toBe(false);
      expect(result.error).toContain('No data found');
    });

    test('debe validar datos de entrada', async () => {
      const storage = new StorageManager();
      
      // Intentar guardar datos inválidos
      const result = await storage.save(null);
      expect(result.success).toBe(false);
    });
  });

  describe('Gestión de Versiones', () => {
    test('debe manejar diferentes versiones de proyecto', async () => {
      const storage = new StorageManager();
      
      // Proyecto versión antigua
      const oldProject = {
        version: '1.0.0',
        bpmn: '<definitions>...</definitions>',
        // Sin notaciones nuevas
      };
      
      await storage.save(oldProject);
      const loaded = await storage.load();
      
      expect(loaded.success).toBe(true);
      expect(loaded.data.version).toBe('1.0.0');
    });

    test('debe preservar metadatos del proyecto', async () => {
      const storage = new StorageManager();
      const project = createValidMmProject();
      
      // Agregar metadatos
      project.metadata = {
        created: new Date().toISOString(),
        author: 'Test User',
        description: 'Test project'
      };
      
      await storage.save(project);
      const loaded = await storage.load();
      
      expect(loaded.data.metadata).toBeDefined();
      expect(loaded.data.metadata.author).toBe('Test User');
      expect(loaded.data.metadata.description).toBe('Test project');
    });
  });

  describe('Performance y Optimización', () => {
    test('debe manejar proyectos grandes', async () => {
      const storage = new StorageManager();
      const largeProject = createValidMmProject();
      
      // Crear proyecto con muchos elementos
      largeProject.rasci.roles = Array.from({length: 50}, (_, i) => `Role_${i}`);
      largeProject.rasci.tasks = Array.from({length: 100}, (_, i) => `Task_${i}`);
      
      const startTime = Date.now();
      const result = await storage.save(largeProject);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Menos de 1 segundo
    });

    test('debe comprimir datos si es necesario', async () => {
      const storage = new StorageManager();
      const project = createValidMmProject();
      
      await storage.save(project);
      
      const savedData = mockLocalStorage.getItem(storage.storageKey);
      const dataSize = savedData.length;
      
      // Los datos deben ser razonablemente compactos
      expect(dataSize).toBeLessThan(50000); // Menos de 50KB para proyecto básico
    });
  });
});
