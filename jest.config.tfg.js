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
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    // SOLUCIÓN ESM: Mock completo de bpmn-js y dependencias ESM
    '^bpmn-js/lib/Modeler$': '<rootDir>/tests/__mocks__/bpmn-js.js',
    '^bpmn-js$': '<rootDir>/tests/__mocks__/bpmn-js.js',
    '^bpmn-js/lib/util/ModelUtil$': '<rootDir>/tests/__mocks__/bpmn-js-util-ModelUtil.js',
    '^bpmn-js/(.*)$': '<rootDir>/tests/__mocks__/bpmn-js.js',
    '^diagram-js/(.*)$': '<rootDir>/tests/__mocks__/bpmn-js.js',
    '^min-dash$': '<rootDir>/tests/__mocks__/min-dash.js',
    '^inherits-browser$': '<rootDir>/tests/__mocks__/inherits-browser.js'
  },

  // Transformaciones
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Configuración de módulos
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],

  // SOLUCIÓN ESM: Permitir transformación de dependencias ESM específicas (mejorada)
  transformIgnorePatterns: [
    '/node_modules/(?!bpmn-js|diagram-js|didi|min-dash|min-dom|tiny-svg|ids|inherits-browser|moddle|moddle-xml|bpmn-moddle)'
  ],

  // Archivos a ignorar - configuración estricta para evitar variaciones
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/public/', // Archivos públicos que contienen test() pero no son tests
    '<rootDir>/tests/setup-real-tests.js', // Archivo de setup, no test
    '<rootDir>/tests/test-autosave-rasci-visual.js', // Archivo de utilidad, no test
    '<rootDir>/tests/utils/', // Archivos de utilidad, no tests
    '<rootDir>/scripts/', // Scripts que pueden tener test() pero no son tests
    '<rootDir>/reports/', // Reportes que no son tests
    '<rootDir>/coverage/', // Archivos de cobertura
    '<rootDir>/.*\\.tmp/', // Archivos temporales
    '<rootDir>/.*~$/', // Archivos de backup
    '<rootDir>/.*\\.bak$/' // Archivos de backup
  ],
  
  // Patrón más estricto para detectar solo tests reales
  testMatch: [
    '<rootDir>/tests/8.1-unitarias/**/*.test.js',
    '<rootDir>/tests/8.2-integracion/**/*.test.js', 
    '<rootDir>/tests/8.3-ui-e2e/**/*.test.js',
    '<rootDir>/tests/8.3-aceptacion/**/*.test.js'
  ],

  // Configuración de cobertura (solo reportes esenciales)
  collectCoverage: false, // Deshabilitado por defecto para evitar reportes masivos
  coverageDirectory: 'reports/coverage-tfg',
  coverageReporters: ['text', 'json'], // Solo texto y JSON, sin HTML masivo
  
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

  // CONFIGURACIÓN SIMPLIFICADA - sin projects para evitar duplicaciones

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
