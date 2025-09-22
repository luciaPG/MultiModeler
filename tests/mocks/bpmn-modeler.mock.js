// Mock para bpmn-js Modeler
export class MockBpmnModeler {
  constructor(options = {}) {
    this.options = options;
    this.xml = null;
    this.elementRegistry = new MockElementRegistry();
    this.modeling = new MockModeling();
    this.eventBus = new MockEventBus();
    this.canvas = new MockCanvas();
  }

  async importXML(xml) {
    this.xml = xml;
    // Actualizar elementos basados en el XML importado
    this.elementRegistry.addElementsFromXml(xml);
    return { warnings: [] };
  }

  async saveXML(options = {}) {
    const xml = this.xml || `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
    <bpmn:endEvent id="EndEvent_1" />
  </bpmn:process>
</bpmn:definitions>`;
    return { xml };
  }

  get(serviceName) {
    const services = {
      'elementRegistry': this.elementRegistry,
      'modeling': this.modeling,
      'eventBus': this.eventBus,
      'canvas': this.canvas
    };
    return services[serviceName];
  }

  destroy() {
    // Mock cleanup
  }
}

class MockElementRegistry {
  constructor() {
    this.elements = new Map();
    this.initializeMockElements();
  }

  initializeMockElements() {
    // Inicializar vacío por defecto
    // Los elementos se agregarán cuando se importe XML
    this.elements.clear();
  }

  // Método para agregar elementos basados en el XML importado
  addElementsFromXml(xml) {
    this.elements.clear();
    
    // Parsear elementos básicos del XML
    if (xml.includes('bpmn:startEvent')) {
      this.elements.set('StartEvent_1', {
        id: 'StartEvent_1',
        type: 'bpmn:StartEvent',
        businessObject: { $type: 'bpmn:StartEvent', name: 'Inicio' }
      });
    }
    
    if (xml.includes('bpmn:endEvent')) {
      this.elements.set('EndEvent_1', {
        id: 'EndEvent_1', 
        type: 'bpmn:EndEvent',
        businessObject: { $type: 'bpmn:EndEvent', name: 'Fin' }
      });
    }

    if (xml.includes('bpmn:task')) {
      this.elements.set('Task_1', {
        id: 'Task_1',
        type: 'bpmn:Task', 
        businessObject: { $type: 'bpmn:Task', name: 'Tarea 1' }
      });
    }
  }

  getAll() {
    return Array.from(this.elements.values());
  }

  get(id) {
    return this.elements.get(id);
  }

  add(element) {
    this.elements.set(element.id, element);
  }

  remove(element) {
    this.elements.delete(element.id);
  }
}

class MockModeling {
  constructor() {
    this.eventBus = new MockEventBus();
  }

  createElement(type, attributes, parent) {
    const element = {
      id: attributes.id || `${type}_${Date.now()}`,
      type: type,
      businessObject: { $type: type, ...attributes }
    };
    return element;
  }

  removeElements(elements) {
    // Mock remove
    this.eventBus.fire('elements.removed', { elements });
  }

  updateProperties(element, properties) {
    Object.assign(element.businessObject, properties);
    this.eventBus.fire('element.changed', { element });
  }
}

class MockEventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  fire(event, data = {}) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`Mock EventBus error in ${event}:`, e);
        }
      });
    }
  }
}

class MockCanvas {
  constructor() {
    this.zoomLevel = 1;
    this.viewbox = { x: 0, y: 0, width: 1000, height: 1000 };
  }

  zoom(factor) {
    if (factor !== undefined) {
      this.zoomLevel = factor;
    }
    return this.zoomLevel;
  }

  getViewbox() {
    return { ...this.viewbox };
  }

  setViewbox(viewbox) {
    this.viewbox = { ...viewbox };
  }
}

