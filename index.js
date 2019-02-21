const webpack = require('./webpack/webpack')
const webpackConfig = require('./webpack.config')

webpack(webpackConfig, (success) => {
  console.log(success ? '成功' : '失败')
})
