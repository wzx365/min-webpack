module.exports = (plugins, options, hooks) => {
  plugins.forEach((plugin) => {
    plugin.apply({ hooks, options })
  })
}