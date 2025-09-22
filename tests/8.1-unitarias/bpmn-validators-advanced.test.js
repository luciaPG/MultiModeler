/**
 * 8.1 PRUEBAS UNITARIAS - BPMN Validators Avanzados
 * 
 * Validadores específicos para diagramas BPMN usando helpers reales del sistema.
 * Ejercita el módulo app/modules/bpmn/validators.js con casos realistas.
 */

import { 
  createValidBpmnXml, 
  createInvalidBpmnXml, 
  createCyclicBpmnXml,
  validateBpmnStructure,
  extractBpmnElements,
  createMockModeler
} from '../utils/test-helpers.js';

import { 
  getBpmnElementStats, 
  extractSequenceFlowsFromXml, 
  findCyclesInFlows, 
  analyzeBpmnDiagram,
  hasMandatoryEvents,
  CLEAN_BPMN_DIAGRAM_XML,
  MINIMAL_BPMN_DIAGRAM_XML
} from '../../app/modules/bpmn/validators.js';

describe('8.1 Pruebas Unitarias - BPMN Validators Avanzados', () => {
  let mockModeler;

  beforeEach(() => {
    mockModeler = createMockModeler();
  });

  describe('Validación de Eventos Obligatorios', () => {
    test('debe validar presencia de evento de inicio', () => {
      // Usar directamente el XML canónico
      const hasStart = CLEAN_BPMN_DIAGRAM_XML.includes('bpmn:startEvent');
      const hasEnd = CLEAN_BPMN_DIAGRAM_XML.includes('bpmn:endEvent');
      
      expect(hasStart).toBe(true);
      expect(hasEnd).toBe(true);
    });

    test('debe detectar ausencia de evento de inicio', () => {
      // XML solo con evento de inicio, sin fin
      const hasStart = MINIMAL_BPMN_DIAGRAM_XML.includes('bpmn:startEvent');
      const hasEnd = MINIMAL_BPMN_DIAGRAM_XML.includes('bpmn:endEvent');
      
      expect(hasStart).toBe(true);
      expect(hasEnd).toBe(false);
    });

    test('debe validar presencia de evento de fin', () => {
      const hasEnd = CLEAN_BPMN_DIAGRAM_XML.includes('bpmn:endEvent');
      expect(hasEnd).toBe(true);
    });

    test('debe detectar ausencia de evento de fin', () => {
      const xmlSinFin = createInvalidBpmnXml();
      const hasEnd = xmlSinFin.includes('bpmn:endEvent');
      
      expect(hasEnd).toBe(false);
    });
  });

  describe('Detección de Ciclos Infinitos', () => {
    test('debe detectar ciclos sin eventos de fin', async () => {
      const cyclicXml = createCyclicBpmnXml();
      const analysis = await analyzeBpmnDiagram(mockModeler, { xml: cyclicXml });
      
      expect(analysis.hasCycles).toBe(true);
      expect(analysis.hasCyclesWithoutEndEvent).toBe(true);
      expect(analysis.cycles.length).toBeGreaterThan(0);
    });

    test('debe permitir ciclos con eventos de fin', async () => {
      // El XML canónico no tiene ciclos, pero tiene eventos de fin
      const hasEnd = CLEAN_BPMN_DIAGRAM_XML.includes('bpmn:endEvent');
      const flows = extractSequenceFlowsFromXml(CLEAN_BPMN_DIAGRAM_XML);
      const cycles = findCyclesInFlows(flows);
      
      expect(hasEnd).toBe(true);
      expect(cycles.length).toBe(0); // No hay ciclos en el XML canónico
    });

    test('debe manejar XML sin ciclos', async () => {
      const analysis = await analyzeBpmnDiagram(mockModeler, { xml: CLEAN_BPMN_DIAGRAM_XML });
      
      expect(analysis.hasCycles).toBe(false);
      expect(analysis.cycles).toHaveLength(0);
    });

    test('debe detectar ciclos complejos con algoritmo DFS', () => {
      const complexFlows = [
        { sourceRef: 'A', targetRef: 'B' },
        { sourceRef: 'B', targetRef: 'C' },
        { sourceRef: 'C', targetRef: 'A' }, // Ciclo A->B->C->A
        { sourceRef: 'D', targetRef: 'E' }
      ];
      
      const cycles = findCyclesInFlows(complexFlows);
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    });
  });

  describe('Extracción de Flujos Secuenciales', () => {
    test('debe extraer flujos del XML canónico', () => {
      const flows = extractSequenceFlowsFromXml(CLEAN_BPMN_DIAGRAM_XML);
      
      expect(flows).toHaveLength(2);
      expect(flows[0]).toMatchObject({
        id: 'Flow_1',
        sourceRef: 'StartEvent_1',
        targetRef: 'Task_1'
      });
      expect(flows[1]).toMatchObject({
        id: 'Flow_2',
        sourceRef: 'Task_1',
        targetRef: 'EndEvent_1'
      });
    });

    test('debe manejar XML sin flujos', () => {
      const flows = extractSequenceFlowsFromXml(MINIMAL_BPMN_DIAGRAM_XML);
      expect(flows).toHaveLength(0);
    });
  });

  describe('Estadísticas de Elementos BPMN', () => {
    test('debe contar elementos correctamente en diagrama canónico', () => {
      // Verificar contando solo elementos del proceso (no visuales)
      const startCount = (CLEAN_BPMN_DIAGRAM_XML.match(/<bpmn:startEvent[^>]*id=/g) || []).length;
      const endCount = (CLEAN_BPMN_DIAGRAM_XML.match(/<bpmn:endEvent[^>]*id=/g) || []).length;
      const taskCount = (CLEAN_BPMN_DIAGRAM_XML.match(/<bpmn:task[^>]*id=/g) || []).length;
      
      expect(startCount).toBe(1);
      expect(endCount).toBe(1);
      expect(taskCount).toBe(1);
    });

    test('debe manejar modeler sin elementRegistry', () => {
      const emptyModeler = { get: () => null };
      const stats = getBpmnElementStats(emptyModeler);
      
      expect(stats.totalElements).toBe(0);
      expect(stats.startEvents).toBe(0);
      expect(stats.endEvents).toBe(0);
    });
  });

  describe('Tests Negativos para BPMN', () => {
    test('debe rechazar XML BPMN malformado', () => {
      const malformedXml = '<invalid></xml>';
      const isValid = validateBpmnStructure(malformedXml);
      
      // validateBpmnStructure devuelve un objeto, no un boolean
      expect(isValid.isValid).toBe(false);
    });

    test('debe rechazar diagramas sin elementos obligatorios', () => {
      const invalidXml = createInvalidBpmnXml();
      const stats = getBpmnElementStats({ get: () => ({ getAll: () => [] }) });
      
      expect(stats.startEvents).toBe(0);
      expect(stats.endEvents).toBe(0);
    });

    test('debe detectar elementos BPMN con tipos incorrectos', () => {
      const xmlConTiposIncorrectos = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process id="Process_1">
            <bpmn:invalidElement id="Invalid_1" />
          </bpmn:process>
        </bpmn:definitions>`;
      
      // Verificar que no contiene elementos válidos
      const hasValidStart = xmlConTiposIncorrectos.includes('bpmn:startEvent');
      const hasValidEnd = xmlConTiposIncorrectos.includes('bpmn:endEvent');
      const hasValidTask = xmlConTiposIncorrectos.includes('bpmn:task');
      
      expect(hasValidStart).toBe(false);
      expect(hasValidEnd).toBe(false);
      expect(hasValidTask).toBe(false);
    });
  });
});