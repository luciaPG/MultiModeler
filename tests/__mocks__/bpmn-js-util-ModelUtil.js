/**
 * Mock de bpmn-js/lib/util/ModelUtil
 */

// Funciones básicas de ModelUtil que usa el código
const is = jest.fn((element, type) => {
  if (!element || !element.type) return false;
  return element.type === type || element.type.includes(type);
});

const getBusinessObject = jest.fn((element) => {
  return element?.businessObject || element || { id: 'mock-element' };
});

const getDi = jest.fn((element) => {
  return element?.di || { id: element?.id + '_di' };
});

// Export como CommonJS
module.exports = {
  is,
  getBusinessObject,
  getDi
};

// También como ESM
module.exports.default = module.exports;
