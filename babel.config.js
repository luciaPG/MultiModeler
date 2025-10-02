module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      },
      // SOLUCIÓN ESM: Transformar módulos ES a CommonJS para Jest
      modules: process.env.NODE_ENV === 'test' ? 'commonjs' : false
    }]
  ],
  plugins: [
    // Aplicar condicionalmente según el entorno
    ...(process.env.NODE_ENV === 'production' ? [
      // EN PRODUCCIÓN: Eliminar TODOS los console.* para optimizar el bundle
      ['transform-remove-console', {
        exclude: ['error', 'warn'] // Mantener console.error y console.warn por seguridad
      }]
    ] : [])
  ],
  env: {
    // CONFIGURACIÓN ESPECÍFICA PARA DEVELOPMENT
    development: {
      plugins: [
        // En desarrollo: mantener todos los console.* para debugging
      ]
    },
    
    // CONFIGURACIÓN ESPECÍFICA PARA PRODUCTION
    production: {
      plugins: [
        // Eliminar console.* excepto error y warn para reducir bundle size
        ['transform-remove-console', {
          exclude: ['error', 'warn']
        }]
      ]
    },
    
    // CONFIGURACIÓN ESPECÍFICA PARA TESTS
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          },
          modules: 'commonjs' // Forzar CommonJS en tests
        }]
      ],
      // En tests: mantener todos los console.* para depuración de pruebas
      plugins: []
    }
  }
};




