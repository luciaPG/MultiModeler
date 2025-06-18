import {
  assign
} from 'min-dash';

import inherits from 'inherits';

import BpmnElementFactory from 'bpmn-js/lib/features/modeling/ElementFactory';
import {
  DEFAULT_LABEL_SIZE
} from 'bpmn-js/lib/util/LabelUtil';
import BaseElementFactory from "diagram-js/lib/core/ElementFactory";
import {is} from "bpmn-js/lib/util/ModelUtil";
import {isAny} from "bpmn-js/lib/features/modeling/util/ModelingUtil";

import {custom, isCustomShape} from "./Types";


/**
 * this module is used to define the properties of the custom elements and it is also used to define the default dimensiones of the elements 
 */
export default function RALphElementFactory(bpmnFactory, moddle, translate) {
  BpmnElementFactory.call(this, bpmnFactory, moddle, translate);

  /**
   * Create a diagram-js element with the given type (any of shape, connection, label).
   *
   * @param  {String} elementType
   * @param  {Object} attrs
   *
   * @return {djs.model.Base}
   */
}

inherits(RALphElementFactory, BpmnElementFactory);

RALphElementFactory.$inject = [
  'bpmnFactory',
  'moddle',
  'translate'
];

RALphElementFactory.prototype.baseCreate = BaseElementFactory.prototype.create;

RALphElementFactory.prototype.create = function(elementType, attrs) {
  if(attrs.type1) return
  var type = attrs.type;

  if (elementType === 'label')
    return this.baseCreate(elementType, assign({ type: 'label' }, DEFAULT_LABEL_SIZE, attrs));
  else if (/^RALph:/.test(type))
    return this.createRALphElement(elementType, attrs);
  else
    return this.createBpmnElement(elementType, attrs);
};

RALphElementFactory.prototype._ensureId = function(element) {

  // generate semantic ids for elements
  // bpmn:SequenceFlow -> SequenceFlow_ID


  if (!element.id) {
    let prefix = (element.type || '').replace(/^[^:]*:/g, '') + '_';
    element.id = this._moddle.ids.nextPrefixed(prefix, element);
  }
};

RALphElementFactory.prototype._initBO = function(businessObject) {
  Object.defineProperty(businessObject, '$model', {
    value: this._moddle
  });

  // ensures we can use ModelUtil#is for type checks
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

  return businessObject
}

RALphElementFactory.prototype._createRALphBO = function(elementType, attrs) {
  let businessObject = Object.assign({}, attrs.businessObject)
  if (!businessObject.type)
    businessObject.type = elementType

  if(!attrs.id)
    this._ensureId(attrs)

  if (attrs.id && !businessObject.id) {
    assign(businessObject, {
      id: attrs.id
    });
  }


  // add width and height if shape
  if (isCustomShape(elementType)) {
    assign(attrs, this._getRALphElementSize(elementType));
    assign(businessObject, this._getRALphElementSize(elementType))
  }


  // we mimic the ModdleElement API to allow interoperability with
  // other components, i.e. the Modeler and Properties Panel

  businessObject = this._initBO(businessObject)

  // END minic ModdleElement API
  return businessObject
}

RALphElementFactory.prototype.createRALphElement = function(elementType, attrs) {//here RALph elements are created:
  var size,
      translate = this._translate;

  attrs = attrs || {};

  var businessObject = attrs.businessObject;

  if (!businessObject) {
    if (!attrs.type) {
      throw new Error(translate('no shape type specified'));
    }
    businessObject = this._createRALphBO(attrs.type, attrs)
    // size = this._getRALphElementSize(attrs.type);
    // businessObject = assign(businessObject, size);
  }
  else
    businessObject = this._initBO(businessObject)
    businessObject.name='prueba'


  attrs = assign({//here the properties of the objects in the diagram are defined:
    businessObject: businessObject,
    id: businessObject.id,
    text:elementType,
  }, size ? size : {}, attrs);

  return this.baseCreate(elementType, attrs);
};

RALphElementFactory.prototype._getRALphElementSize = function(type) {//here the default dimensions (width and height) of the elements are defined
  var shapes = {
    __default: { width: 100, height: 80 },
    'RALph:Person':{width: 58, height: 75},
    'RALph:RoleRALph':{width: 58, height: 81},
    'RALph:Personcap':{width:60,height:75},
    'RALph:Orgunit':{width:79,height:56},
    'RALph:Position':{width:58,height:75},
    'RALph:History-Same':{width:36,height:45},
    'RALph:History-Any':{width:54,height:60},
    'RALph:History-Any-Red':{width:104,height:110},
    'RALph:History-Any-Green':{width:104,height:110},
    'RALph:History-Same-Red':{width:100,height:109},
    'RALph:History-Same-Green':{width:100,height:109},
    'RALph:Complex-Assignment-AND':{width:96,height:100},
    'RALph:Complex-Assignment-OR':{width:96,height:100},
    'RALph:reportsDirectly':{width:126, height:232},
    'RALph:reportsTransitively':{width:126, height:232},
    'RALph:delegatesDirectly':{width:126, height:232},
    'RALph:delegatesTransitively':{width:126, height:232},
    'RALph:History-AnyInstanceInTime-Green':{width:120, height:120},
    'RALph:History-AnyInstanceInTime-Red':{width:120, height:120}


  };

  return shapes[type] || shapes.__default;
};
