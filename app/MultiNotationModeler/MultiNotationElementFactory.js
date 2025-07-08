// baseModeler/MultiNotationElementFactory.js
// Factory común para varias notaciones (PPINOT, RALPH, ...)
// Usa el BpmnElementFactory para crear elementos PPINOT con labels externas automáticas

import inherits from 'inherits';
import BpmnElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import { assign } from 'min-dash';
import { PPINOTNotation } from '../PPINOT-modeler/PPINOT/PPINOTElementFactory';

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
    const businessObject = PPINOTNotation.createBO(attrs.type, attrs, this._moddle);
    const size = PPINOTNotation.getElementSize(attrs.type);
    const ppinotAttrs = assign({
      businessObject: businessObject,
      id: businessObject.id
    }, size, attrs);
    return BpmnElementFactory.prototype.create.call(this, elementType, ppinotAttrs);
  } else {
    return BpmnElementFactory.prototype.create.call(this, elementType, attrs);
  }
};

export function CustomElementFactoryProvider(type = 'PPINOT') {
  let factory;
  switch (type) {
    case 'PPINOT':
      factory = MultiNotationElementFactory;
      break;
    default:
      factory = MultiNotationElementFactory;
  }

  return {
    __init__: ['elementFactory'],
    elementFactory: ['type', factory]
  };
}

// Uso en la inicialización del modelador:
// import CustomElementFactoryProvider from './baseModeler/CustomElementFactoryProvider';
// const modeler = new Modeler({
//   ..., 
//   additionalModules: [
//     CustomElementFactoryProvider('PPINOT'),
//     ...otrosModulos
//   ]
// });

