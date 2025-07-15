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
                    from: 'app/PPINOT-modeler/PPINOT/PPINOTModdle.json',
                    to: 'PPINOTModdle.json'
                },
                   {
                    from: 'app/RALPH-modeler/RALph/RALphModdle.json',
                    to: 'RALphModdle.json'
                },
                {
                    from: 'app/js',
                    to: 'js'
                },
                {
                    from: 'app/panels',
                    to: 'panels'
                },
                {
                    from: 'app/test-panels.html',
                    to: 'test-panels.html'
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