// Utilidades comunes para testing
import { MockBpmnModeler } from '../mocks/bpmn-modeler.mock.js';

/**
 * Crea un diagrama BPMN válido básico para testing
 */
export function createValidBpmnXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Inicio">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Tarea 1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="Fin">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
</bpmn:definitions>`;
}

/**
 * Crea un diagrama BPMN inválido (sin eventos de inicio/fin)
 */
export function createInvalidBpmnXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:task id="Task_1" name="Tarea sin conexión" />
  </bpmn:process>
</bpmn:definitions>`;
}

/**
 * Crea un diagrama BPMN con ciclo infinito
 */
export function createCyclicBpmnXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Tarea 1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_2" name="Tarea 2">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_1" />
  </bpmn:process>
</bpmn:definitions>`;
}

/**
 * Crea un proyecto .mmproject válido para testing
 */
export function createValidMmProject() {
  return {
    version: '1.0.0',
    bpmn: createValidBpmnXml(),
    ppinot: {
      ppis: [
        {
          id: 'PPI_1',
          name: 'Tiempo de proceso',
          type: 'TimeMeasure',
          targetRef: 'Task_1'
        }
      ]
    },
    ralph: {
      roles: [
        {
          id: 'Role_1',
          name: 'Analista',
          type: 'Role'
        }
      ]
    },
    rasci: {
      roles: ['Role_1', 'Role_2'],
      tasks: ['Task_1'],
      matrix: {
        'Task_1': {
          'Role_1': 'A',
          'Role_2': 'R'
        }
      }
    }
  };
}

/**
 * Simula cambios en el diagrama BPMN
 */
export function simulateBpmnChange(modeler, elementId, changes = {}) {
  const element = modeler.get('elementRegistry').get(elementId);
  if (element) {
    const modeling = modeler.get('modeling');
    modeling.updateProperties(element, changes);
    return element;
  }
  return null;
}

/**
 * Simula un evento de autosave
 */
export function simulateAutosaveEvent() {
  const event = new CustomEvent('beforeunload');
  window.dispatchEvent(event);
}

/**
 * Espera a que se complete una operación async
 */
export function waitFor(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Crea un mock completo del modeler con servicios
 */
export function createMockModeler(options = {}) {
  const modeler = new MockBpmnModeler(options);
  
  // Agregar elementos adicionales si se especifican
  if (options.elements) {
    const elementRegistry = modeler.get('elementRegistry');
    options.elements.forEach(element => {
      elementRegistry.add(element);
    });
  }
  
  return modeler;
}

/**
 * Valida que un XML BPMN tenga la estructura correcta
 */
export function validateBpmnStructure(xml) {
  const hasStartEvent = xml.includes('bpmn:startEvent');
  const hasEndEvent = xml.includes('bpmn:endEvent');
  const hasProcess = xml.includes('bpmn:process');
  const hasDefinitions = xml.includes('bpmn:definitions');
  
  return {
    isValid: hasStartEvent && hasEndEvent && hasProcess && hasDefinitions,
    hasStartEvent,
    hasEndEvent,
    hasProcess,
    hasDefinitions
  };
}

/**
 * Extrae elementos de un XML BPMN
 */
export function extractBpmnElements(xml) {
  // Usar regex más específico para evitar contar elementos en atributos
  const startEvents = (xml.match(/<bpmn:startEvent\b/g) || []).length;
  const endEvents = (xml.match(/<bpmn:endEvent\b/g) || []).length;
  const tasks = (xml.match(/<bpmn:task\b/g) || []).length;
  const sequenceFlows = (xml.match(/<bpmn:sequenceFlow\b/g) || []).length;
  
  return {
    startEvents,
    endEvents,
    tasks,
    sequenceFlows,
    totalElements: startEvents + endEvents + tasks + sequenceFlows
  };
}

