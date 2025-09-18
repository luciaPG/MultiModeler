/**
 * Mock de inherits-browser para Jest
 */

// Implementación básica de herencia para tests
function inherits(ctor, superCtor) {
  if (superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  }
}

// Export como CommonJS para Jest
module.exports = inherits;

// También como ESM
module.exports.default = inherits;
