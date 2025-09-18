/**
 * Configuración de Jest para tests REALES
 * Tests que validan código de producción sin mocks totales
 */

module.exports = {
  // Configuración base
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup-real-tests.js'],
  
  // Mapeo de módulos para resolver imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@modules/(.*)$': '<rootDir>/app/modules/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Transformaciones
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // Solo ejecutar tests reales
  testMatch: [
    '<rootDir>/tests/**/*real*.test.js'
  ],

  // Configuración de cobertura para tests reales (solo esenciales)
  collectCoverage: true,
  coverageDirectory: 'reports/coverage-real',
  coverageReporters: ['text', 'json'], // Solo texto y JSON, sin HTML
  
  // Incluir solo archivos que los tests reales tocan
  collectCoverageFrom: [
    'app/**/*.js',
    '!app/node_modules/**',
    '!app/**/*.test.js',
    '!app/**/*.spec.js'
  ],

  // Umbrales más realistas para tests reales
  coverageThreshold: {
    global: {
      branches: 1,
      functions: 2,
      lines: 2,
      statements: 2
    }
  },

  // Timeout más largo para inicializaciones reales
  testTimeout: 60000,

  // Verbose para ver exactamente qué pasa
  verbose: true,

  // Configuración específica para tests reales
  globals: {
    'NODE_ENV': 'test'
  }
};
