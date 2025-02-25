import { assign } from 'min-dash';
import inherits from 'inherits';
import BpmnElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import BaseElementFactory from 'diagram-js/lib/core/ElementFactory';
import { DEFAULT_LABEL_SIZE } from 'bpmn-js/lib/util/LabelUtil';
import { isPPINOTShape } from './Types';

export default function PPINOTElementFactory(bpmnFactory, moddle, translate) {
  BpmnElementFactory.call(this, bpmnFactory, moddle, translate);

  this._bpmnFactory = bpmnFactory;
  this._moddle = moddle;
  this._translate = translate;
}

inherits(PPINOTElementFactory, BpmnElementFactory);

PPINOTElementFactory.$inject = [
  'bpmnFactory',
  'moddle',
  'translate'
];

PPINOTElementFactory.prototype.baseCreate = BaseElementFactory.prototype.create;

PPINOTElementFactory.prototype.create = function(elementType, attrs) {
  if (attrs.type1) return;
  var type = attrs.type;

  if (elementType === 'label') {
    return this.baseCreate(elementType, assign({ type: 'label' }, DEFAULT_LABEL_SIZE, attrs));
  } else if (/^PPINOT:/.test(type)) {
    return this.createPPINOTElement(elementType, attrs);
  } else {
    return this.createBpmnElement(elementType, attrs);
  }
};

PPINOTElementFactory.prototype.createBpmnElement = function(elementType, attrs) {
  return BpmnElementFactory.prototype.create.call(this, elementType, attrs);
};

PPINOTElementFactory.prototype.createPPINOTElement = function(elementType, attrs) {
  var size, translate = this._translate;

  attrs = attrs || {};

  var businessObject = attrs.businessObject;

  if (!businessObject) {
    if (!attrs.type) {
      throw new Error(translate('no shape type specified'));
    }
    businessObject = this._createPPINOTBO(attrs.type, attrs);
  } else {
    businessObject = this._initBO(businessObject);
  }

  attrs = assign({
    businessObject: businessObject,
    id: businessObject.id
  }, size ? size : {}, attrs);

  return this.baseCreate(elementType, attrs);
};

PPINOTElementFactory.prototype._createPPINOTBO = function(elementType, attrs) {
  let businessObject = this._moddle.create(elementType, attrs); // Cambiado de this._bpmnFactory.create a this._moddle.create
  if (!businessObject.type) businessObject.type = elementType;

  if (!attrs.id) this._ensureId(attrs);

  if (attrs.id && !businessObject.id) {
    assign(businessObject, {
      id: attrs.id
    });
  }

  if (isPPINOTShape(elementType)) {
    assign(attrs, this._getPPINOTElementSize(elementType));
    assign(businessObject, this._getPPINOTElementSize(elementType));
  }

  businessObject = this._initBO(businessObject);

  return businessObject;
};

PPINOTElementFactory.prototype._ensureId = function(element) {
  if (!element.id) {
    let prefix = (element.type || '').replace(/^[^:]*:/g, '') + '_';
    element.id = this._moddle.ids.nextPrefixed(prefix, element);
  }
};

PPINOTElementFactory.prototype._initBO = function(businessObject) {
  Object.defineProperty(businessObject, '$model', {
    value: this._moddle
  });

  Object.defineProperty(businessObject, '$instanceOf', {
    value: function(type) {
      return this.type === type;
    }
  });

  Object.defineProperty(businessObject, 'get', {
    value: function(key) {
      return this[key];
    }
  });

  Object.defineProperty(businessObject, 'set', {
    value: function(key, value) {
      return this[key] = value;
    }
  });

  return businessObject;
};

