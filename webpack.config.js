const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        bundle: ['./app/app.js'], // Archivo de entrada principal
    },
    output: {
        path: path.resolve(__dirname, 'public'), // Carpeta de salida
        filename: 'app.js', // Archivo generado
    },
    module: {
        rules: [{
            test: /\.bpmn$/, // Procesa archivos .bpmn
            use: 'raw-loader', // Los carga como cadenas de texto
        }, ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{
                    from: 'assets/**',
                    to: 'vendor/bpmn-js/[name][ext]',
                    context: path.resolve(__dirname, 'node_modules/bpmn-js/dist/'),
                },
                {
                    from: '**/*.{html,css}',
                    to: '[name][ext]',
                    context: path.resolve(__dirname, 'app/'),
                },
            ],
        }),
    ],
    mode: 'development', // Cambiar a 'production' para construir en producción
    devtool: 'source-map', // Genera mapas de origen para depuración
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'), // Sirve archivos desde la carpeta 'public'
        },
        port: 9000, // Puerto del servidor de desarrollo
        hot: true, // Habilita Hot Module Replacement
        open: true, // Abre el navegador automáticamente
    },
};