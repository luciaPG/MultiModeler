// baseModeler/MultiNotationElementFactory.js
// Factory común para varias notaciones (PPINOT, RALPH, ...)
// Usa el BpmnElementFactory para crear elementos PPINOT con labels externas automáticas

import inherits from 'inherits';
import BpmnElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import { assign } from 'min-dash';

// Importa solo las funciones auxiliares necesarias de cada factory
import { PPINOTNotation } from '../PPINOT-modeler/PPINOT/PPINOTElementFactory';
// import { getRALPHElementSize, createRALPHBO } from '../RALPH-modeler/RALPH/RALPHElementFactory';

export default function MultiNotationElementFactory(bpmnFactory, moddle, translate) {
  BpmnElementFactory.call(this, bpmnFactory, moddle, translate);
}

inherits(MultiNotationElementFactory, BpmnElementFactory);

MultiNotationElementFactory.$inject = [
  'bpmnFactory',
  'moddle',
  'translate'
];

MultiNotationElementFactory.prototype.create = function(elementType, attrs) {
  attrs = attrs || {};

  if (/^PPINOT:/.test(attrs.type)) {
    // For PPINOT elements, override the businessObject and size, 
    // and let BpmnElementFactory handle everything including external labels
    const businessObject = PPINOTNotation.createBO(attrs.type, attrs, this._moddle);
    const size = PPINOTNotation.getElementSize(attrs.type);
    
    // Merge custom attrs with PPINOT-specific data
    const ppinotAttrs = assign({
      businessObject: businessObject,
      id: businessObject.id
    }, size, attrs);
    
    // Call parent create method - it should handle external labels if PPINOTLabelUtil works correctly
    return BpmnElementFactory.prototype.create.call(this, elementType, ppinotAttrs);
  }
  // else if (/^RALPH:/.test(attrs.type)) {
  //   // Handle RALPH elements similarly
  //   return BpmnElementFactory.prototype.create.call(this, elementType, attrs);
  // }
  else {
    // For standard BPMN elements, use parent factory
    return BpmnElementFactory.prototype.create.call(this, elementType, attrs);
  }
};
