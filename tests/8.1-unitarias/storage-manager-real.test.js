/**
 * 8.1 PRUEBAS UNITARIAS - StorageManager REAL
 *
 * Valida la gestión de almacenamiento usando la implementación real con sus
 * dependencias interceptadas mediante mocks controlables.
 */

// Configurar localStorage para usar StorageManager real
require('../utils/ensure-localstorage.js');

// Interceptar dependencias críticas del StorageManager
jest.mock('../../app/services/global-access.js', () => ({
  resolve: jest.fn()
}));

jest.mock('../../app/modules/rasci/store.js', () => ({
  RasciStore: {
    setRoles: jest.fn(),
    setMatrix: jest.fn()
  }
}));

jest.mock('../../app/modules/rasci/core/matrix-manager.js', () => ({
  forceReloadMatrix: jest.fn(),
  renderMatrix: jest.fn()
}));

jest.mock('../../app/modules/ui/core/ServiceRegistry.js', () => {
  const services = new Map();
  const functions = new Map();

  const registry = {};

  registry.register = jest.fn((name, service, options) => {
    services.set(name, { service, options });
  });
  registry.registerFunction = jest.fn((name, fn) => {
    functions.set(name, fn);
  });
  registry.get = jest.fn((name) => services.get(name)?.service);
  registry.has = jest.fn((name) => services.has(name));
  registry.call = jest.fn((name, ...args) => {
    if (!functions.has(name)) {
      throw new Error(`Function not found: ${name}`);
    }
    return functions.get(name)(...args);
  });
  registry.executeFunction = jest.fn((name, ...args) => registry.call(name, ...args));
  registry.clear = jest.fn(() => {
    services.clear();
    functions.clear();
  });

  const reset = () => {
    services.clear();
    functions.clear();
    registry.register.mockClear();
    registry.registerFunction.mockClear();
    registry.get.mockClear();
    registry.has.mockClear();
    registry.call.mockClear();
    registry.executeFunction.mockClear();
    registry.clear.mockClear();
  };

  const getSnapshots = () => ({
    services,
    functions
  });

  const getServiceRegistry = jest.fn(() => registry);

  return {
    getServiceRegistry,
    ServiceRegistry: jest.fn(() => registry),
    __mockRegistry: registry,
    __resetRegistry: reset,
    __getSnapshots: getSnapshots
  };
});

const { resolve } = require('../../app/services/global-access.js');
const { RasciStore } = require('../../app/modules/rasci/store.js');
const matrixManager = require('../../app/modules/rasci/core/matrix-manager.js');
const serviceRegistryModule = require('../../app/modules/ui/core/ServiceRegistry.js');

let StorageManager;

