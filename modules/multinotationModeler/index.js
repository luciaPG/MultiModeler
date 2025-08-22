/**
 * MultiNotationModeler Module
 * 
 * This is the main entry point for the MultiNotation Modeler module.
 * It orchestrates the integration of different notations like PPINOT and RALPH.
 */

import Modeler from 'bpmn-js/lib/Modeler';
import { assign } from 'min-dash';
import { isPPINOTConnection } from './ppinot/Types';
import { isLabelExternal, getLabel } from './ppinot/utils/LabelUtil';

import BaseModule from './MultiNotationModule';
import PPINOTModule from './ppinot';
import RALPHModule from './ralph';
import { MultiNotationModelerCore } from './core/MultiNotationModelerCore.js';

/**
 * MultiNotation Modeler class
 * Extends the BPMN-JS Modeler to support multiple notations
 */
class MultiNotationModeler extends Modeler {
  constructor(options = {}) {
    const enhancedOptions = assign({}, options, {
      additionalModules: [
        BaseModule,
        PPINOTModule,
        RALPHModule, 
        ...(options.additionalModules || [])
      ]
    });

    super(enhancedOptions);
    
    this._customElements = [];
  }

  clear() {
    this._customElements = [];
    return super.clear();
  }

  getCustomElements() {
    return this._customElements;
  }

  addCustomElements(elements) {
    this._customElements.push(...elements);
  }

  _addPPINOTShape(PPINOTElement) {
    this._customElements.push(PPINOTElement);
    const shape = this.get('elementFactory').create('shape', assign({ businessObject: PPINOTElement }, PPINOTElement));
    if (isLabelExternal(PPINOTElement) && getLabel(shape)) {
      this.addLabel(PPINOTElement, shape);
    }
    return this.get('canvas').addShape(shape);
  }

  _addPPINOTConnection(PPINOTElement) {
    this._customElements.push(PPINOTElement);
    const connection = this.get('elementFactory').createConnection(assign(
      { businessObject: PPINOTElement },
      PPINOTElement
    ));
    return this.get('canvas').addConnection(connection);
  }

  addPPINOTElement(PPINOTElement) {
    if (isPPINOTConnection(PPINOTElement)) {
      return this._addPPINOTConnection(PPINOTElement);
    } else {
      return this._addPPINOTShape(PPINOTElement);
    }
  }

  addLabel(element, shape) {
    const canvas = this.get('canvas');
    const modeling = this.get('modeling');
    if (element.labelTarget) {
      shape.label = true;
      const newLabel = this.get('elementFactory').create('label', assign({ businessObject: element }, element));
      const newLabelShape = canvas.addShape(newLabel, shape.parent);
      modeling.updateLabel(shape, getLabel(shape));
      return newLabelShape;
    }
    return shape;
  }

  removeCustomElement(element) {
    const elementRegistry = this.get('elementRegistry');
    const PPINOTElements = this.getCustomElements();

    this._customElements = PPINOTElements.filter(el => el !== element);

    const shape = elementRegistry.get(element.id);
    const modeling = this.get('modeling');
    if (shape) {
      modeling.removeElements([shape]);
    }
  }
}

// Export the MultiNotationModeler class
export { MultiNotationModeler };

/**
 * Initialize the MultiNotationModeler module
 * @param {Object} options - Configuration options
 * @returns {Object} - Module API
 */
export function initMultiNotationModeler(options = {}) {
  const core = new MultiNotationModelerCore(options);
  
  // Return the module API
  return {
    core,
    MultiNotationModeler,
    initialize: async () => {
      await core.initialize();
      return core;
    }
  };
}

// Export for module usage
export default {
  initMultiNotationModeler,
  MultiNotationModeler
};
