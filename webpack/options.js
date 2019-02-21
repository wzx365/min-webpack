const path = require('path')

const validateEntry = (entry) => {
  if (typeof entry === 'string') {

  }
}

module.exports = (options) => {
  const { entry, output, plugins, loaders } = options
  if (!entry || !output) {
    throw Error('配置有误')
  }

  return options
}