import { assign } from 'min-dash';
import { isPPINOTConnection } from '../PPINOT-modeler/PPINOT/Types';
import PPINOTModule from '../PPINOT-modeler/PPINOT';
import RALPHModule from '../RALPH-modeler/RALph';
import { isLabelExternal, getLabel } from '../PPINOT-modeler/PPINOT/utils/LabelUtil';
import BaseModeler from '../baseModeler';

class HybridModeler extends BaseModeler {
  constructor(options) {
    // Start with just PPINOT module initially
    const hybridOptions = assign({}, options, {
      additionalModules: [
        PPINOTModule
      ].concat(options.additionalModules || [])
    });
    
    super(hybridOptions);
      // Track current notation mode
    this._notationMode = 'hybrid'; // Start with hybrid mode
    this._availableNotations = new Set(['ppinot', 'ralph']);
    
    // Store RALPH module for later use
    this._ralphModule = RALPHModule;
  }
  /**
   * Set the notation mode
   * @param {string} mode - 'ppinot', 'ralph', or 'hybrid'
   */
  setNotationMode(mode) {
    if (!['ppinot', 'ralph', 'hybrid'].includes(mode)) {
      throw new Error('Invalid notation mode. Must be one of: ppinot, ralph, hybrid');
    }
    
    this._notationMode = mode;
    
    // Fire event for other components to react
    this._eventBus.fire('notation.mode.changed', { mode });
  }

  /**
   * Get current notation mode
   */
  getNotationMode() {
    return this._notationMode;
  }

  _addPPINOTShape(PPINOTElement) {
    this._customElements.push(PPINOTElement);
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const PPINOTAttrs = assign({ businessObject: PPINOTElement }, PPINOTElement);
    const PPINOTShape = elementFactory.create('shape', PPINOTAttrs);

    if (isLabelExternal(PPINOTElement) && getLabel(PPINOTShape)) {
      this.addLabel(PPINOTElement, PPINOTShape);
    }

    return canvas.addShape(PPINOTShape);
  }

  _addRALPHShape(RALPHElement) {
    this._customElements.push(RALPHElement);
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const RALPHAttrs = assign({ businessObject: RALPHElement }, RALPHElement);
    const RALPHShape = elementFactory.create('shape', RALPHAttrs);

    if (isLabelExternal(RALPHElement) && getLabel(RALPHShape)) {
      this.addLabel(RALPHElement, RALPHShape);
    }

    return canvas.addShape(RALPHShape);
  }

  setColors(idAndColorList) {
    const modeling = this.get('modeling');
    const elementRegistry = this.get('elementRegistry');

    idAndColorList.forEach(obj => {
      let element;
      obj.ids.forEach(id => {
        if (this._idMap[id]) {
          element = this._idMap[id].map(i => elementRegistry.get(i));
        } else if (elementRegistry.get(id).type === 'bpmn:Task') {
          element = elementRegistry.get(id);
        }
      });

      if (element != null) {
        modeling.setColor(element, {
          stroke: obj.fillColor !== '#ffffff' ? obj.fillColor : 'green',
          fill: '#fff'
        });
      }
    });
  }

  _addPPINOTConnection(PPINOTElement) {
    this._customElements.push(PPINOTElement);
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const elementRegistry = this.get('elementRegistry');

    const PPINOTAttrs = assign({
      businessObject: PPINOTElement
    }, PPINOTElement);

    if (PPINOTElement.source && PPINOTElement.target) {
      PPINOTAttrs.source = elementRegistry.get(PPINOTElement.source);
      PPINOTAttrs.target = elementRegistry.get(PPINOTElement.target);
    }

    const PPINOTConnection = elementFactory.createConnection(PPINOTAttrs);

    if (isLabelExternal(PPINOTElement) && getLabel(PPINOTConnection)) {
      this.addLabel(PPINOTElement, PPINOTConnection);
    }

    return canvas.addConnection(PPINOTConnection);
  }

  _addRALPHConnection(RALPHElement) {
    this._customElements.push(RALPHElement);
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const elementRegistry = this.get('elementRegistry');

    const RALPHAttrs = assign({
      businessObject: RALPHElement
    }, RALPHElement);

    if (RALPHElement.source && RALPHElement.target) {
      RALPHAttrs.source = elementRegistry.get(RALPHElement.source);
      RALPHAttrs.target = elementRegistry.get(RALPHElement.target);
    }

    const RALPHConnection = elementFactory.createConnection(RALPHAttrs);

    if (isLabelExternal(RALPHElement) && getLabel(RALPHConnection)) {
      this.addLabel(RALPHElement, RALPHConnection);
    }

    return canvas.addConnection(RALPHConnection);
  }

  addPPINOTElement(PPINOTElement) {
    if (isPPINOTConnection(PPINOTElement)) {
      return this._addPPINOTConnection(PPINOTElement);
    } else {
      return this._addPPINOTShape(PPINOTElement);
    }
  }

  addRALPHElement(RALPHElement) {
    // We'll need to add a similar type check for RALPH elements
    if (RALPHElement.source && RALPHElement.target) {
      return this._addRALPHConnection(RALPHElement);
    } else {
      return this._addRALPHShape(RALPHElement);
    }
  }

  importPPINOTDiagram(PPINOTElements) {
    PPINOTElements.forEach(element => {
      this.addPPINOTElement(element);
    });
  }

  importRALPHDiagram(RALPHElements) {
    RALPHElements.forEach(element => {
      this.addRALPHElement(element);
    });
  }

  // Method to import both notations
  importHybridDiagram(hybridData) {
    if (hybridData.ppinot) {
      this.importPPINOTDiagram(hybridData.ppinot);
    }
    if (hybridData.ralph) {
      this.importRALPHDiagram(hybridData.ralph);
    }
  }
}

export default HybridModeler;
