/**
 * Mock avanzado de bpmn-js para Jest
 * Intercepta la importación antes de que Jest procese los ES modules
 */

// Mock completo de BpmnModeler
class MockBpmnModeler {
  constructor(options = {}) {
    this.container = options.container;
    this.modules = options.modules || [];
    this.moddleExtensions = options.moddleExtensions || {};
    this.keyboard = options.keyboard || { bindTo: document };
    
    this.xml = null;
    this.warnings = [];
    
    // Servicios internos
    this._services = new Map();
    this._setupServices();
  }

  _setupServices() {
    // ElementRegistry
    this._services.set('elementRegistry', {
      getAll: jest.fn(() => [
        { id: 'Task_1', type: 'bpmn:Task', businessObject: { id: 'Task_1', name: 'Tarea 1' } },
        { id: 'Task_2', type: 'bpmn:Task', businessObject: { id: 'Task_2', name: 'Tarea 2' } },
        { id: 'Process_1', type: 'bpmn:Process', businessObject: { id: 'Process_1', name: 'Proceso Principal' } },
        { id: 'StartEvent_1', type: 'bpmn:StartEvent', businessObject: { id: 'StartEvent_1', name: 'Inicio' } },
        { id: 'EndEvent_1', type: 'bpmn:EndEvent', businessObject: { id: 'EndEvent_1', name: 'Fin' } }
      ]),
      get: jest.fn((id) => {
        const elements = this._services.get('elementRegistry').getAll();
        return elements.find(el => el.id === id);
      }),
      add: jest.fn(),
      remove: jest.fn()
    });

    // Canvas
    this._services.set('canvas', {
      zoom: jest.fn((level, center) => ({ scale: level || 1 })),
      getViewbox: jest.fn(() => ({ x: 0, y: 0, width: 800, height: 600, scale: 1 })),
      setViewbox: jest.fn(),
      scrollToElement: jest.fn(),
      getRootElement: jest.fn(() => ({ id: 'Process_1', type: 'bpmn:Process' }))
    });

    // Modeling
    this._services.set('modeling', {
      updateLabel: jest.fn(),
      removeElements: jest.fn(),
      createElement: jest.fn(),
      appendShape: jest.fn(),
      connect: jest.fn()
    });

    // EventBus
    this._services.set('eventBus', {
      on: jest.fn(),
      off: jest.fn(),
      fire: jest.fn()
    });

    // Selection
    this._services.set('selection', {
      get: jest.fn(() => []),
      select: jest.fn(),
      deselect: jest.fn()
    });
  }

  get(serviceName) {
    return this._services.get(serviceName);
  }

  async importXML(xml) {
    this.xml = xml;
    return {
      warnings: this.warnings
    };
  }

  async saveXML() {
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
    this.xml = null;
  }

  destroy() {
    this._services.clear();
  }
}

// Export como CommonJS (para Jest)
module.exports = MockBpmnModeler;
module.exports.default = MockBpmnModeler;

// También como ESM (para casos donde se requiera)
if (typeof exports !== 'undefined') {
  exports.default = MockBpmnModeler;
}
