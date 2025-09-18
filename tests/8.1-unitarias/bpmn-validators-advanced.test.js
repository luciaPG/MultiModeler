/**
 * 8.1 PRUEBAS UNITARIAS - BPMN Validators Avanzados
 * 
 * Validadores específicos para diagramas BPMN con lógica real de detección de ciclos.
 * Migrado y mejorado desde sprint1/bpmn-validators.test.js
 */

import { 
  createValidBpmnXml, 
  createInvalidBpmnXml, 
  createCyclicBpmnXml,
  validateBpmnStructure,
  extractBpmnElements,
  createMockModeler
} from '../utils/test-helpers.js';

// Clase para validación BPMN con lógica real
class BpmnValidator {
  constructor(modeler) {
    this.modeler = modeler;
  }

  /**
   * Valida que el diagrama tenga al menos un evento de inicio
   */
  hasStartEvent() {
    const elementRegistry = this.modeler.get('elementRegistry');
    const elements = elementRegistry.getAll();
    return elements.some(element => 
      element.businessObject && element.businessObject.$type === 'bpmn:StartEvent'
    );
  }

  /**
   * Valida que el diagrama tenga al menos un evento de fin
   */
  hasEndEvent() {
    const elementRegistry = this.modeler.get('elementRegistry');
    const elements = elementRegistry.getAll();
    return elements.some(element => 
      element.businessObject && element.businessObject.$type === 'bpmn:EndEvent'
    );
  }

  /**
   * Detecta ciclos infinitos sin eventos de fin
   */
  hasCyclicFlowsWithoutEvents() {
    const xml = this.modeler.xml || '';
    
    // Buscar patrones de ciclos en el XML
    const hasCyclicPattern = this.detectCyclicPatternInXml(xml);
    
    if (!hasCyclicPattern) {
      return false;
    }
    
    // Si hay patrón cíclico, verificar si hay evento de fin
    const hasEndEvent = xml.includes('bpmn:endEvent');
    
    // Si hay ciclo pero no hay evento de fin, es problemático
    return hasCyclicPattern && !hasEndEvent;
  }

  /**
   * Detecta patrones cíclicos en el XML usando algoritmo DFS
   */
  detectCyclicPatternInXml(xml) {
    // Extraer todos los sequence flows
    const flowPattern = /<bpmn:sequenceFlow[^>]*sourceRef="([^"]*)"[^>]*targetRef="([^"]*)"/g;
    const flows = [];
    let match;
    
    while ((match = flowPattern.exec(xml)) !== null) {
      flows.push({ source: match[1], target: match[2] });
    }
    
    // Construir grafo
    const graph = new Map();
    flows.forEach(flow => {
      if (!graph.has(flow.source)) {
        graph.set(flow.source, []);
      }
      graph.get(flow.source).push(flow.target);
    });
    
    // Detectar ciclos usando DFS
    const visited = new Set();
    const recursionStack = new Set();
    
    function hasCycle(node) {
      if (recursionStack.has(node)) {
        return true;
      }
      
      if (visited.has(node)) {
        return false;
      }
      
      visited.add(node);
      recursionStack.add(node);
      
      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }
      
      recursionStack.delete(node);
      return false;
    }
    
    // Verificar ciclos desde cada nodo
    for (const node of graph.keys()) {
      if (hasCycle(node)) {
        return true;
      }
    }
    
    return false;
  }
}

