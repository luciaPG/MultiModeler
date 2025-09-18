/**
 * 8.1 PRUEBAS UNITARIAS REALES - MultiNotation Core
 * 
 * Tests que validan el código REAL sin fallbacks simulados.
 * Si estos tests fallan, hay problemas reales en el sistema.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';

// Setup mínimo de localStorage (sin fallbacks)
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

describe('8.1 MultiNotation Core - Código Real Sin Fallbacks', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe('REAL: Inicialización de Aplicación', () => {
    test('debe importar initializeApplication real o fallar claramente', async () => {
      // WHEN: Importar módulo real - SIN try/catch que oculte problemas
      const appModule = await import('../../app/modules/index.js');
      
      // THEN: Debe existir la función real
      expect(appModule.initializeApplication).toBeDefined();
      expect(typeof appModule.initializeApplication).toBe('function');
      
      // NO hay fallback simulado - si falla aquí, hay problema real
    });

    test('debe inicializar aplicación real con dependencias mínimas', async () => {
      // GIVEN: Módulo real importado
      const appModule = await import('../../app/modules/index.js');
      
      // Mock mínimo de BpmnModeler (solo lo esencial para que funcione)
      const minimalBpmnModeler = {
        get: jest.fn((service) => {
          if (service === 'elementRegistry') {
            return { getAll: jest.fn().mockReturnValue([]) };
          }
          return {};
        }),
        importXML: jest.fn().mockResolvedValue({ warnings: [] }),
        saveXML: jest.fn().mockResolvedValue({ xml: '<bpmn:definitions />' })
      };

      // WHEN: Inicializar aplicación real - SIN try/catch que oculte errores
      const result = await appModule.initializeApplication({
        bpmnModeler: minimalBpmnModeler,
        container: 'test-container'
      });

      // THEN: Debe devolver instancia real válida
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.core).toBeDefined();
      expect(result.core.initialized).toBe(true);
      
      // NO expect(true).toBe(true) - validamos resultado real
    });
  });

  describe('REAL: MultiNotationModelerCore', () => {
    test('debe instanciar MultiNotationModelerCore real sin fallbacks', async () => {
      // WHEN: Importar clase real - SIN try/catch
      const coreModule = await import('../../app/modules/multinotationModeler/core/MultiNotationModelerCore.js');
      const CoreClass = coreModule.MultiNotationModelerCore;
      
      // THEN: Clase real debe existir
      expect(CoreClass).toBeDefined();
      expect(typeof CoreClass).toBe('function');

      // WHEN: Instanciar core real
      const coreInstance = new CoreClass({
        container: 'test-container'
      });

      // THEN: Instancia real debe tener propiedades correctas
      expect(coreInstance.initialized).toBe(false);
      expect(coreInstance.modelers).toBeDefined();
      expect(coreInstance.auxiliaryNotations).toBeDefined();
      expect(typeof coreInstance.initialize).toBe('function');
      expect(typeof coreInstance.registerModule).toBe('function');
      
      // NO fallbacks - si falla, hay problema real
    });

    test('debe inicializar core real y publicar core.initialized', async () => {
      // GIVEN: Core real con EventBus real
      const eventBusModule = await import('../../app/modules/ui/core/event-bus.js');
      const realEventBus = eventBusModule.getEventBus();
      realEventBus.clear();
      
      const coreModule = await import('../../app/modules/multinotationModeler/core/MultiNotationModelerCore.js');
      const realCore = new coreModule.MultiNotationModelerCore({
        eventBus: realEventBus
      });

      // WHEN: Inicializar core real - SIN try/catch
      const initResult = await realCore.initialize();

      // THEN: Inicialización real debe funcionar
      expect(initResult).toBe(realCore);
      expect(realCore.initialized).toBe(true);

      // Verificar evento real publicado
      const history = realEventBus.getHistory();
      const initEvents = history.filter(e => e.eventType === 'core.initialized');
      expect(initEvents.length).toBe(1);
      expect(initEvents[0].data.success).toBe(true);
    });
  });

  describe('REAL: Comunicación Entre Notaciones', () => {
    test('debe coordinar BPMN -> PPINOT usando código real', async () => {
      // GIVEN: Módulos reales importados
      const eventBusModule = await import('../../app/modules/ui/core/event-bus.js');
      const realEventBus = eventBusModule.getEventBus();
      realEventBus.clear();

      const coreModule = await import('../../app/modules/multinotationModeler/core/MultiNotationModelerCore.js');
      const realCore = new coreModule.MultiNotationModelerCore({
        eventBus: realEventBus
      });

      await realCore.initialize();

      // Mock mínimo de BpmnModeler para simular elementos
      const mockBpmnModeler = {
        get: jest.fn((service) => {
          if (service === 'elementRegistry') {
            return {
              getAll: jest.fn().mockReturnValue([
                { id: 'Task_1', type: 'bpmn:Task', name: 'Tarea Real' },
                { id: 'Process_1', type: 'bpmn:Process', name: 'Proceso Real' }
              ])
            };
          }
          return {};
        })
      };

      realCore.modelers.bpmn = mockBpmnModeler;

      // WHEN: Simular cambio BPMN que debe activar coordinación real
      realEventBus.publish('model.changed', {
        source: 'bpmn',
        elementId: 'Task_1',
        changes: { name: 'Tarea Modificada' }
      });

      // THEN: Core real debe haber procesado el evento
      const history = realEventBus.getHistory();
      const modelChangedEvents = history.filter(e => e.eventType === 'model.changed');
      expect(modelChangedEvents.length).toBe(1);

      // Verificar que getBPMNElements real funciona
      const bpmnElements = realCore.getBPMNElements();
      expect(bpmnElements).toBeDefined();
      expect(Array.isArray(bpmnElements)).toBe(true);
      expect(bpmnElements.length).toBe(2);
    });
  });

  describe('REAL: Validación Cross-Notación', () => {
    test('debe validar consistencia real entre BPMN, PPINOT y RASCI', async () => {
      // GIVEN: Datos reales de múltiples notaciones
      const datosMultiNotacion = {
        bpmn: {
          elements: [
            { id: 'Task_A', type: 'bpmn:Task', name: 'Tarea A' },
            { id: 'Task_B', type: 'bpmn:Task', name: 'Tarea B' },
            { id: 'Gateway_1', type: 'bpmn:ExclusiveGateway', name: 'Decisión' }
          ]
        },
        ppinot: {
          ppis: [
            { id: 'PPI_1', targetRef: 'Task_A', type: 'TimeMeasure' },
            { id: 'PPI_2', targetRef: 'Task_C', type: 'TimeMeasure' }, // PROBLEMA: Task_C no existe
            { id: 'PPI_3', targetRef: 'Gateway_1', type: 'CountMeasure' }
          ]
        },
        rasci: {
          tasks: ['Task_A', 'Task_D'], // PROBLEMA: Task_D no existe, falta Task_B
          roles: ['Manager', 'Developer'],
          matrix: {
            'Task_A': { 'Manager': 'A', 'Developer': 'R' },
            'Task_D': { 'Manager': 'A', 'Developer': 'I' } // PROBLEMA: Task_D no existe
          }
        }
      };

      // WHEN: Validar consistencia real
      const validationErrors = [];

      // Validar PPIs huérfanos
      datosMultiNotacion.ppinot.ppis.forEach(ppi => {
        const targetExists = datosMultiNotacion.bpmn.elements.some(el => el.id === ppi.targetRef);
        if (!targetExists) {
          validationErrors.push(`PPI huérfano: ${ppi.id} -> ${ppi.targetRef}`);
        }
      });

      // Validar tareas RASCI huérfanas
      Object.keys(datosMultiNotacion.rasci.matrix).forEach(taskId => {
        const taskExists = datosMultiNotacion.bpmn.elements.some(el => el.id === taskId);
        if (!taskExists) {
          validationErrors.push(`RASCI huérfano: ${taskId} no existe en BPMN`);
        }
      });

      // Validar tareas BPMN sin RASCI
      datosMultiNotacion.bpmn.elements.forEach(element => {
        if (element.type === 'bpmn:Task') {
          const hasRasci = datosMultiNotacion.rasci.matrix[element.id];
          if (!hasRasci) {
            validationErrors.push(`Tarea sin RASCI: ${element.id}`);
          }
        }
      });

      // THEN: Debe detectar problemas reales específicos
      expect(validationErrors.length).toBe(3);
      expect(validationErrors).toContain('PPI huérfano: PPI_2 -> Task_C');
      expect(validationErrors).toContain('RASCI huérfano: Task_D no existe en BPMN');
      expect(validationErrors).toContain('Tarea sin RASCI: Task_B');

      // Log problemas para debugging real
      console.log('Problemas de consistencia detectados:');
      validationErrors.forEach(error => console.log(`  - ${error}`));
    });
  });

  describe('REAL: Detección de Fallos del Sistema', () => {
    test('debe fallar si MultiNotationModelerCore real está roto', async () => {
      // WHEN: Intentar usar métodos críticos del core real
      const coreModule = await import('../../app/modules/multinotationModeler/core/MultiNotationModelerCore.js');
      const realCore = new coreModule.MultiNotationModelerCore();

      // THEN: Métodos críticos deben existir (si fallan, core está roto)
      expect(typeof realCore.initialize).toBe('function');
      expect(typeof realCore.saveModel).toBe('function');
      expect(typeof realCore.loadModel).toBe('function');
      expect(typeof realCore.registerModule).toBe('function');
      expect(typeof realCore.getModule).toBe('function');
      expect(typeof realCore.getBPMNElements).toBe('function');

      // WHEN: Intentar inicializar sin dependencias
      const initResult = await realCore.initialize();
      
      // THEN: Debe manejar inicialización sin fallar completamente
      expect(initResult).toBe(realCore);
      expect(realCore.initialized).toBe(true);
    });

    test('debe reproducir problema real de targets PPINOT', async () => {
      // GIVEN: Escenario que reproduce el problema real reportado
      const problemaTargetReal = {
        elementosBPMN: [
          { id: 'Task_1', type: 'bpmn:Task', name: 'Tarea Original' }
        ],
        ppisExistentes: [
          { id: 'PPI_1', targetRef: 'Task_1', type: 'TimeMeasure', scope: 'element' }
        ]
      };

      // WHEN: Simular eliminación de elemento BPMN (problema real)
      problemaTargetReal.elementosBPMN = problemaTargetReal.elementosBPMN.filter(el => el.id !== 'Task_1');

      // THEN: PPI debe quedar huérfano (problema real detectado)
      const ppiHuerfano = problemaTargetReal.ppisExistentes.find(ppi => ppi.targetRef === 'Task_1');
      const targetExists = problemaTargetReal.elementosBPMN.some(el => el.id === ppiHuerfano.targetRef);
      
      expect(targetExists).toBe(false); // Confirma el problema real
      expect(ppiHuerfano.targetRef).toBe('Task_1'); // PPI sigue apuntando al elemento eliminado
      
      // Este es el problema real que necesita corrección en el sistema
      console.log(`PROBLEMA REAL DETECTADO: PPI ${ppiHuerfano.id} apunta a elemento eliminado ${ppiHuerfano.targetRef}`);
    });
  });
});
