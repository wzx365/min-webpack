const UglifyJS = require("uglify-js");

class UglifyJSPlugin {
    constructor(options){
        this.options = options
    }
    apply(compiler) {
        compiler.hooks.beforeEmit.tap('uglifyJS', (compiler) => {
            let newResult = UglifyJS.minify(compiler.result)
            let { error, code } = newResult
            // console.log('UglifyJS', code)
            if(!error) compiler.result = code
        })
    }
}

module.exports = UglifyJSPlugin