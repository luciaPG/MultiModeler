module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      },
      modules: process.env.NODE_ENV === 'test' ? 'commonjs' : false
    }]
  ],
  // Aumentar límite de tamaño para archivos grandes (SVGs)
  compact: false,
  generatorOpts: {
    compact: false
  },
  plugins: [
  
    ...(process.env.NODE_ENV === 'production' ? [
      ['transform-remove-console', {
        exclude: ['error', 'warn'] 
      }]
    ] : [])
  ],
  env: {
   
    development: {
      plugins: [
      
      ]
    },
    

    production: {
      plugins: [
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
          modules: 'commonjs'
        }]
      ],

      plugins: []
    }
  }
};




