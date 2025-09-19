/**
 * Setup para tests reales - Configuración mínima para que el código real funcione
 */

// Mock de localStorage para Node.js
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn(index => Object.keys(store)[index])
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Extender window existente (jsdom ya lo define)
if (typeof window !== 'undefined') {
  window.localStorage = localStorageMock;
  if (!window.location) {
    window.location = {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000'
    };
  }
} else {
  // Crear window si no existe
  global.window = {
    localStorage: localStorageMock,
    location: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000'
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
}

// Extender document existente si es necesario (jsdom ya lo define)
if (typeof document !== 'undefined' && document.getElementById) {
  // document ya existe, no hacer nada
} else {
  // Crear document básico solo si no existe
  global.document = {
    getElementById: jest.fn(),
    createElement: jest.fn(() => ({
      style: {},
      classList: { add: jest.fn(), remove: jest.fn() },
      addEventListener: jest.fn(),
      appendChild: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn()
    })),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([]),
    body: { appendChild: jest.fn(), style: {} }
  };
}

// Configurar console para tests reales (mantener logs importantes)
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // Solo mostrar warnings que NO sean de localStorage en tests
  const message = args.join(' ');
  if (!message.includes('localStorage') && !message.includes('Error al cargar')) {
    originalConsoleWarn(...args);
  }
};

// Limpiar estado antes de cada test
beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});
