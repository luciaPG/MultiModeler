import { assign, isArray, isObject } from 'min-dash';
import inherits from 'inherits';
import Modeler from 'bpmn-js/lib/Modeler';
import BaseModeler from '../baseModeler';

/**
 * Example modeler showing how easy it is to create a new modeler
 * using the modular BaseModeler structure
 */
class ExampleModeler extends BaseModeler {
  constructor(options) {
    super(options);
  }

  _addExampleShape(element) {
    this._customElements.push(element);
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const attrs = assign({ businessObject: element }, element);
    const shape = elementFactory.create('shape', attrs);
    return canvas.addShape(shape);
  }

  _addExampleConnection(element) {
    this._customElements.push(element);
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const elementRegistry = this.get('elementRegistry');
    const attrs = assign({ businessObject: element }, element);
    const connection = elementFactory.create('connection', assign(attrs, {
      source: elementRegistry.get(element.source),
      target: elementRegistry.get(element.target)
    }), elementRegistry.get(element.source).parent);
    return canvas.addConnection(connection);
  }

  addExampleElements(elements) {
    if (!isObject(elements)) throw new Error('argument must be an object');
    if (!isArray(elements.diagram)) throw new Error('missing diagram');

    const shapes = [];
    const connections = [];
    this._idMap = elements.idMap;

    elements.diagram.forEach(element => {
      if (this._isExampleConnection(element)) {
        connections.push(element);
      } else {
        shapes.push(element);
      }
    });

    shapes.forEach(this._addExampleShape, this);
    connections.forEach(this._addExampleConnection, this);
  }

  _isExampleConnection(element) {
    // Example logic for determining if element is a connection
    return element.type && element.type.includes('Connection');
  }

  getExampleElements() {
    return this.getCustomElements();
  }

  // Inherited from BaseModeler:
  // - clear()
  // - setModelOpen()
  // - isModelOpen()
  // - getCustomElements()
  // - addCustomElements()
}

inherits(ExampleModeler, Modeler);

export default ExampleModeler;
