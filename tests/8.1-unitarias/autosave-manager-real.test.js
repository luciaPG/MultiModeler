/**
 * 8.1 PRUEBAS UNITARIAS REALES - AutosaveManager
 * 
 * Tests que validan AutosaveManager REAL sin fallbacks.
 * Si AutosaveManager no existe o está roto, los tests DEBEN fallar.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

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

describe('8.1 AutosaveManager - Código Real Sin Fallbacks', () => {
  let mockModeler;
  let mockStorageManager;
  let mockEventBus;

  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();

    // MOCKS ÚTILES: Dependencias pesadas/externas
    mockModeler = {
      saveXML: jest.fn().mockResolvedValue({
        xml: '<bpmn:definitions><bpmn:process><bpmn:task id="Task_1"/></bpmn:process></bpmn:definitions>'
      }),
      get: jest.fn((service) => {
        if (service === 'elementRegistry') {
          return { getAll: jest.fn().mockReturnValue([]) };
        }
        return {};
      })
    };

    mockStorageManager = {
      save: jest.fn().mockResolvedValue({ success: true }),
      load: jest.fn().mockResolvedValue({ success: true }),
      clear: jest.fn().mockResolvedValue({ success: true })
    };

    mockEventBus = {
      subscribe: jest.fn(),
      publish: jest.fn(),
      unsubscribe: jest.fn()
    };
  });

  describe('REAL: Importación y Existencia', () => {
    test('debe importar AutosaveManager real o fallar claramente', async () => {
      // WHEN: Importar AutosaveManager real - SIN try/catch que oculte problemas
      const autosaveModule = await import('../../app/modules/ui/managers/localstorage-autosave-manager.js');
      
      // THEN: LocalStorageAutoSaveManager real debe existir
      expect(autosaveModule.LocalStorageAutoSaveManager).toBeDefined();
      expect(typeof autosaveModule.LocalStorageAutoSaveManager).toBe('function');
      
      // NO fallback MockAutosaveManager - si falla aquí, AutosaveManager no existe
    });

    test('debe instanciar AutosaveManager real correctamente', async () => {
      // GIVEN: AutosaveManager real
      const autosaveModule = await import('../../app/services/autosave-manager.js');
      const RealAutosaveManager = autosaveModule.AutosaveManager;
      
      // WHEN: Crear instancia real
      const autosaveManager = new RealAutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true
      });

      // THEN: Instancia real debe tener propiedades correctas
      expect(autosaveManager).toBeDefined();
      expect(autosaveManager.modeler).toBe(mockModeler);
      expect(autosaveManager.storageManager).toBe(mockStorageManager);
      expect(autosaveManager.eventBus).toBe(mockEventBus);
      expect(autosaveManager.enabled).toBe(true);
      
      // Verificar métodos reales
      expect(typeof autosaveManager.performAutosave).toBe('function');
      expect(typeof autosaveManager.markAsChanged).toBe('function');
      expect(typeof autosaveManager.scheduleAutosave).toBe('function');
    });
  });

  describe('REAL: Funcionalidad de Autoguardado', () => {
    test('debe detectar cambios reales usando AutosaveManager real', async () => {
      // GIVEN: AutosaveManager real
      const autosaveModule = await import('../../app/services/autosave-manager.js');
      const RealAutosaveManager = autosaveModule.AutosaveManager;
      
      const autosaveManager = new RealAutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true
      });

      // WHEN: Marcar cambios usando método real
      autosaveManager.markAsChanged();

      // THEN: AutosaveManager real debe detectar cambios
      expect(autosaveManager.hasChanges).toBe(true);
      
      // NO expect(true).toBe(true) - validamos comportamiento real
    });

    test('debe ejecutar autoguardado real', async () => {
      // GIVEN: AutosaveManager real
      const autosaveModule = await import('../../app/services/autosave-manager.js');
      const RealAutosaveManager = autosaveModule.AutosaveManager;
      
      const autosaveManager = new RealAutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true
      });

      // WHEN: Simular cambios y ejecutar autoguardado real
      autosaveManager.markAsChanged();
      const result = await autosaveManager.performAutosave();

      // THEN: AutosaveManager real debe guardar
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockModeler.saveXML).toHaveBeenCalled();
      expect(mockStorageManager.save).toHaveBeenCalled();
      
      // Verificar que se publicó evento real
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'autosave.completed',
        expect.objectContaining({ success: true })
      );
    });

    test('debe manejar errores reales durante autoguardado', async () => {
      // GIVEN: AutosaveManager real con StorageManager que falla
      const autosaveModule = await import('../../app/services/autosave-manager.js');
      const RealAutosaveManager = autosaveModule.AutosaveManager;
      
      const failingStorageManager = {
        save: jest.fn().mockRejectedValue(new Error('Storage failed'))
      };

      const autosaveManager = new RealAutosaveManager({
        modeler: mockModeler,
        storageManager: failingStorageManager,
        eventBus: mockEventBus,
        enabled: true
      });

      // WHEN: Intentar autoguardado con error
      autosaveManager.markAsChanged();
      const result = await autosaveManager.performAutosave();

      // THEN: AutosaveManager real debe manejar error
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Storage failed');
      
      // Verificar que se publicó evento de error real
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'autosave.completed',
        expect.objectContaining({ 
          success: false,
          error: expect.any(Error)
        })
      );
    });
  });

  describe('REAL: Configuración y Estado', () => {
    test('debe habilitar/deshabilitar autoguardado usando código real', async () => {
      // GIVEN: AutosaveManager real
      const autosaveModule = await import('../../app/services/autosave-manager.js');
      const RealAutosaveManager = autosaveModule.AutosaveManager;
      
      const autosaveManager = new RealAutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: false // Inicialmente deshabilitado
      });

      // WHEN: Habilitar usando método real
      expect(autosaveManager.enabled).toBe(false);
      
      autosaveManager.enable();
      expect(autosaveManager.enabled).toBe(true);
      
      // WHEN: Deshabilitar usando método real
      autosaveManager.disable();
      expect(autosaveManager.enabled).toBe(false);
      
      // THEN: Estado real debe cambiar correctamente
      // NO fallback que siempre pase
    });

    test('debe limpiar recursos reales al destruir', async () => {
      // GIVEN: AutosaveManager real con timer activo
      const autosaveModule = await import('../../app/services/autosave-manager.js');
      const RealAutosaveManager = autosaveModule.AutosaveManager;
      
      const autosaveManager = new RealAutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true,
        interval: 1000
      });

      // WHEN: Programar autoguardado y luego destruir
      autosaveManager.markAsChanged();
      autosaveManager.scheduleAutosave();
      
      // Verificar que timer está activo
      expect(autosaveManager.autosaveTimer).toBeDefined();
      
      // WHEN: Destruir usando método real
      autosaveManager.destroy();

      // THEN: Recursos reales deben limpiarse
      expect(autosaveManager.autosaveTimer).toBeNull();
      expect(autosaveManager.enabled).toBe(false);
      
      // NO expect(true).toBe(true) - validamos limpieza real
    });
  });

  describe('REAL: Integración con Sistema Multi-notación', () => {
    test('debe responder a eventos reales del sistema', async () => {
      // GIVEN: AutosaveManager real
      const autosaveModule = await import('../../app/services/autosave-manager.js');
      const RealAutosaveManager = autosaveModule.AutosaveManager;
      
      const autosaveManager = new RealAutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true
      });

      // WHEN: Simular eventos reales del sistema multi-notación
      const realEvents = [
        'bpmn.element.changed',
        'ppinot.ppi.added',
        'rasci.matrix.updated',
        'ralph.role.modified'
      ];

      // Verificar que AutosaveManager real responde a eventos específicos
      expect(mockEventBus.subscribe).toHaveBeenCalled();
      
      // Obtener los eventos suscritos realmente
      const subscribedEvents = mockEventBus.subscribe.mock.calls.map(call => call[0]);
      
      // THEN: Debe suscribirse a eventos relevantes
      expect(subscribedEvents.length).toBeGreaterThan(0);
      
      // Verificar que incluye eventos de cambio
      const hasChangeEvents = subscribedEvents.some(event => 
        event.includes('element') || event.includes('changed') || event.includes('added')
      );
      expect(hasChangeEvents).toBe(true);
    });
  });

  describe('REAL: Problemas Específicos del Sistema', () => {
    test('debe reproducir problema real de autoguardado concurrente', async () => {
      // GIVEN: AutosaveManager real
      const autosaveModule = await import('../../app/services/autosave-manager.js');
      const RealAutosaveManager = autosaveModule.AutosaveManager;
      
      const autosaveManager = new RealAutosaveManager({
        modeler: mockModeler,
        storageManager: mockStorageManager,
        eventBus: mockEventBus,
        enabled: true
      });

      // WHEN: Ejecutar múltiples autoguardados concurrentes
      autosaveManager.markAsChanged();
      
      const savePromise1 = autosaveManager.performAutosave();
      const savePromise2 = autosaveManager.performAutosave();
      const savePromise3 = autosaveManager.performAutosave();

      const results = await Promise.all([savePromise1, savePromise2, savePromise3]);

      // THEN: Solo uno debe ejecutarse, otros deben rechazarse
      const successfulSaves = results.filter(r => r.success === true);
      const rejectedSaves = results.filter(r => r.success === false);

      expect(successfulSaves.length).toBe(1);
      expect(rejectedSaves.length).toBe(2);
      
      // Verificar razón específica del rechazo
      expect(rejectedSaves[0].reason).toContain('Already saving');
      
      console.log(`PROBLEMA CONCURRENCIA DETECTADO: ${rejectedSaves.length} autoguardados rechazados correctamente`);
    });
  });
});
