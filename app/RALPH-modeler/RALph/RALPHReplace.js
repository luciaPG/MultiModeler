import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function RALPHReplace(modeling, elementFactory, moddle) {
  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._moddle = moddle;
}

RALPHReplace.$inject = ['modeling', 'elementFactory', 'moddle'];

RALPHReplace.prototype.replaceElement = function(element, targetType) {
  const modeling = this._modeling;
  const elementFactory = this._elementFactory;
  const moddle = this._moddle;

  const newElement = elementFactory.createShape({ type: targetType });

  // Preserve business object properties
  const businessObject = element.businessObject;
  const newBusinessObject = newElement.businessObject;

  newBusinessObject.name = businessObject.name;
  newBusinessObject.description = businessObject.description;

  // Replace the element
  modeling.replaceShape(element, newElement);

  return newElement;
}; 