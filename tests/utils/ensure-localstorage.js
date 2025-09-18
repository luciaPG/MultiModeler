/**
 * Mock útil de localStorage para tests
 * Aisla la dependencia no determinista del localStorage real
 */

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    key: jest.fn((index) => Object.keys(store)[index]),
    get length() { return Object.keys(store).length; }
  };
})();

// Solo definir localStorage si no existe (evitar redefinición)
if (typeof global !== 'undefined' && !global.localStorage) {
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });
} else if (typeof global !== 'undefined' && global.localStorage) {
  // Si ya existe, reemplazar métodos con mocks
  global.localStorage.getItem = mockLocalStorage.getItem;
  global.localStorage.setItem = mockLocalStorage.setItem;
  global.localStorage.removeItem = mockLocalStorage.removeItem;
  global.localStorage.clear = mockLocalStorage.clear;
  global.localStorage.key = mockLocalStorage.key;
}

export function resetLocalStorageMock() {
  mockLocalStorage.clear();
  jest.clearAllMocks();
}

export { mockLocalStorage };