describe('8.1 Pruebas Unitarias - BPMN Validators Avanzados', () => {
  let validator;
  let mockModeler;

  beforeEach(() => {
    mockModeler = {
      xml: '',
      get: jest.fn().mockReturnValue({
        getAll: jest.fn().mockReturnValue([])
      })
    };
    validator = new BpmnValidator(mockModeler);
  });

  describe('Validación de Eventos Obligatorios', () => {
    test('debe validar presencia de evento de inicio', () => {
      // Mock con evento de inicio
      mockModeler.get.mockReturnValue({
        getAll: jest.fn().mockReturnValue([
          { businessObject: { $type: 'bpmn:StartEvent' } },
          { businessObject: { $type: 'bpmn:Task' } }
        ])
      });

      expect(validator.hasStartEvent()).toBe(true);
    });

    test('debe detectar ausencia de evento de inicio', () => {
      // Mock sin evento de inicio
      mockModeler.get.mockReturnValue({
        getAll: jest.fn().mockReturnValue([
          { businessObject: { $type: 'bpmn:Task' } },
          { businessObject: { $type: 'bpmn:EndEvent' } }
        ])
      });

      expect(validator.hasStartEvent()).toBe(false);
    });

    test('debe validar presencia de evento de fin', () => {
      // Mock con evento de fin
      mockModeler.get.mockReturnValue({
        getAll: jest.fn().mockReturnValue([
          { businessObject: { $type: 'bpmn:StartEvent' } },
          { businessObject: { $type: 'bpmn:EndEvent' } }
        ])
      });

      expect(validator.hasEndEvent()).toBe(true);
    });

    test('debe detectar ausencia de evento de fin', () => {
      // Mock sin evento de fin
      mockModeler.get.mockReturnValue({
        getAll: jest.fn().mockReturnValue([
          { businessObject: { $type: 'bpmn:StartEvent' } },
          { businessObject: { $type: 'bpmn:Task' } }
        ])
      });

      expect(validator.hasEndEvent()).toBe(false);
    });
  });

  describe('Detección de Ciclos Infinitos', () => {
    test('debe detectar ciclos sin eventos de fin', () => {
      // XML con ciclo pero sin evento de fin
      const cyclicXmlWithoutEnd = `
        <bpmn:sequenceFlow sourceRef="Task_1" targetRef="Task_2"/>
        <bpmn:sequenceFlow sourceRef="Task_2" targetRef="Task_1"/>
      `;
      
      mockModeler.xml = cyclicXmlWithoutEnd;
      
      expect(validator.hasCyclicFlowsWithoutEvents()).toBe(true);
    });

    test('debe permitir ciclos con eventos de fin', () => {
      // XML con ciclo pero con evento de fin
      const cyclicXmlWithEnd = `
        <bpmn:sequenceFlow sourceRef="Task_1" targetRef="Task_2"/>
        <bpmn:sequenceFlow sourceRef="Task_2" targetRef="Task_1"/>
        <bpmn:endEvent id="EndEvent_1"/>
      `;
      
      mockModeler.xml = cyclicXmlWithEnd;
      
      expect(validator.hasCyclicFlowsWithoutEvents()).toBe(false);
    });

    test('debe manejar XML sin ciclos', () => {
      // XML lineal sin ciclos
      const linearXml = `
        <bpmn:sequenceFlow sourceRef="StartEvent_1" targetRef="Task_1"/>
        <bpmn:sequenceFlow sourceRef="Task_1" targetRef="EndEvent_1"/>
      `;
      
      mockModeler.xml = linearXml;
      
      expect(validator.detectCyclicPatternInXml(linearXml)).toBe(false);
    });

    test('debe detectar ciclos complejos con algoritmo DFS', () => {
      // XML con ciclo complejo: A -> B -> C -> B
      const complexCyclicXml = `
        <bpmn:sequenceFlow sourceRef="Task_A" targetRef="Task_B"/>
        <bpmn:sequenceFlow sourceRef="Task_B" targetRef="Task_C"/>
        <bpmn:sequenceFlow sourceRef="Task_C" targetRef="Task_B"/>
        <bpmn:sequenceFlow sourceRef="Task_B" targetRef="Task_D"/>
      `;
      
      expect(validator.detectCyclicPatternInXml(complexCyclicXml)).toBe(true);
    });
  });

  describe('Tests Negativos para BPMN', () => {
    test('debe rechazar XML BPMN malformado', () => {
      const invalidXmls = [
        '', // Vacío
        'not xml at all', // No es XML
        '<invalid></xml>', // XML mal formado
        '<bpmn:definitions></invalid>', // Etiquetas no coinciden
        '<xml><bpmn:process></xml>' // BPMN incompleto
      ];

      invalidXmls.forEach(xml => {
        mockModeler.xml = xml;
        expect(validator.detectCyclicPatternInXml(xml)).toBe(false);
        expect(xml.includes('bpmn:startEvent')).toBe(false);
      });
    });

    test('debe rechazar diagramas sin elementos obligatorios', () => {
      // Mock sin elementos obligatorios
      mockModeler.get.mockReturnValue({
        getAll: jest.fn().mockReturnValue([]) // Sin elementos
      });

      expect(validator.hasStartEvent()).toBe(false);
      expect(validator.hasEndEvent()).toBe(false);
    });

    test('debe detectar elementos BPMN con tipos incorrectos', () => {
      // Mock con elementos de tipo incorrecto
      mockModeler.get.mockReturnValue({
        getAll: jest.fn().mockReturnValue([
          { businessObject: { $type: 'invalid:Element' } },
          { businessObject: { $type: 'wrong:Type' } },
          { businessObject: null }, // businessObject nulo
          {} // Sin businessObject
        ])
      });

      expect(validator.hasStartEvent()).toBe(false);
      expect(validator.hasEndEvent()).toBe(false);
    });
  });
});