// Aquí puedes definir las dimensiones de tus elementos personalizados
PPINOTElementFactory.prototype._getPPINOTElementSize = function(type) {
  var shapes = {
    __default: { width: 100, height: 80 },
    'PPINOT:AggregatedMeasure': { width: 120, height: 100 },
    'PPINOT:AggregatedMeasureMAX': { width: 120, height: 100 },
    'PPINOT:AggregatedMeasureAVG': { width: 120, height: 100 },
    'PPINOT:AggregatedMeasureMIN': { width: 120, height: 100 },
    'PPINOT:AggregatedMeasureSUM': { width: 120, height: 100 },
    'PPINOT:CountAggregatedMeasure': { width: 120, height: 100 },
    'PPINOT:TimeAggregatedMeasure': { width: 120, height: 100 },
    'PPINOT:CyclicTimeAggregatedMeasure': { width: 120, height: 100 },
    'PPINOT:CyclicTimeAggregatedMeasureMAX': { width: 120, height: 100 },
    'PPINOT:CyclicTimeAggregatedMeasureAVG': { width: 120, height: 100 },
    'PPINOT:CyclicTimeAggregatedMeasureMIN': { width: 120, height: 100 },
    'PPINOT:CyclicTimeAggregatedMeasureSUM': { width: 120, height: 100 },
    'PPINOT:CountMeasure': { width: 110, height: 90 },
    'PPINOT:DataAggregatedMeasure': { width: 120, height: 100 },
    'PPINOT:DataMeasure': { width: 110, height: 90 },
    'PPINOT:DataPropertyConditionAggregatedMeasure': { width: 130, height: 140 },
    'PPINOT:DataPropertyConditionMeasure': { width: 130, height: 130 },
    'PPINOT:DerivedMultiInstanceMeasure': { width: 120, height: 100 },
    'PPINOT:DerivedSingleInstanceMeasure': { width: 110, height: 90 },
    'PPINOT:TimeMeasure': { width: 110, height: 90 },
    'PPINOT:CyclicTimeMeasure': { width: 110, height: 90 },
    'PPINOT:CyclicTimeMeasureSUM': { width: 110, height: 90 },
    'PPINOT:CyclicTimeMeasureMIN': { width: 110, height: 90 },
    'PPINOT:CyclicTimeMeasureMAX': { width: 110, height: 90 },
    'PPINOT:CyclicTimeMeasureAVG': { width: 110, height: 90 },
    'PPINOT:Ppi': { width: 300, height: 250 },
    'PPINOT:StateConditionMeasure': { width: 110, height: 90 },
    'PPINOT:StateConditionAggregatedMeasure': { width: 120, height: 100 },
    'PPINOT:Target': { width: 100, height: 40 },
    'PPINOT:Scope': { width: 100, height: 35 },
    'PPINOT:BaseMeasure': { width: 110, height: 90 },
    'PPINOT:StateCondAggMeasureNumber': { width: 120, height: 100 },
    'PPINOT:StateCondAggMeasurePercentage': { width: 120, height: 100 },
    'PPINOT:StateCondAggMeasureAll': { width: 120, height: 100 },
    'PPINOT:StateCondAggMeasureAtLeastOne': { width: 120, height: 100 },
    'PPINOT:StateCondAggMeasureNo': { width: 120, height: 100 },
    'PPINOT:TimeAggregatedMeasureSUM': { width: 120, height: 100 },
    'PPINOT:TimeAggregatedMeasureMAX': { width: 120, height: 100 },
    'PPINOT:TimeAggregatedMeasureMIN': { width: 120, height: 100 },
    'PPINOT:TimeAggregatedMeasureAVG': { width: 120, height: 100 },
    'PPINOT:CountAggregatedMeasureSUM': { width: 120, height: 100 },
    'PPINOT:CountAggregatedMeasureMAX': { width: 120, height: 100 },
    'PPINOT:CountAggregatedMeasureMIN': { width: 120, height: 100 },
    'PPINOT:CountAggregatedMeasureAVG': { width: 120, height: 100 },
    'PPINOT:DataAggregatedMeasureSUM': { width: 120, height: 100 },
    'PPINOT:DataAggregatedMeasureMAX': { width: 120, height: 100 },
    'PPINOT:DataAggregatedMeasureMIN': { width: 120, height: 100 },
    'PPINOT:DataAggregatedMeasureAVG': { width: 120, height: 100 },
  };

  return shapes[type] || shapes.__default;
};