/**
 * Configuración de Jest para las pruebas del TFG
 * Estructura basada en el Capítulo 8: Pruebas y Validación
 */

module.exports = {
  // Configuración base
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
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

  // Archivos a ignorar
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/sprint1/' // Archivos antiguos
  ],

  // Configuración de cobertura
  collectCoverage: true,
  coverageDirectory: 'reports/coverage-tfg',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Incluir todos los archivos fuente para cobertura
  collectCoverageFrom: [
    'app/**/*.js',
    '!app/node_modules/**',
    '!app/**/*.test.js',
    '!app/**/*.spec.js'
  ],

  // Umbrales de cobertura realistas para TFG
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 8,
      lines: 10,
      statements: 10
    },
    // Umbrales específicos para módulos críticos
    '**/modules/ui/core/**': {
      statements: 50,
      functions: 60,
      branches: 40,
      lines: 50
    },
    '**/modules/rasci/**': {
      statements: 15,
      functions: 20,
      branches: 10,
      lines: 15
    }
  },

  // Configuración específica por tipo de prueba
  projects: [
    {
      displayName: '8.1 Pruebas Unitarias',
      testMatch: ['<rootDir>/tests/8.1-unitarias/**/*.test.js'],
      coverageDirectory: 'reports/coverage-tfg/unitarias'
    },
    {
      displayName: '8.2 Pruebas de Integración',
      testMatch: ['<rootDir>/tests/8.2-integracion/**/*.test.js'],
      coverageDirectory: 'reports/coverage-tfg/integracion'
    },
    {
      displayName: '8.3 Pruebas UI/E2E',
      testMatch: ['<rootDir>/tests/8.3-ui-e2e/**/*.test.js'],
      testEnvironment: 'jsdom',
      coverageDirectory: 'reports/coverage-tfg/ui-e2e'
    },
    {
      displayName: '8.4 Pruebas de Aceptación',
      testMatch: ['<rootDir>/tests/8.4-aceptacion/**/*.test.js'],
      coverageDirectory: 'reports/coverage-tfg/aceptacion'
    }
  ],

  // Reportes personalizados
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './reports/tfg-test-results',
      outputName: 'junit-tfg.xml'
    }]
  ],

  // Configuración de timeout para pruebas más complejas
  testTimeout: 30000,

  // Verbose para mostrar detalles de cada prueba
  verbose: true
};
