const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
    const isHybrid = env && env.target === 'hybrid';
    
    return {
        mode: 'development',        entry: {
            'app': './app/app.js',                    // Aplicación original PPINOT
            'hybrid': './app/hybrid-app.js'         // Nueva aplicación híbrida
        },
        output: {
            path: path.resolve(__dirname, 'public'),
            filename: '[name]-bundle.js',  // Genera app-bundle.js y hybrid-bundle.js
            publicPath: '/'
        },    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.json$/,
                type: 'javascript/auto', 
                use: {
                    loader: 'json-loader'
                }
            }
        ]
    },    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                // Aplicación original PPINOT
                {
                    from: 'app/index.html',
                    to: 'index.html'
                },                // Aplicación híbrida
                {
                    from: 'app/hybrid.html',
                    to: 'hybrid.html'
                },
                // Assets comunes
                {
                    from: 'node_modules/bpmn-js/dist/assets/',
                    to: 'vendor/bpmn-js'
                },
                {
                    from: 'node_modules/diagram-js/assets/',
                    to: 'vendor/diagram-js'
                },                // CSS files
                {
                    from: 'app/css',
                    to: 'css'
                },                // Configuraciones
                {
                    from: 'app/PPINOT-modeler/PPINOT/PPINOT.json',
                    to: 'PPINOT.json'
                }
            ]
        })
    ],        devServer: {
            static: {
                directory: path.join(__dirname, 'public')
            },
            port: 3000,
            hot: true,
            open: isHybrid ? {
                target: '/hybrid.html'
            } : true,
            historyApiFallback: true,
            devMiddleware: {
                writeToDisk: true
            }
        }
    };
};