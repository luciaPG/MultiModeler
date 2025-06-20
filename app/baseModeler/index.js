import Modeler from 'bpmn-js/lib/Modeler';
import { assign } from 'min-dash';
import { isPPINOTConnection } from '../PPINOT-modeler/PPINOT/Types';
import { isLabelExternal, getLabel } from '../PPINOT-modeler/PPINOT/utils/LabelUtil';

// Base module with common functionality
import BaseModule from './BaseModule';

// Available notation modules
import PPINOTModule from '../PPINOT-modeler/PPINOT';
import RALPHModule from '../RALPH-modeler/RALph';

export default class BaseModeler extends Modeler {
  constructor(options = {}) {
    // Handle the unified architecture: extract notations from options
    const {
      notations = [],
      enablePPINOT = false,
      enableRALPH = false,
      defaultNotation = 'bpmn',
      ...restOptions
    } = options;

    // Build notations array if not explicitly provided
    const enabledNotations = notations.length > 0 ? notations : [];
    if (notations.length === 0) {
      if (enablePPINOT) enabledNotations.push('ppinot');
      if (enableRALPH) enabledNotations.push('ralph');
    }    // Configure which notation modules to include
    const notationModules = BaseModeler._getNotationModules(enabledNotations);
    
    // Only include BaseModule if we have notations or need custom functionality
    const modulesToInclude = [];
    
    // Add BaseModule only if we have enabled notations
    if (enabledNotations.length > 0) {
      modulesToInclude.push(BaseModule);
    }
      // Add notation-specific modules
    modulesToInclude.push(...notationModules);
    
    // Merge modules with ALL options (including container)
    const enhancedOptions = assign({}, restOptions, {
      additionalModules: [
        ...modulesToInclude,
        ...(restOptions.additionalModules || [])
      ]
    });    super(enhancedOptions);
    
    this._customElements = [];
    this._idMap = [];
    this.modelOpen = false;
    this._enabledNotations = new Set(enabledNotations);
    this._notationMode = defaultNotation;

    console.log('BaseModeler created with notations:', enabledNotations, 'mode:', defaultNotation);
  }

  /**
   * Get notation modules based on requested notations
   * @param {Array<string>} notations - Array of notation names ('ppinot', 'ralph')
   * @returns {Array} Array of notation modules
   */
  static _getNotationModules(notations) {
    const modules = [];
    
    if (notations.includes('ppinot')) {
      modules.push(PPINOTModule);
    }
    
    if (notations.includes('ralph')) {
      modules.push(RALPHModule);
    }
    
    return modules;
  }

  /**
   * Set the notation mode
   * @param {string} mode - 'ppinot', 'ralph', 'bpmn', or 'mixed'
   */
  setNotationMode(mode) {
    if (!['ppinot', 'ralph', 'bpmn', 'mixed'].includes(mode)) {
      throw new Error('Invalid notation mode. Must be one of: ppinot, ralph, bpmn, mixed');
    }
    
    this._notationMode = mode;
    
    // Fire event for other components to react
    if (this._eventBus) {
      this._eventBus.fire('notation.mode.changed', { mode });
    }
  }

  /**
   * Get current notation mode
   */
  getNotationMode() {
    return this._notationMode;
  }

  /**
   * Check if a notation is enabled
   * @param {string} notation - The notation to check
   * @returns {boolean}
   */
  hasNotation(notation) {
    return this._enabledNotations.has(notation);
  }

  /**
   * Get list of enabled notations
   * @returns {Array<string>}
   */
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