describe('8.1 Pruebas Unitarias - StorageManager REAL', () => {
  const serviceMap = new Map();
  let storageManager;

  const mockPpiManager = () => ({
    core: {
      ppis: ['ppi'],
      filteredPPIs: ['filtered'],
      processedElements: new Set(['element'])
    },
    refreshPPIList: jest.fn()
  });

  const mockModeler = () => ({
    importXML: jest.fn().mockResolvedValue(undefined)
  });

  const setResolvedService = (key, value) => {
    serviceMap.set(key, value);
  };

  beforeAll(async () => {
    const storageModule = await import('../../app/modules/ui/managers/storage-manager.js');
    StorageManager = storageModule.StorageManager || storageModule.default;

    if (!StorageManager) {
      throw new Error('StorageManager real no encontrado - la prueba debe fallar si no existe');
    }
  });

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    serviceMap.clear();

    serviceRegistryModule.__resetRegistry();
    jest.clearAllMocks();

    resolve.mockImplementation((key) => serviceMap.get(key) ?? null);

    RasciStore.setRoles.mockClear();
    RasciStore.setMatrix.mockClear();
    matrixManager.forceReloadMatrix.mockClear();
    matrixManager.renderMatrix.mockClear();

    storageManager = new StorageManager();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('registro en el ServiceRegistry', () => {
    test('registra la instancia y los métodos públicos', async () => {
      const clearSpy = jest.spyOn(storageManager, 'clearStorage').mockResolvedValue(undefined);
      const { services, functions } = serviceRegistryModule.__getSnapshots();

      expect(serviceRegistryModule.__mockRegistry.register).toHaveBeenCalledTimes(1);
      expect(serviceRegistryModule.__mockRegistry.register).toHaveBeenCalledWith('StorageManager', storageManager);
      expect(services.get('StorageManager').service).toBe(storageManager);

      expect(serviceRegistryModule.__mockRegistry.registerFunction).toHaveBeenCalledTimes(4);
      expect(functions.has('resetStorage')).toBe(true);
      expect(functions.has('clearStorage')).toBe(true);
      expect(functions.has('getStorageInfo')).toBe(true);
      expect(functions.has('clearPPIData')).toBe(true);

      await functions.get('clearStorage')();
      expect(clearSpy).toHaveBeenCalledTimes(1);

      clearSpy.mockRestore();
    });
  });

  describe('gestión de limpieza básica', () => {
    test('clearStorage elimina claves no preservadas y limpia RASCI/PPI', async () => {
      const ppiManager = mockPpiManager();
      setResolvedService('PPIManagerInstance', ppiManager);

      localStorage.setItem('userPreferences', 'keep');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('transient', 'value');
      localStorage.setItem('rasciRoles', 'value');
      localStorage.setItem('rasciMatrixData', 'value');
      localStorage.setItem('customKey', 'to-remove');

      await storageManager.clearStorage();

      expect(storageManager.storageCleared).toBe(true);
      expect(localStorage.getItem('userPreferences')).toBe('keep');
      expect(localStorage.getItem('theme')).toBe('dark');
      expect(localStorage.getItem('transient')).toBeNull();
      expect(localStorage.getItem('rasciRoles')).toBeNull();
      expect(localStorage.getItem('rasciMatrixData')).toBeNull();
      expect(localStorage.getItem('customKey')).toBeNull();

      expect(RasciStore.setRoles).toHaveBeenCalledTimes(2);
      expect(RasciStore.setRoles).toHaveBeenCalledWith([]);
      expect(RasciStore.setMatrix).toHaveBeenCalledTimes(2);
      expect(RasciStore.setMatrix).toHaveBeenCalledWith({});

      jest.runOnlyPendingTimers();

      expect(storageManager.storageCleared).toBe(false);
      expect(ppiManager.refreshPPIList).toHaveBeenCalled();
      expect(matrixManager.forceReloadMatrix).toHaveBeenCalled();
    });

    test('clearStorage propaga el error cuando forcePanelDataReload falla', async () => {
      jest.spyOn(storageManager, 'forcePanelDataReload').mockRejectedValue(new Error('reload failed'));

      await expect(storageManager.clearStorage()).rejects.toThrow('reload failed');
    });
  });

  describe('preparación e importación', () => {
    test('prepareForImport limpia sin marcar storageCleared', async () => {
      const ppiManager = mockPpiManager();
      setResolvedService('PPIManagerInstance', ppiManager);

      localStorage.setItem('userPreferences', 'keep');
      localStorage.setItem('projectKey', 'to-remove');

      const result = await storageManager.prepareForImport();

      expect(result).toBe(true);
      expect(storageManager.storageCleared).toBe(false);
      expect(localStorage.getItem('userPreferences')).toBe('keep');
      expect(localStorage.getItem('projectKey')).toBeNull();
      expect(RasciStore.setRoles).toHaveBeenCalled();
      expect(RasciStore.setMatrix).toHaveBeenCalled();

      jest.runOnlyPendingTimers();
      expect(ppiManager.refreshPPIList).toHaveBeenCalled();
      expect(matrixManager.forceReloadMatrix).toHaveBeenCalled();
    });

    test('prepareForImport retorna false si la limpieza falla', async () => {
      jest.spyOn(storageManager, 'clearStorageForImport').mockRejectedValue(new Error('import cleanup failed'));

      const result = await storageManager.prepareForImport();

      expect(result).toBe(false);
    });
  });

  describe('reset completo de almacenamiento', () => {
    test('resetStorage crea diagrama limpio y estado inicial', async () => {
      const ppiManager = mockPpiManager();
      const modeler = mockModeler();
      setResolvedService('PPIManagerInstance', ppiManager);
      setResolvedService('BpmnModeler', modeler);

      localStorage.setItem('legacyKey', 'remove');

      const result = await storageManager.resetStorage();

      expect(result).toBe(true);
      expect(modeler.importXML).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('legacyKey')).toBeNull();
      expect(localStorage.getItem('activePanels')).toBe(JSON.stringify(['bpmn']));
      expect(localStorage.getItem('panelLayout')).toBe('2v');
      expect(localStorage.getItem('rasciRoles')).toBe(JSON.stringify([]));
      expect(localStorage.getItem('bpmnDiagram')).not.toBeNull();

      jest.runOnlyPendingTimers();
      expect(ppiManager.refreshPPIList).toHaveBeenCalled();
      expect(matrixManager.forceReloadMatrix).toHaveBeenCalled();
    });

    test('resetStorage retorna false cuando crear el diagrama falla', async () => {
      jest.spyOn(storageManager, 'clearStorage').mockResolvedValue(undefined);
      jest.spyOn(storageManager, 'createCleanBpmnDiagram').mockRejectedValue(new Error('diagram fail'));
      jest.spyOn(storageManager, 'forcePanelReset').mockResolvedValue(undefined);
      jest.spyOn(storageManager, 'resetGlobalVariables').mockImplementation(() => {});
      jest.spyOn(storageManager, 'setInitialState').mockImplementation(() => {});

      const result = await storageManager.resetStorage();

      expect(result).toBe(false);
    });
  });

  describe('utilidades de almacenamiento', () => {
    test('createBackup persiste el snapshot del estado actual', () => {
      localStorage.setItem('foo', 'bar');
      localStorage.setItem('theme', 'dark');

      const result = storageManager.createBackup();

      expect(result).toBe(true);
      const backup = JSON.parse(localStorage.getItem('storageBackup'));
      expect(backup).toMatchObject({ foo: 'bar', theme: 'dark' });
      expect(Object.keys(backup)).not.toContain('storageBackup');
    });
  });
});