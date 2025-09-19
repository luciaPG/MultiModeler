/**
 * Mock de min-dash para Jest
 */

// Funciones básicas de min-dash que usa bpmn-js
const assign = (target, ...sources) => Object.assign(target, ...sources);
const isObject = (obj) => obj !== null && typeof obj === 'object';
const isArray = Array.isArray;
const forEach = (collection, iterator) => {
  if (isArray(collection)) {
    collection.forEach(iterator);
  } else if (isObject(collection)) {
    Object.keys(collection).forEach(key => iterator(collection[key], key));
  }
};

const pick = (obj, keys) => {
  const result = {};
  keys.forEach(key => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
};

const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

// Export como CommonJS para Jest
module.exports = {
  assign,
  isObject,
  isArray,
  forEach,
  pick,
  omit
};

// También como ESM
module.exports.default = module.exports;
