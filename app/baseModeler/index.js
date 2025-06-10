import Modeler from 'bpmn-js/lib/Modeler';

export default class BaseModeler extends Modeler {
  constructor(options) {
    super(options);
    this._customElements = [];
    this._idMap = [];
    this.modelOpen = false;
  }

  clear() {
    this._customElements = [];
    return super.clear();
  }

  isModelOpen() {
    return this.modelOpen;
  }

  setModelOpen(value) {
    this.modelOpen = value;
  }

  getCustomElements() {
    return this._customElements;
  }

  addCustomElements(elements) {
    this._customElements.push(...elements);
  }
}