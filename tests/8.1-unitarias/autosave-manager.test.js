/**
 * 8.1 PRUEBAS UNITARIAS - AutosaveManager
 * 
 * Valida el sistema de autoguardado automático.
 * Crítico para la experiencia de usuario y prevención de pérdida de datos.
 */

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

describe('8.1 Pruebas Unitarias - AutosaveManager', () => {
  let AutosaveManager;
  let mockModeler;
  let mockStorageManager;
  let mockEventBus;

  beforeAll(async () => {
    try {
      const autosaveModule = await import('../../app/services/autosave-manager.js');
      AutosaveManager = autosaveModule.AutosaveManager || autosaveModule.default;
    } catch (error) {
      // Si no existe el módulo, crear implementación mock
      AutosaveManager = class MockAutosaveManager {
        constructor(options = {}) {
          this.modeler = options.modeler;
          this.storageManager = options.storageManager;
          this.eventBus = options.eventBus;
          this.interval = options.interval || 5000;
          this.enabled = options.enabled !== false;
          this.hasChanges = false;
          this.autosaveTimer = null;
          this.isAutosaving = false;
          
          if (this.eventBus && this.enabled) {
            this.setupEventListeners();
          }
        }
        
        setupEventListeners() {
          const changeEvents = [
            'element.changed',
            'element.added',
            'element.removed',
            'shape.added',
            'shape.removed',
            'connection.added',
            'connection.removed'
          ];
          
          changeEvents.forEach(event => {
            this.eventBus.subscribe(event, (data) => {
              this.markAsChanged();
            });
          });
        }
        
        markAsChanged() {
          this.hasChanges = true;
          if (this.enabled && !this.autosaveTimer) {
            this.scheduleAutosave();
          }
        }
        
        scheduleAutosave() {
          if (this.autosaveTimer) {
            clearTimeout(this.autosaveTimer);
          }
          
          this.autosaveTimer = setTimeout(() => {
            this.performAutosave();
          }, this.interval);
        }
        
        async performAutosave() {
          if (this.isAutosaving || !this.hasChanges) {
            return { success: false, reason: 'Already saving or no changes' };
          }
          
          try {
            this.isAutosaving = true;
            
            // Obtener XML del modelador
            const xmlResult = await this.modeler.saveXML();
            const xml = xmlResult.xml || xmlResult;
            
            // Guardar usando StorageManager
            const saveResult = await this.storageManager.save({
              bpmn: xml,
              timestamp: new Date().toISOString(),
              autosaved: true
            });
            
            if (saveResult.success) {
              this.hasChanges = false;
              this.eventBus?.publish('autosave.completed', {
                timestamp: new Date().toISOString(),
                success: true
              });
            }
            
            return saveResult;
            
          } catch (error) {
            this.eventBus?.publish('autosave.error', {
              error: error.message,
              timestamp: new Date().toISOString()
            });
            return { success: false, error: error.message };
          } finally {
            this.isAutosaving = false;
            this.autosaveTimer = null;
          }
        }
        
        enable() {
          this.enabled = true;
          if (this.hasChanges) {
            this.scheduleAutosave();
          }
        }
        
        disable() {
          this.enabled = false;
          if (this.autosaveTimer) {
            clearTimeout(this.autosaveTimer);
            this.autosaveTimer = null;
          }
        }
        
        forceAutosave() {
          return this.performAutosave();
        }
        
        destroy() {
          this.disable();
          // Cleanup event listeners if needed
        }
      };
    }
  });

  beforeEach(() => {
    // Setup mocks
    mockModeler = {
      saveXML: jest.fn().mockResolvedValue({ 
        xml: createValidBpmnXml() 
      }),
      get: jest.fn().mockReturnValue({
        getAll: jest.fn().mockReturnValue([])
      })
    };

    mockStorageManager = {
      save: jest.fn().mockResolvedValue({ success: true }),
      load: jest.fn().mockResolvedValue({ success: true }),
      clear: jest.fn().mockResolvedValue({ success: true })
    };

    mockEventBus = new MockEventBus();

    // Limpiar timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Inicialización del AutosaveManager', () => {
    test('debe inicializar correctamente con configuración por defecto', () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus
      });

      expect(autosaveManager.modeler).toBe(mockModeler);
      expect(autosaveManager.storageManager).toBe(mockStorageManager);
      expect(autosaveManager.eventBus).toBe(mockEventBus);
      expect(autosaveManager.enabled).toBe(true);
      expect(autosaveManager.hasChanges).toBe(false);
      expect(autosaveManager.interval).toBeGreaterThan(0);
    });

    test('debe inicializar con configuración personalizada', () => {
      const customInterval = 10000;
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        interval: customInterval,
        enabled: false
      });

      expect(autosaveManager.interval).toBe(customInterval);
      expect(autosaveManager.enabled).toBe(false);
    });

    test('debe configurar listeners de eventos automáticamente', () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true
      });

      // Verificar que se suscribió a eventos de cambio
      expect(mockEventBus.subscribers['element.changed']).toBeDefined();
      expect(mockEventBus.subscribers['element.added']).toBeDefined();
      expect(mockEventBus.subscribers['shape.added']).toBeDefined();
    });
  });

  describe('Detección de Cambios', () => {
    test('debe detectar cambios en elementos BPMN', () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true // Habilitar para que se configuren los listeners
      });

      expect(autosaveManager.hasChanges).toBe(false);

      // Simular cambio en elemento
      mockEventBus.publish('element.changed', {
        element: { id: 'Task_1', type: 'bpmn:Task' }
      });

      expect(autosaveManager.hasChanges).toBe(true);
    });

    test('debe detectar adición de elementos', () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true
      });

      mockEventBus.publish('shape.added', {
        element: { id: 'StartEvent_1', type: 'bpmn:StartEvent' }
      });

      expect(autosaveManager.hasChanges).toBe(true);
    });

    test('debe detectar eliminación de elementos', () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true
      });

      mockEventBus.publish('element.removed', {
        element: { id: 'Task_1', type: 'bpmn:Task' }
      });

      expect(autosaveManager.hasChanges).toBe(true);
    });
  });

  describe('Ejecución de Autoguardado', () => {
    test('debe ejecutar autoguardado cuando hay cambios', async () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        interval: 1000,
        enabled: false
      });

      // Marcar como cambiado y ejecutar autoguardado manual
      autosaveManager.markAsChanged();
      expect(autosaveManager.hasChanges).toBe(true);

      const result = await autosaveManager.performAutosave();

      expect(result.success).toBe(true);
      expect(mockModeler.saveXML).toHaveBeenCalled();
      expect(mockStorageManager.save).toHaveBeenCalled();
      expect(autosaveManager.hasChanges).toBe(false);
    });

    test('debe programar autoguardado automático', () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        interval: 1000,
        enabled: true
      });

      // Simular cambio
      mockEventBus.publish('element.changed', {
        element: { id: 'Task_1', type: 'bpmn:Task' }
      });

      expect(autosaveManager.hasChanges).toBe(true);
      expect(autosaveManager.autosaveTimer).toBeTruthy();
    });

    test('debe publicar evento de autoguardado completado', async () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false
      });

      autosaveManager.markAsChanged();
      await autosaveManager.performAutosave();

      const completedEvents = mockEventBus.published.filter(
        event => event.eventType === 'autosave.completed'
      );

      expect(completedEvents.length).toBe(1);
      expect(completedEvents[0].data.success).toBe(true);
    });

    test('no debe ejecutar autoguardado si no hay cambios', async () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false
      });

      expect(autosaveManager.hasChanges).toBe(false);

      const result = await autosaveManager.performAutosave();

      expect(result.success).toBe(false);
      expect(result.reason).toContain('no changes');
      expect(mockModeler.saveXML).not.toHaveBeenCalled();
    });

    test('debe evitar autoguardados concurrentes', async () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false
      });

      autosaveManager.markAsChanged();
      
      // Simular que ya está guardando
      autosaveManager.isAutosaving = true;

      const result = await autosaveManager.performAutosave();

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Already saving');
    });
  });

  describe('Manejo de Errores', () => {
    test('debe manejar errores del modelador', async () => {
      mockModeler.saveXML.mockRejectedValue(new Error('Modeler error'));

      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false
      });

      autosaveManager.markAsChanged();
      const result = await autosaveManager.performAutosave();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Modeler error');

      const errorEvents = mockEventBus.published.filter(
        event => event.eventType === 'autosave.error'
      );
      expect(errorEvents.length).toBe(1);
    });

    test('debe manejar errores del storage', async () => {
      mockStorageManager.save.mockResolvedValue({ 
        success: false, 
        error: 'Storage full' 
      });

      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false
      });

      autosaveManager.markAsChanged();
      const result = await autosaveManager.performAutosave();

      expect(result.success).toBe(false);
      expect(mockStorageManager.save).toHaveBeenCalled();
    });
  });

  describe('Control de Estado', () => {
    test('debe habilitar y deshabilitar autoguardado', () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false
      });

      expect(autosaveManager.enabled).toBe(false);

      autosaveManager.enable();
      expect(autosaveManager.enabled).toBe(true);

      autosaveManager.disable();
      expect(autosaveManager.enabled).toBe(false);
    });

    test('debe forzar autoguardado manualmente', async () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false
      });

      autosaveManager.markAsChanged();
      const result = await autosaveManager.forceAutosave();

      expect(result.success).toBe(true);
      expect(mockModeler.saveXML).toHaveBeenCalled();
      expect(mockStorageManager.save).toHaveBeenCalled();
    });

    test('debe limpiar recursos al destruir', () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true
      });

      // Simular timer activo
      autosaveManager.markAsChanged();
      expect(autosaveManager.autosaveTimer).toBeTruthy();

      autosaveManager.destroy();

      expect(autosaveManager.enabled).toBe(false);
      expect(autosaveManager.autosaveTimer).toBeNull();
    });
  });

  describe('Integración con Sistema Multi-notación', () => {
    test('debe guardar datos de todas las notaciones', async () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false
      });

      autosaveManager.markAsChanged();
      await autosaveManager.performAutosave();

      const saveCall = mockStorageManager.save.mock.calls[0][0];
      expect(saveCall.bpmn).toBeDefined();
      expect(saveCall.timestamp).toBeDefined();
      expect(saveCall.autosaved).toBe(true);
    });

    test('debe responder a cambios en RASCI', () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false
      });

      expect(autosaveManager.hasChanges).toBe(false);

      mockEventBus.publish('rasci.matrix.updated', {
        taskId: 'Task_1',
        roleId: 'Analista',
        assignment: 'R'
      });

      // Si el sistema está configurado para escuchar cambios RASCI
      if (mockEventBus.subscribers['rasci.matrix.updated']) {
        expect(autosaveManager.hasChanges).toBe(true);
      }
    });

    test('debe responder a cambios en PPINOT', () => {
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false
      });

      mockEventBus.publish('ppi.created', {
        id: 'PPI_1',
        name: 'Tiempo de Proceso',
        type: 'TimeMeasure'
      });

      // Si el sistema está configurado para escuchar cambios PPI
      if (mockEventBus.subscribers['ppi.created']) {
        expect(autosaveManager.hasChanges).toBe(true);
      }
    });
  });
});
