/**
 * Mock completo de bpmn-js para tests
 * Evita problemas ESM y proporciona API necesaria para tests
 */

class MockBpmnModeler {
  constructor(options = {}) {
    this.container = options.container;
    this.modules = options.modules || [];
    this.moddleExtensions = options.moddleExtensions || {};
    this.keyboard = options.keyboard || { bindTo: document };
    
    // Servicios internos simulados
    this.services = new Map();
    this.setupServices();
  }

  setupServices() {
    // ElementRegistry mock
    this.services.set('elementRegistry', {
      getAll: jest.fn(() => [
        { id: 'Task_1', type: 'bpmn:Task', businessObject: { id: 'Task_1', name: 'Tarea 1' } },
        { id: 'Task_2', type: 'bpmn:Task', businessObject: { id: 'Task_2', name: 'Tarea 2' } },
        { id: 'Process_1', type: 'bpmn:Process', businessObject: { id: 'Process_1', name: 'Proceso Principal' } },
        { id: 'StartEvent_1', type: 'bpmn:StartEvent', businessObject: { id: 'StartEvent_1', name: 'Inicio' } },
        { id: 'EndEvent_1', type: 'bpmn:EndEvent', businessObject: { id: 'EndEvent_1', name: 'Fin' } }
      ]),
      get: jest.fn((id) => {
        const elements = this.services.get('elementRegistry').getAll();
        return elements.find(el => el.id === id);
      }),
      add: jest.fn((element) => {
        const elements = this.services.get('elementRegistry').getAll();
        elements.push(element);
      }),
      remove: jest.fn((element) => {
        // Mock remove functionality
      })
    });

    // Canvas mock
    this.services.set('canvas', {
      zoom: jest.fn((level, center) => ({ scale: level || 1 })),
      getViewbox: jest.fn(() => ({ x: 0, y: 0, width: 800, height: 600, scale: 1 })),
      setViewbox: jest.fn((viewbox) => viewbox),
      scrollToElement: jest.fn(),
      getRootElement: jest.fn(() => ({ id: 'Process_1', type: 'bpmn:Process' }))
    });

    // Modeling mock
    this.services.set('modeling', {
      updateLabel: jest.fn(),
      removeElements: jest.fn(),
      createElement: jest.fn((elementType, attrs, parent) => ({
        id: attrs.id || `Element_${Date.now()}`,
        type: elementType,
        ...attrs
      })),
      appendShape: jest.fn(),
      connect: jest.fn()
    });

    // EventBus mock
    this.services.set('eventBus', {
      on: jest.fn((event, callback) => {
        // Simular suscripción
      }),
      off: jest.fn(),
      fire: jest.fn((event, data) => {
        // Simular publicación
      })
    });

    // Selection mock
    this.services.set('selection', {
      get: jest.fn(() => []),
      select: jest.fn(),
      deselect: jest.fn()
    });
  }

  get(serviceName) {
    return this.services.get(serviceName);
  }

  async importXML(xml) {
    // Simular importación exitosa
    this.xml = xml;
    return {
      warnings: []
    };
  }

  async saveXML() {
    // Simular guardado
    return {
      xml: this.xml || `
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process id="Process_1" isExecutable="true">
            <bpmn:startEvent id="StartEvent_1" />
            <bpmn:task id="Task_1" name="Tarea 1" />
            <bpmn:task id="Task_2" name="Tarea 2" />
            <bpmn:endEvent id="EndEvent_1" />
          </bpmn:process>
        </bpmn:definitions>
      `
    };
  }

  attachTo(container) {
    this.container = container;
    return this;
  }

  detach() {
    this.container = null;
    return this;
  }

  clear() {
    // Limpiar diagrama
    this.xml = null;
  }

  destroy() {
    // Cleanup
    this.services.clear();
  }
}

// Export como módulo CommonJS para Jest
module.exports = MockBpmnModeler;
module.exports.MockBpmnModeler = MockBpmnModeler;

// También como default export
module.exports.default = MockBpmnModeler;
