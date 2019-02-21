const path = require('path')

const lessLoader = require('./loaders/lessLoader')
const styleLoader = require('./loaders/styleLoader')
const HtmlPlugin = require('./plugins/htmlPlugin')
const CleanPlugin = require('./plugins/CleanPlugin')
const UglifyJSPlugin = require('./plugins/uglifyJSPlugin')

module.exports = {
  entry: path.resolve(__dirname, './src/index.js'),
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'dist.[hash:5].js'
  },
  loaders: [
    {
      test: /\.less$/,
      use: lessLoader
    },
    {
      test: /\.(less|css)$/,
      use: styleLoader
    }
  ],
  plugins: [
    new CleanPlugin({}),
    new UglifyJSPlugin(),
    new HtmlPlugin({
      template: path.resolve(__dirname, './src/index.html'),
      args: {
        ENV: 'PRODUCTION',
        title: 'minipack test'
      }
    })
  ]
}