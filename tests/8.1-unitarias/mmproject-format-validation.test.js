/** @jest-environment jsdom */
/**
 * 8.1 PRUEBAS UNITARIAS - Validación Formato .mmproject
 *
 * Valida la estructura y contenido de archivos .mmproject multi-notación utilizando
 * los gestores reales de la aplicación.
 */

jest.mock('../../app/modules/ui/managers/ppinot-coordination-manager.js', () => {
  const triggerRestoration = jest.fn();

  return {
    __esModule: true,
    default: {
      triggerRestoration
    },
    __mock: {
      triggerRestoration
    }
  };
});

jest.mock('../../app/modules/ui/managers/ppinot-storage-manager.js', () => {
  const state = { elements: [], relationships: [] };
  const loadPPINOTElements = jest.fn(() => ({
    elements: [...state.elements],
    relationships: [...state.relationships]
  }));
  const savePPINOTElements = jest.fn((elements = [], relationships = []) => {
    state.elements = Array.isArray(elements) ? [...elements] : [];
    state.relationships = Array.isArray(relationships) ? [...relationships] : [];
  });

  return {
    __esModule: true,
    default: {
      loadPPINOTElements,
      savePPINOTElements
    },
    __mockState: state,
    __mocks: {
      loadPPINOTElements,
      savePPINOTElements
    }
  };
});

import { resetLocalStorageMock } from '../utils/ensure-localstorage.js';
import { createValidBpmnXml } from '../utils/test-helpers.js';
import { mmprojectValidator } from '../../app/modules/ui/validation/mmproject-validator.js';
import { AutosaveManager } from '../../app/services/autosave-manager.js';
import { getServiceRegistry } from '../../app/modules/ui/core/ServiceRegistry.js';
import { RasciStore } from '../../app/modules/rasci/store.js';

const ppinotStorageMock = jest.requireMock('../../app/modules/ui/managers/ppinot-storage-manager.js');

let serviceRegistry;

beforeAll(async () => {
  document.body.innerHTML = '';
  serviceRegistry = getServiceRegistry();
  serviceRegistry.register('EventBus', { publish: jest.fn(), subscribe: jest.fn() });
  await import('../../app/modules/ui/managers/import-export-manager.js');
});

describe('8.1 Pruebas Unitarias - Validación Formato .mmproject', () => {
  let eventBusMock;
  let importExportManager;

  beforeEach(() => {
    resetLocalStorageMock();
    document.body.innerHTML = '';

    ppinotStorageMock.__mockState.elements = [];
    ppinotStorageMock.__mockState.relationships = [];

    eventBusMock = {
      publish: jest.fn(),
      subscribe: jest.fn()
    };

    serviceRegistry.register('EventBus', eventBusMock);

    const elementRegistry = {
      getAll: jest.fn().mockReturnValue([
        {
          id: 'PPI_1',
          type: 'PPINOT:Ppi',
          businessObject: { $type: 'PPINOT:Ppi', name: 'Tiempo de proceso', id: 'PPI_1' },
          x: 120,
          y: 80,
          width: 140,
          height: 60
        }
      ])
    };

    const modelerMock = {
      saveXML: jest.fn().mockResolvedValue({ xml: createValidBpmnXml() }),
      get: jest.fn((service) => {
        if (service === 'elementRegistry') {
          return elementRegistry;
        }
        return null;
      })
    };

    serviceRegistry.register('BpmnModeler', modelerMock);

    const ppiManager = {
      core: {
        getAllPPIs: jest.fn().mockReturnValue([
          {
            id: 'PPI_1',
            name: 'Tiempo de proceso',
            targetRef: 'Task_1',
            linkedElements: ['Task_1']
          }
        ])
      },
      linkToBpmnElement: jest.fn()
    };

    serviceRegistry.register('PPIManagerInstance', ppiManager);

    const rasciAdapter = {
      getTasks: jest.fn().mockReturnValue(['Task_1']),
      setTasks: jest.fn(),
      setRoles: jest.fn(),
      setMatrix: jest.fn()
    };

    serviceRegistry.register('RASCIAdapter', rasciAdapter);

    RasciStore.setRoles([
      'Analista',
      'Supervisor'
    ]);

    RasciStore.setMatrix({
      Task_1: {
        Analista: 'A',
        Supervisor: 'R'
      }
    });

    importExportManager = serviceRegistry.get('ImportExportManager');
    if (!importExportManager) {
      throw new Error('ImportExportManager real no disponible en ServiceRegistry');
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Validaciones positivas con gestores reales', () => {
    test('debe validar proyecto .mmproject exportado por ImportExportManager', async () => {
      const project = await importExportManager.collectAllProjectData();
      const result = mmprojectValidator.validateProject(project);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(project.connections.ppiToBpmn.PPI_1).toEqual(['Task_1']);
    });

    test('debe validar proyecto .mmproject generado por AutosaveManager REAL', async () => {
      const autosaveManager = new AutosaveManager({
        modeler: serviceRegistry.get('BpmnModeler'),
        eventBus: eventBusMock,
        enabled: false
      });

      const project = await autosaveManager.createCompleteProject();
      const result = mmprojectValidator.validateProject(project);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(project.ppinot.ppis[0].id).toBe('PPI_1');
    });
  });

  describe('Validaciones negativas ante cambios estructurales', () => {
    test('debe rechazar proyecto con paneles críticos faltantes', async () => {
      const project = await importExportManager.collectAllProjectData();
      const invalidProject = JSON.parse(JSON.stringify(project));
      delete invalidProject.panels.bpmn;

      const result = mmprojectValidator.validateProject(invalidProject);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining("'bpmn'")
      ]));
    });

    test('debe detectar incoherencias entre PPIs y conexiones BPMN', async () => {
      const project = await importExportManager.collectAllProjectData();
      const invalidProject = JSON.parse(JSON.stringify(project));
      invalidProject.panels.ppi.indicators = [];

      const result = mmprojectValidator.validateProject(invalidProject);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Conexión PPI')
      ]));
    });

    test('debe detectar violaciones críticas en la matriz RASCI', async () => {
      const project = await importExportManager.collectAllProjectData();
      const invalidProject = JSON.parse(JSON.stringify(project));
      invalidProject.panels.rasci.matrix.Task_1 = {
        Analista: 'S',
        Supervisor: 'C'
      };

      const result = mmprojectValidator.validateProject(invalidProject);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining("rol 'A'"),
        expect.stringContaining("rol 'R'")
      ]));
    });
  });
});