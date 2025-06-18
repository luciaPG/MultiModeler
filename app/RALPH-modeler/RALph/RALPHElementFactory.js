import { assign } from 'min-dash';
import inherits from 'inherits';
import BpmnElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import BaseElementFactory from 'diagram-js/lib/core/ElementFactory';
import { DEFAULT_LABEL_SIZE } from 'bpmn-js/lib/util/LabelUtil';

export default function RALPHElementFactory(bpmnFactory, moddle, translate) {
  BpmnElementFactory.call(this, bpmnFactory, moddle, translate);

  this._moddle = moddle;
  this._translate = translate;
}

inherits(RALPHElementFactory, BpmnElementFactory);

RALPHElementFactory.$inject = [
  'bpmnFactory',
  'moddle',
  'translate'
];

RALPHElementFactory.prototype.baseCreate = BaseElementFactory.prototype.create;

RALPHElementFactory.prototype.create = function(elementType, attrs) {
  const type = attrs.type;

  if (elementType === 'label') {
    return this.baseCreate(elementType, assign({ type: 'label' }, DEFAULT_LABEL_SIZE, attrs));
  } else if (/^ralph:/.test(type)) {
    return this.createRALPHElement(elementType, attrs);
  } else {
    return this.createBpmnElement(elementType, attrs);
  }
};

RALPHElementFactory.prototype.createBpmnElement = function(elementType, attrs) {
  return BpmnElementFactory.prototype.create.call(this, elementType, attrs);
};

RALPHElementFactory.prototype.createRALPHElement = function(elementType, attrs) {
  const translate = this._translate;
  attrs = attrs || {};

  let businessObject = attrs.businessObject;

  if (!businessObject) {
    if (!attrs.type) {
      throw new Error(translate('no shape type specified'));
    }
    
    businessObject = this._createRALPHBO(attrs.type, attrs);
  }

  const size = this._getRALPHElementSize(attrs.type);

  // Create DI element with proper bounds
  const di = this._moddle.create('bpmndi:BPMNShape', {
    bounds: this._moddle.create('dc:Bounds', {
      width: size.width,
      height: size.height
    })
  });

  return this.baseCreate(elementType, assign({
    businessObject: businessObject,
    id: businessObject.id,
    di: di
  }, size, attrs));
};

RALPHElementFactory.prototype._createRALPHBO = function(elementType, attrs) {
  const businessObject = this._moddle.create(elementType, attrs);
  
  // Set type for XML serialization
  if (!businessObject.$type) {
    businessObject.$type = elementType;
  }

  // Generate unique ID if missing
  if (!businessObject.id) {
    const prefix = elementType.replace('ralph:', '') + '_';
    businessObject.id = this._moddle.ids.nextPrefixed(prefix, businessObject);
  }

  return businessObject;
};

RALPHElementFactory.prototype._getRALPHElementSize = function(type) {
  const shapes = {
    __default: { width: 100, height: 80 },
    'ralph:Resource': { width: 120, height: 100 },
    'ralph:ResourceType': { width: 110, height: 90 },
    'ralph:ResourcePool': { width: 140, height: 120 },
    'ralph:ActivityResource': { width: 100, height: 60 }
  };

  return shapes[type] || shapes.__default;
};