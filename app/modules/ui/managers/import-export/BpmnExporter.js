/**
 * BpmnExporter - Handles BPMN data export functionality
 * 
 * Responsible for:
 * - Capturing BPMN XML from canvas
 * - Capturing PPINOT elements
 * - Capturing RALPH elements
 * - Managing canvas state
 */

import { resolve } from '../../../../services/global-access.js';

export class BpmnExporter {
  constructor(config) {
    this.config = config;
  }

  /**
   * Captures BPMN data from the current canvas state
   */
  async captureBpmnFromCanvas() {
    const modeler = resolve('BpmnModeler');
    const data = this.initializeBpmnData();
    
    if (!modeler) {
      console.warn('⚠️ Modeler not available for capture');
      return data;
    }

    try {
      await this.captureXMLDiagram(modeler, data);
      await this.capturePPINOTElements(modeler, data);
      await this.captureRALPHElements(modeler, data);
      this.captureCanvasState(modeler, data);
      
    } catch (error) {
      console.error('❌ Error capturing BPMN from canvas:', error);
    }
    
    return data;
  }

  initializeBpmnData() {
    return {
      diagram: null,
      relationships: [],
      elements: {},
      canvas: null,
      ppinotElements: [],
      ralphElements: []
    };
  }

  async captureXMLDiagram(modeler, data) {
    const result = await modeler.saveXML({ format: true });
    data.diagram = result.xml;
    console.log('✅ XML diagram captured');
    
    // Import RelationshipCapture here to avoid circular dependency
    const { RelationshipCapture } = await import('./RelationshipCapture.js');
    const relationshipCapture = new RelationshipCapture(this.config);
    
    // Capture parent-child relationships
    data.relationships = relationshipCapture.captureParentChildRelationships(modeler);
    console.log(`✅ ${data.relationships.length} parent-child relationships captured`);
  }

  async capturePPINOTElements(modeler, data) {
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    const ppinotElements = allElements.filter(el => 
      el.type && (el.type.includes('PPINOT:') || el.type.includes('ppinot:'))
    );
    
    console.log(`🔍 XML verification: ${ppinotElements.length} PPINOT elements in canvas`);
    
    const missingFromXml = ppinotElements.filter(el => 
      !data.diagram.includes(`id="${el.id}"`)
    );
    
    if (missingFromXml.length > 0) {
      console.log(`📋 Saving ${missingFromXml.length} PPINOT elements separately...`);
      data.ppinotElements = this.serializePPINOTElements(ppinotElements);
      console.log(`✅ ${data.ppinotElements.length} PPINOT elements saved separately`);
    }
    
    // Capture PPINOT data from modeler if available
    if (modeler.getJson && typeof modeler.getJson === 'function') {
      const ppinotData = modeler.getJson();
      data.ppinotElements = ppinotData.definitions || [];
      data.ppinotDiagram = ppinotData.diagram || [];
      data.ppinotIdMap = ppinotData.idMap || {};
      console.log(`✅ ${data.ppinotElements.length} PPINOT elements from modeler`);
    }
  }

  async captureRALPHElements(modeler, data) {
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    const ralphElements = allElements.filter(el => 
      el.type && (el.type.includes('RALph:') || el.type.includes('ralph:'))
    );
    
    if (ralphElements.length > 0) {
      data.ralphElements = this.serializeRALPHElements(ralphElements);
      console.log(`✅ ${data.ralphElements.length} RALPH elements saved separately`);
    } else {
      data.ralphElements = [];
      console.log('✅ 0 RALPH elements captured');
    }
  }

  captureCanvasState(modeler, data) {
    const canvas = modeler.get('canvas');
    if (canvas) {
      data.canvas = {
        zoom: canvas.zoom(),
        viewbox: canvas.viewbox()
      };
      console.log('✅ Canvas state captured');
    }
  }

  serializePPINOTElements(elements) {
    return elements.map(el => ({
      type: el.type,
      id: el.id,
      width: el.width || 100,
      height: el.height || 80,
      x: el.x || 0,
      y: el.y || 0,
      text: el.businessObject && el.businessObject.name || null,
      parent: el.parent && el.parent.id || null
    }));
  }

  serializeRALPHElements(elements) {
    return elements.map(el => ({
      type: el.type,
      id: el.id,
      width: el.width || 50,
      height: el.height || 50,
      x: el.x || 0,
      y: el.y || 0,
      text: el.businessObject && el.businessObject.name || null,
      parent: el.parent && el.parent.id || null
    }));
  }

  /**
   * Captures RALPH elements directly from canvas
   */
  async captureRalphFromCanvas() {
    const modeler = resolve('BpmnModeler');
    const data = {
      elements: [],
      captureDate: new Date().toISOString()
    };
    
    if (modeler) {
      try {
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        const ralphElements = this.filterRALPHElements(allElements);
        
        data.elements = this.serializeRALPHElementsForExport(ralphElements);
        console.log(`✅ ${data.elements.length} RALPH elements captured from canvas`);
        
      } catch (error) {
        console.warn('⚠️ Error capturing RALPH elements:', error);
      }
    }
    
    return data;
  }

  filterRALPHElements(allElements) {
    return allElements.filter(element => 
      (element.type && element.type.includes('RALPH')) ||
      (element.businessObject && element.businessObject.$type && element.businessObject.$type.includes('RALPH'))
    );
  }

  serializeRALPHElementsForExport(ralphElements) {
    return ralphElements.map(element => ({
      id: element.id,
      type: element.type,
      name: this.getElementName(element),
      position: this.getElementPosition(element),
      properties: element.businessObject ? {
        name: element.businessObject.name,
        type: element.businessObject.$type
      } : {}
    }));
  }

  // Utility methods
  getElementName(element) {
    if (!element) return '';
    if (element.businessObject && element.businessObject.name) {
      return element.businessObject.name;
    }
    if (element.name) return element.name;
    return element.id || '';
  }

  getElementPosition(element) {
    if (!element) return { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 0,
      height: element.height || 0
    };
  }
}
