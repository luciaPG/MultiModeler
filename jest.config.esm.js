/**
 * Configuración Jest para ESM - Soluciona problemas con bpmn-js
 */

export default {
  // Configuración ESM
  preset: 'jest-environment-jsdom',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Transformaciones para ESM
  transform: {
    '^.+\\.js$': ['babel-jest', { 
      presets: [
        ['@babel/preset-env', { 
          targets: { node: 'current' },
          modules: false // Mantener ESM
        }]
      ]
    }]
  },
  
  // Permitir transformación de node_modules ESM
  transformIgnorePatterns: [
    'node_modules/(?!(bpmn-js|diagram-js|min-dash|inherits-browser|moddle|moddle-xml|bpmn-moddle|ids|tiny-svg|didi|object-refs)/)'
  ],
  
  // Mapeo de módulos
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@modules/(.*)$': '<rootDir>/app/modules/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Configuración de test
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Solo tests específicos de initializeApplication
  testMatch: [
    '<rootDir>/tests/8.1-unitarias/initialize-application-real.test.js',
    '<rootDir>/tests/8.1-unitarias/multinotation-core.test.js'
  ],
  
  // Configuración de cobertura
  collectCoverage: false,
  
  // Timeout mayor para ESM
  testTimeout: 30000,
  
  // Verbose para debugging
  verbose: true
};
