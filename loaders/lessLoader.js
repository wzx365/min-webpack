const less = require('less')
module.exports = (content, options) => {
  const result = less.render(content).then(({ css }) => {
    return `const content = \`${css.replace(/'/g, '\"')}\``
  }).catch((e) => {
    console.log(e)
  })

  return result
}