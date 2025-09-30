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
    // TEMPORALMENTE DESHABILITADO PARA DEBUGGING: Elimina todas las llamadas a console.* en los bundles
    // ['transform-remove-console']
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
      ],
      // En tests mantenemos los console.* para depuración si Jest decide mostrarlos
      plugins: []
    }
  }
};




