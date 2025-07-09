import Modeler from 'bpmn-js/lib/Modeler';
import { assign } from 'min-dash';
import { isPPINOTConnection } from '../PPINOT-modeler/PPINOT/Types';
import { isLabelExternal, getLabel } from '../PPINOT-modeler/PPINOT/utils/LabelUtil';

import BaseModule from './MultiNotationModule';
import PPINOTModule from '../PPINOT-modeler/PPINOT';
import RALPHModule from '../RALPH-modeler/RALph';


export default class MultiNotationModeler extends Modeler {
  constructor(options = {}) {
    const enhancedOptions = assign({}, options, {
      additionalModules: [
        BaseModule,
        PPINOTModule,
       // RALPHModule,
        ...(options.additionalModules || [])
      ]
    });

    super(enhancedOptions);
    
    this._customElements = [];
  }  clear() {
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
    const elementFactory = this.get('elementFactory');
    const elementRegistry = this.get('elementRegistry');
    
    const attrs = assign({ businessObject: PPINOTElement }, PPINOTElement);
    if (PPINOTElement.source && PPINOTElement.target) {
      attrs.source = elementRegistry.get(PPINOTElement.source);
      attrs.target = elementRegistry.get(PPINOTElement.target);
    }
    const connection = elementFactory.createConnection(attrs);
    if (isLabelExternal(PPINOTElement) && getLabel(connection)) {
      this.addLabel(PPINOTElement, connection);
    }
    return this.get('canvas').addConnection(connection);
  }

  addPPINOTElement(PPINOTElement) {
    return isPPINOTConnection(PPINOTElement)
      ? this._addPPINOTConnection(PPINOTElement)
      : this._addPPINOTShape(PPINOTElement);
  }
  importPPINOTDiagram(PPINOTElements) {
    PPINOTElements.forEach(el => this.addPPINOTElement(el));
  }

  _addRALPHShape(RALPHElement) {
    this._customElements.push(RALPHElement);
    const shape = this.get('elementFactory').create('shape', assign({ businessObject: RALPHElement }, RALPHElement));
    if (isLabelExternal(RALPHElement) && getLabel(shape)) {
      this.addLabel(RALPHElement, shape);
    }
    return this.get('canvas').addShape(shape);
  }

  _addRALPHConnection(RALPHElement) {
    this._customElements.push(RALPHElement);
    const elementFactory = this.get('elementFactory');
    const elementRegistry = this.get('elementRegistry');
    const attrs = assign({ businessObject: RALPHElement }, RALPHElement);
    if (RALPHElement.source && RALPHElement.target) {
      attrs.source = elementRegistry.get(RALPHElement.source);
      attrs.target = elementRegistry.get(RALPHElement.target);
    }
    const conn = elementFactory.createConnection(attrs);
    if (isLabelExternal(RALPHElement) && getLabel(conn)) {
      this.addLabel(RALPHElement, conn);
    }
    return this.get('canvas').addConnection(conn);
  }

  addRALPHElement(RALPHElement) {
    return RALPHElement.source && RALPHElement.target
      ? this._addRALPHConnection(RALPHElement)
      : this._addRALPHShape(RALPHElement);
  }
  importRALPHDiagram(RALPHElements) {
    RALPHElements.forEach(el => this.addRALPHElement(el));
  }

  importMixedDiagram(mixedData) {
    if (mixedData.ppinot) {
      this.importPPINOTDiagram(mixedData.ppinot);
    }
    if (mixedData.ralph) {
      this.importRALPHDiagram(mixedData.ralph);
    }
  }  setColors(idAndColorList) {
    const modeling = this.get('modeling');
    const elementRegistry = this.get('elementRegistry');
    idAndColorList.forEach(obj => {
      let elems;
      if (this._idMap[obj.id]) {
        elems = this._idMap[obj.id].map(i => elementRegistry.get(i));
      } else if (elementRegistry.get(obj.id) && elementRegistry.get(obj.id).type === 'bpmn:Task') {
        elems = [elementRegistry.get(obj.id)];
      }
      if (elems) {
        modeling.setColor(elems, {
          stroke: obj.fillColor !== '#ffffff' ? obj.fillColor : 'green',
          fill: '#fff'
        });
      }
    });
  }
}

