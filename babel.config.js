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
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          },
          modules: 'commonjs' // Forzar CommonJS en tests
        }]
      ]
    }
  }
};




