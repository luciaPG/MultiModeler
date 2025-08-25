const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: './app/app.js',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'bundle.js',
        publicPath: '/'
    },
    module: {
        rules: [
        
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            },
         
            {
                test: /\.json$/,
                type: 'javascript/auto', 
                use: {
                    loader: 'json-loader'
                }
            },
                        {
              test: /\.css$/,
              use: ['style-loader', 'css-loader']
            }
        ]
    },
    resolve: {
        alias: {
            // Add aliases for the PPINOT and RALPH moddle files
            '@ppinot-moddle': path.resolve(__dirname, 'app/modules/multinotationModeler/notations/ppinot/PPINOTModdle.json'),
            '@ralph-moddle': path.resolve(__dirname, 'app/modules/multinotationModeler/notations/ralph/RALphModdle.json'),
            // Add alias for the MultiNotationModeler directory
            '@multi-notation': path.resolve(__dirname, 'app/modules/multinotationModeler'),
            // Add aliases for other directories to simplify imports
            '@app': path.resolve(__dirname, 'app'),
            '@modelers': path.resolve(__dirname, 'app/modelers'),
            '@core': path.resolve(__dirname, 'app/core'),
            '@infra': path.resolve(__dirname, 'app/infra'),
            '@panels': path.resolve(__dirname, 'app/panels')
        }
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'app/index.html',
                    to: 'index.html'
                },
                {
                    from: 'node_modules/bpmn-js/dist/assets/',
                    to: 'vendor/bpmn-js'
                },
                {
                    from: 'node_modules/diagram-js/assets/',
                    to: 'vendor/diagram-js'
                },
                {
                    from: 'app/css',
                    to: 'css'
                },
                               {
                    from: 'app/modules/multinotationModeler/notations/ppinot/PPINOTModdle.json',
                    to: 'PPINOTModdle.json'
                },
                   {
                    from: 'app/modules/multinotationModeler/notations/ralph/RALphModdle.json',
                    to: 'RALphModdle.json'
                },
                {
                    from: 'app/modules',
                    to: 'modules'
                },
                {
                    from: 'app/panels',
                    to: 'panels'
                }
            ]
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'public')
        },
        port: 9000,
        hot: true,
        open: true,
        historyApiFallback: true,
        devMiddleware: {
            writeToDisk: true
        }
    }
};