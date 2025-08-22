// MultiNotationModeler - Main modeler that integrates BPMN, PPINOT, and RALPH notations
import Modeler from 'bpmn-js/lib/Modeler';
import { assign } from 'min-dash';

// Import moddle extensions
import PPINOTModule from '../modelers/ppinot/index.js';
import RALPHModule from '../modelers/ralph/index.js';

/**
 * MultiNotationModeler extends the BPMN-JS Modeler to integrate multiple notation systems
 * including PPINOT for PPI indicators and RALPH for resource handling
 */
export default class MultiNotationModeler extends Modeler {
  constructor(options = {}) {
    // Enhanced options with additional modules
    const enhancedOptions = assign({}, options, {
      additionalModules: [
        // Base module will be added through the setup process
        PPINOTModule,
        RALPHModule,
        ...(options.additionalModules || [])
      ]
    });

    // Call the parent constructor
    super(enhancedOptions);
    
    // Custom elements storage
    this._customElements = [];
    
    // Event handling setup for cross-notation synchronization
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for synchronization between notations
   * @private
   */
  setupEventHandlers() {
    const eventBus = this.get('eventBus');
    
    if (eventBus) {
      // Listen for element changes to update custom elements
      eventBus.on('element.changed', (event) => {
        this.updateCustomElements(event.element);
      });
      
      // Listen for elements deleted to remove custom elements
      eventBus.on('elements.delete', (event) => {
        this.removeCustomElements(event.elements);
      });
      
      // Listen for PPINOT-specific events
      eventBus.on('ppinot.element.added', (event) => {
        this._customElements.push(event.element);
      });
      
      // Listen for RALPH-specific events
      eventBus.on('ralph.element.added', (event) => {
        this._customElements.push(event.element);
      });
    }
  }

  /**
   * Update custom elements when BPMN elements change
   * @param {Object} element - Changed element
   * @private
   */
  updateCustomElements(element) {
    // Implementation depends on specific business logic
    // Update related custom elements when a BPMN element changes
  }

  /**
   * Remove custom elements when BPMN elements are deleted
   * @param {Array} elements - Deleted elements
   * @private
   */
  removeCustomElements(elements) {
    if (!elements || !elements.length) return;
    
    // Filter out deleted elements from custom elements
    this._customElements = this._customElements.filter(customEl => {
      return !elements.some(el => {
        return customEl.source === el.id || 
               customEl.target === el.id || 
               customEl.id === el.id;
      });
    });
  }

  /**
   * Clear all elements including custom elements
   */
  clear() {
    this._customElements = [];
    return super.clear();
  }

  /**
   * Get all custom elements
   * @returns {Array} Custom elements
   */
  getCustomElements() {
    return this._customElements;
  }

  /**
   * Add custom elements to the storage
   * @param {Array} elements - Elements to add
   */
  addCustomElements(elements) {
    this._customElements.push(...elements);
  }

  /**
   * Get all elements including BPMN and custom elements
   * @returns {Array} All elements
   */
  getAllElements() {
    const elementRegistry = this.get('elementRegistry');
    const bpmnElements = elementRegistry.getAll();
    return [...bpmnElements, ...this._customElements];
  }

  /**
   * Import a diagram including BPMN, PPINOT, and RALPH notations
   * @param {String} xml - XML diagram content
   * @param {Object} options - Import options
   * @returns {Promise} Import result
   */
  async importXML(xml, options) {
    const result = await super.importXML(xml, options);
    
    // After BPMN import, handle PPINOT and RALPH elements
    try {
      this.importCustomNotations(xml);
    } catch (error) {
      console.error('Error importing custom notations:', error);
    }
    
    return result;
  }

  /**
   * Import custom notations from XML
   * @param {String} xml - XML content
   * @private
   */
  importCustomNotations(xml) {
    // Parse XML to extract PPINOT and RALPH elements
    // This would need specific implementation based on your XML format
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    
    // Example: import PPINOT elements
    this.importPPINOTElements(xmlDoc);
    
    // Example: import RALPH elements
    this.importRALPHElements(xmlDoc);
  }

  /**
   * Import PPINOT elements from XML document
   * @param {Document} xmlDoc - XML document
   * @private
   */
  importPPINOTElements(xmlDoc) {
    // Implementation would depend on your PPINOT XML structure
    // Find PPINOT elements in the XML and create them in the modeler
  }

  /**
   * Import RALPH elements from XML document
   * @param {Document} xmlDoc - XML document
   * @private
   */
  importRALPHElements(xmlDoc) {
    // Implementation would depend on your RALPH XML structure
    // Find RALPH elements in the XML and create them in the modeler
  }

  /**
   * Export the diagram including all notations
   * @returns {Promise<String>} Exported XML
   */
  async exportXML() {
    const result = await super.exportXML();
    
    // Enhance the XML with custom notations
    const enhancedXml = this.enhanceExportWithCustomNotations(result.xml);
    
    return {
      xml: enhancedXml
    };
  }

  /**
   * Enhance exported XML with custom notations
   * @param {String} xml - BPMN XML
   * @returns {String} Enhanced XML
   * @private
   */
  enhanceExportWithCustomNotations(xml) {
    // Implementation would depend on how you want to integrate
    // PPINOT and RALPH elements into the BPMN XML
    return xml;
  }
}
