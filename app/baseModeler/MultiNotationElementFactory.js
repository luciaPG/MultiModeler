// baseModeler/MultiNotationElementFactory.js
// Factory común para varias notaciones (PPINOT, RALPH, ...)
// Usa funciones auxiliares de los factories específicos para obtener info/tamaño/BO

import inherits from 'inherits';
import BaseElementFactory from 'diagram-js/lib/core/ElementFactory';
import { assign } from 'min-dash';

// Importa solo las funciones auxiliares necesarias de cada factory
import { PPINOTNotation } from '../PPINOT-modeler/PPINOT/PPINOTElementFactory';
// import { getRALPHElementSize, createRALPHBO } from '../RALPH-modeler/RALPH/RALPHElementFactory';

export default function MultiNotationElementFactory(moddle, translate) {
  BaseElementFactory.call(this);
  this._moddle = moddle;
  this._translate = translate;
}

inherits(MultiNotationElementFactory, BaseElementFactory);

MultiNotationElementFactory.$inject = [
  'moddle',
  'translate'
];

MultiNotationElementFactory.prototype.create = function(elementType, attrs) {
  attrs = attrs || {};
  let businessObject, size;

  if (/^PPINOT:/.test(attrs.type)) {
    businessObject = PPINOTNotation.createBO(attrs.type, attrs, this._moddle);
    size = PPINOTNotation.getElementSize(attrs.type);
  } 
  // else if (/^RALPH:/.test(attrs.type)) {
  //   businessObject = createRALPHBO(attrs.type, attrs, this._moddle);
  //   size = getRALPHElementSize(attrs.type);
  // }
  else {
    // Por defecto, tamaño y BO base
    businessObject = this._moddle.create(attrs.type, attrs);
    size = { width: 100, height: 80 };
  }

  // Ensure valid coordinates and dimensions
  const validAttrs = assign({
    businessObject: businessObject,
    id: businessObject.id,
    x: isFinite(attrs.x) ? attrs.x : 0,
    y: isFinite(attrs.y) ? attrs.y : 0,
    width: isFinite(size.width) && size.width > 0 ? size.width : 100,
    height: isFinite(size.height) && size.height > 0 ? size.height : 80
  }, attrs);

  return this.baseCreate(elementType, validAttrs);
};

// Recuerda exportar las funciones auxiliares en los factories de PPINOT/RALPH:
// export function getPPINOTElementSize(type) { ... }
// export function createPPINOTBO(type, attrs, moddle) { ... }