  // PPINOT-specific methods (only available if PPINOT notation is enabled)
  _addPPINOTShape(PPINOTElement) {
    if (!this.hasNotation('ppinot')) {
      throw new Error('PPINOT notation is not enabled');
    }

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

  _addPPINOTConnection(PPINOTElement) {
    if (!this.hasNotation('ppinot')) {
      throw new Error('PPINOT notation is not enabled');
    }

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

  addPPINOTElement(PPINOTElement) {
    if (isPPINOTConnection(PPINOTElement)) {
      return this._addPPINOTConnection(PPINOTElement);
    } else {
      return this._addPPINOTShape(PPINOTElement);
    }
  }

  importPPINOTDiagram(PPINOTElements) {
    if (!this.hasNotation('ppinot')) {
      throw new Error('PPINOT notation is not enabled');
    }
    
    PPINOTElements.forEach(element => {
      this.addPPINOTElement(element);
    });
  }

  // RALPH-specific methods (only available if RALPH notation is enabled)
  _addRALPHShape(RALPHElement) {
    if (!this.hasNotation('ralph')) {
      throw new Error('RALPH notation is not enabled');
    }

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

  _addRALPHConnection(RALPHElement) {
    if (!this.hasNotation('ralph')) {
      throw new Error('RALPH notation is not enabled');
    }

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

  addRALPHElement(RALPHElement) {
    // Simple type check for RALPH connections
    if (RALPHElement.source && RALPHElement.target) {
      return this._addRALPHConnection(RALPHElement);
    } else {
      return this._addRALPHShape(RALPHElement);
    }
  }

  importRALPHDiagram(RALPHElements) {
    if (!this.hasNotation('ralph')) {
      throw new Error('RALPH notation is not enabled');
    }
    
    RALPHElements.forEach(element => {
      this.addRALPHElement(element);
    });
  }

  // Mixed notation methods
  importMixedDiagram(mixedData) {
    if (mixedData.ppinot && this.hasNotation('ppinot')) {
      this.importPPINOTDiagram(mixedData.ppinot);
    }
    if (mixedData.ralph && this.hasNotation('ralph')) {
      this.importRALPHDiagram(mixedData.ralph);
    }
  }

  // Color setting method (used by both PPINOT and RALPH)
  setColors(idAndColorList) {
    const modeling = this.get('modeling');
    const elementRegistry = this.get('elementRegistry');

    idAndColorList.forEach(obj => {
      let element;
      obj.ids.forEach(id => {
        if (this._idMap[id]) {
          element = this._idMap[id].map(i => elementRegistry.get(i));
        } else if (elementRegistry.get(id) && elementRegistry.get(id).type === 'bpmn:Task') {
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

  // Unified modeler helper methods
  
  /**
   * Enable a notation dynamically
   * @param {string} notation - The notation to enable ('ppinot' or 'ralph')
   */
  enableNotation(notation) {
    if (!['ppinot', 'ralph'].includes(notation)) {
      throw new Error('Invalid notation. Must be "ppinot" or "ralph"');
    }
    
    if (!this._enabledNotations.has(notation)) {
      this._enabledNotations.add(notation);
      console.log(`Notation "${notation}" enabled.`);
      
      // Fire event for palette and other components to update
      if (this._eventBus) {
        this._eventBus.fire('notation.enabled', { notation });
      }
      
      // Refresh palette if available
      this._refreshPalette();
    }
  }

  /**
   * Disable a notation
   * @param {string} notation - The notation to disable
   */
  disableNotation(notation) {
    if (this._enabledNotations.has(notation)) {
      this._enabledNotations.delete(notation);
      console.log(`Notation "${notation}" disabled.`);
      
      // Fire event for palette and other components to update
      if (this._eventBus) {
        this._eventBus.fire('notation.disabled', { notation });
      }
      
      // Refresh palette if available
      this._refreshPalette();
    }
  }
  /**
   * Refresh the palette after notation changes
   * @private
   */
  _refreshPalette() {
    try {
      const palette = this.get('palette');
      if (palette && palette.refresh) {
        palette.refresh();
      }
      
      const eventBus = this.get('eventBus');
      if (eventBus) {
        eventBus.fire('palette.refresh');
      }
    } catch (error) {
      console.warn('Could not refresh palette:', error.message);
    }
  }

  /**
   * Check if this is the unified modeler (always true for BaseModeler)
   * @returns {boolean}
   */
  isUnifiedModeler() {
    return true;
  }
  /**
   * Get configuration summary
   * @returns {Object}
   */
  getConfiguration() {
    return {
      type: 'unified',
      enabledNotations: this.getEnabledNotations(),
      notationMode: this.getNotationMode(),
      isUnified: true
    };
  }
}