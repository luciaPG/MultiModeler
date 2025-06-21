import Modeler from 'bpmn-js/lib/Modeler';
import { assign } from 'min-dash';
import { isPPINOTConnection } from '../PPINOT-modeler/PPINOT/Types';
import { isLabelExternal, getLabel } from '../PPINOT-modeler/PPINOT/utils/LabelUtil';

import BaseModule from './BaseModule';
import PPINOTModule from '../PPINOT-modeler/PPINOT';
import RALPHModule from '../RALPH-modeler/RALph';

export default class BaseModeler extends Modeler {
  constructor(options = {}) {
    const {
      notations = [],
      enablePPINOT = false,
      enableRALPH = false,
      defaultNotation = 'bpmn',
      ...restOptions
    } = options;

    const enabledNotations = notations.length > 0 ? notations : [];
    if (notations.length === 0) {
      if (enablePPINOT) enabledNotations.push('ppinot');
      if (enableRALPH) enabledNotations.push('ralph');
    }

    const notationModules = BaseModeler._getNotationModules(enabledNotations);
    const modulesToInclude = [];
    if (enabledNotations.length > 0) {
      modulesToInclude.push(BaseModule);
    }
    modulesToInclude.push(...notationModules);

    const enhancedOptions = assign({}, restOptions, {
      additionalModules: [
        ...modulesToInclude,
        ...(restOptions.additionalModules || [])
      ]
    });

    super(enhancedOptions);

  }

  static _getNotationModules(notations) {
    const modules = [];
    if (notations.includes('ppinot')) modules.push(PPINOTModule);
    if (notations.includes('ralph')) modules.push(RALPHModule);
    return modules;
  }

  setNotationMode(mode) {
    if (!['ppinot', 'ralph', 'bpmn', 'mixed'].includes(mode)) {
      throw new Error('Invalid notation mode. Must be one of: ppinot, ralph, bpmn, mixed');
    }
    this._notationMode = mode;
    this._eventBus?.fire('notation.mode.changed', { mode });
  }

  getNotationMode() {
    return this._notationMode;
  }

  hasNotation(notation) {
    return this._enabledNotations.has(notation);
  }

  getEnabledNotations() {
    return Array.from(this._enabledNotations);
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

  _addPPINOTShape(PPINOTElement) {
    if (!this.hasNotation('ppinot')) {
      throw new Error('PPINOT notation is not enabled');
    }
    this._customElements.push(PPINOTElement);
    const shape = this.get('elementFactory').create('shape', assign({ businessObject: PPINOTElement }, PPINOTElement));
    if (isLabelExternal(PPINOTElement) && getLabel(shape)) {
      this.addLabel(PPINOTElement, shape);
    }
    return this.get('canvas').addShape(shape);
  }

  _addPPINOTConnection(PPINOTElement) {
    if (!this.hasNotation('ppinot')) {
      throw new Error('PPINOT notation is not enabled');
    }
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
    if (!this.hasNotation('ppinot')) {
      throw new Error('PPINOT notation is not enabled');
    }
    PPINOTElements.forEach(el => this.addPPINOTElement(el));
  }

  _addRALPHShape(RALPHElement) {
    if (!this.hasNotation('ralph')) {
      throw new Error('RALPH notation is not enabled');
    }
    this._customElements.push(RALPHElement);
    const shape = this.get('elementFactory').create('shape', assign({ businessObject: RALPHElement }, RALPHElement));
    if (isLabelExternal(RALPHElement) && getLabel(shape)) {
      this.addLabel(RALPHElement, shape);
    }
    return this.get('canvas').addShape(shape);
  }

  _addRALPHConnection(RALPHElement) {
    if (!this.hasNotation('ralph')) {
      throw new Error('RALPH notation is not enabled');
    }
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
    if (!this.hasNotation('ralph')) {
      throw new Error('RALPH notation is not enabled');
    }
    RALPHElements.forEach(el => this.addRALPHElement(el));
  }

  importMixedDiagram(mixedData) {
    if (mixedData.ppinot && this.hasNotation('ppinot')) {
      this.importPPINOTDiagram(mixedData.ppinot);
    }
    if (mixedData.ralph && this.hasNotation('ralph')) {
      this.importRALPHDiagram(mixedData.ralph);
    }
  }

  setColors(idAndColorList) {
    const modeling = this.get('modeling');
    const elementRegistry = this.get('elementRegistry');
    idAndColorList.forEach(obj => {
      let elems;
      if (this._idMap[obj.id]) {
        elems = this._idMap[obj.id].map(i => elementRegistry.get(i));
      } else if (elementRegistry.get(obj.id)?.type === 'bpmn:Task') {
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

  enableNotation(notation) {
    if (!['ppinot', 'ralph'].includes(notation)) {
      throw new Error('Invalid notation. Must be "ppinot" or "ralph"');
    }
    if (!this._enabledNotations.has(notation)) {
      this._enabledNotations.add(notation);
      console.log(`Notation "${notation}" enabled.`);
      this._eventBus?.fire('notation.enabled', { notation });
      this._refreshPalette();
    }
  }

  disableNotation(notation) {
    if (this._enabledNotations.has(notation)) {
      this._enabledNotations.delete(notation);
      console.log(`Notation "${notation}" disabled.`);
      this._eventBus?.fire('notation.disabled', { notation });
      this._refreshPalette();
    }
  }

  _refreshPalette() {
    try {
      this.get('palette')?.refresh();
      this.get('eventBus')?.fire('palette.refresh');
    } catch (err) {
      console.warn('Could not refresh palette:', err.message);
    }
  }

  isUnifiedModeler() {
    return true;
  }

  getConfiguration() {
    return {
      type: 'unified',
      enabledNotations: this.getEnabledNotations(),
      notationMode: this.getNotationMode(),
      isUnified: true
    };
  }
}
