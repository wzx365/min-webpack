const fs = require('fs')
const ejs = require('ejs')

class HtmlPlugin {
  constructor(options) {
    this.opts = options
  }

  apply(compiler) {
    compiler.hooks.bundled.tap('bundled', ({ options, distName }) => {
      const { output: { path } } = options
      const { template, args } = this.opts
      let tplContent = fs.readFileSync(template).toString().replace(/<\/body>/, (body) => {
        return `<script src="./<%=distName%>"></script>\n${body}`
      })
      tplContent = ejs.render(tplContent, { ...args, distName })
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path)
      }
      fs.writeFileSync(`${path}/index.html`, tplContent)
    })
  }
}

module.exports = HtmlPlugin
