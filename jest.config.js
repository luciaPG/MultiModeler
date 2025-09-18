module.exports = {
  // Entorno de testing
  testEnvironment: 'jsdom',
  
  // Directorios de tests
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Configuración de módulos ES6
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  
  // Configuración para módulos
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@modules/(.*)$': '<rootDir>/app/modules/$1',
    '^@ui/(.*)$': '<rootDir>/app/modules/ui/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Cobertura de código
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.js',
    '!app/**/*.test.js',
    '!app/**/*.spec.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Reportes de tests
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Test Report - MNModeler',
      outputPath: './reports/test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true,
      theme: 'lightTheme',
      sort: 'status'
    }],
    ['jest-junit', {
      outputDirectory: './reports',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: 'false',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ],
  
  // Timeout para tests async
  testTimeout: 10000,
  
  // Globals para testing
  globals: {
    'NODE_ENV': 'test'
  }
};
