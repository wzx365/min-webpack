/**
 * 简述webpack原理
 * 1 入口【entry】
 * 2 依赖模块【denpencies modules】 -> 根据不同的modules类型调用不同的加载器【loader】
 * 3 生成依赖关系映射图【modules relationship graph】 
 * 4 格局依赖关系图输出打包文件【output】
 * 
 * 整个过程中，构成了一个打包的过程【生命周期】, 
 * 在这个过程中的一些关键点，触发一些特定的钩子【hooks】,
 * 这些钩子会监听一些特定的事件,如果监听了这些事件,
 * 并执行一些特定的业务逻辑,这便是插件【plugin】
 */

const fs = require('fs')
const path = require('path')

const babylon = require('babylon')
const traverse = require('babel-traverse').default
const {
  transformFromAst
} = require('babel-core')

const {
  SyncHook,
  SyncBailHook,
  SyncWaterfallHook,
  SyncLoopHook,
  AsyncParallelHook,
  AsyncParallelBailHook,
  AsyncSeriesHook,
  AsyncSeriesBailHook,
  AsyncSeriesWaterfallHook 
} = require("tapable");

const Asset = require('./Asset')
const util = require('./util')
const initplugins = require('./initPlugins')

// 打包配置项
let options

// const hooks = {
//   beforeGraphCreate: new SyncHook(['beforeGraphCreate']),
//   graphCreated: new SyncHook(['graphCreated']),
//   beforeBundle: new SyncHook(['beforeBundle']),
//   bundled: new SyncHook(['bundled']),
//   beforeEmit: new SyncHook(['beforeEmit']),
//   emit: new SyncHook(['emit'])
// }

// 创建一个模块
const createAsset = async (filename) => {
  let content = fs.readFileSync(filename, 'utf-8') // 读取到文件内容

  const { loaders } = options
  for (let i = 0; i < loaders.length; i++) {
    const { test, use } = loaders[i]
    if (test.test(filename)) {
      content = await use(content, options)
    }
  }

  // 文件内容中自然包含当前文件的依赖文件，
  // 我们可以通过正则字符串解析去做，但是这样做很复杂
  // 所以这里借助抽象语法树【ast】
  // 需要一个npm包 【babylon】将文件内容解析为方便操作的抽象语法树
  const ast = babylon.parse(content, {
    sourceType: 'module'
  })

  // console.log(JSON.stringify(ast))

  // 依赖模块数组
  const dependcies = []

  // 因为需要理解import export的语义，
  // 所以这里还需要引入babel对ast的解析方法
  traverse(ast, {
    ImportDeclaration: ({
      node
    }) => {
      // console.log(node)
      dependcies.push(node.source.value) // 当前模块的依赖
    }
  })

  // 获取了依赖模块数组，
  // 这时候我们需要将原来的import export语法的代码转为浏览器可以识别的方法
  // 这里因为是从ast转译，所以还需要一个transformFromAst

  const {
    code
  } = transformFromAst(ast, null, { // code就是转译后的代码
    presets: ['env'], // 预设值env,包含所有等级的提案及标准的预设值
    plugins: [
      ["@babel/plugin-transform-regenerator"]
    ]
  })


  // console.log(code)

  return new Asset({
    filename, // 模块入口文件路径
    dependcies, // 模块依赖列表
    source: code // code
  })
}

// 写完了生成一个模块的代码，
// 这时候需要生成模块依赖关系映射图了
// 这里需要使用递归的方式来获取
const createGraph = async (filename) => {
  const entryAsset = await createAsset(filename)

  const queue = [entryAsset] // 依赖关系映射图，以数组存储

  for (const asset of queue) {
    // 由输出的文件可知，require('./index.js') 并不能对应到特定的模块，
    // 所以这里需要一个相对路径与模块id的映射关系表
    asset.mapping = {}

    const currentPath = path.dirname(asset.filename) // 当前文件所在目录
    // 获取到当前文件目录， 
    // 并且当前文件中必定有他所依赖的模块的相对路径
    // 因此 当前文件所在路径 + 依赖模块的相对路径 = 依赖模块的绝对路径

    for (let i = 0; i < asset.dependcies.length; i++) {
      const relativePath = asset.dependcies[i]
      const moduleAbsolutePath = path.join(currentPath, relativePath)
      const childAsset = await createAsset(moduleAbsolutePath) // 子模块
      asset.mapping[relativePath] = childAsset.id // relativePath -> moduleId的映射完成
      queue.push(childAsset) // 子模块进入队列，for of 循环将持续这个过程
    }
  }
  // 返回队列，也就是我们的依赖关系映射图
  return queue
}

// 创建完模块和模块依赖关系图
// 接下来我们就需要开始进行打包操作了
const bundle = (graph) => {
  // 先思考一个问题
  // 目前已经知道了各个模块之间的依赖关系，并且已经以 id : relativePath的形式映射完毕
  // 接下去如何让他工作起来(需要自动运行起来)

  // 因为我们的代码被装换成了commonjs的形式
  // 所以在这里我们需要实现一个commonjs规范的
  // (require, module, exports) => {}

  let modules = '{'

  // 开始写逻辑 
  // 生成一个key-value形式的依赖关系对象
  graph.forEach(({
    id,
    source,
    mapping
  }) => {
    modules += `
      ${id}: [
        function(require, module, exports) {
          ${source}
        }, 
        ${JSON.stringify(mapping)}
      ],
    `
  })

  modules += '}'

  // console.log(modules)

  // 生成一个自调用函数
  const result = `
    (function(modules) {
      // 注意，这里require方法是require一个id, 但是我们已经知道了path -> id的映射关系
      function require(id) {
        var currentModule = modules[id]
        var fn = currentModule[0]
        var mapping = currentModule[1]

        // 内部require方法
        function innerRequire(path) {
          return require(mapping[path]) // 调用require方法
        }

        var module = { exports: {} }

        fn(innerRequire, module, module.exports)

        return module.exports
      }

      // 入口文件id必定为0
      require(${graph[0].id})
    })(${modules})
  `

  return result

}

class Compiler {
  constructor() {
    this.hooks = {
      beforeGraphCreate: new SyncHook(['beforeGraphCreate']),
      graphCreated: new SyncHook(['graphCreated']),
      beforeBundle: new SyncHook(['beforeBundle']),
      bundled: new SyncHook(['bundled']),
      beforeEmit: new SyncHook(['beforeEmit']),
      emit: new SyncHook(['emit'])
    }
  }
}

module.exports = (_options, callback = () => {}, initiate = true) => {
  options = _options
  const { entry, plugins, output: { path: outputPath, filename } } = _options
  const { hooks } = new Compiler()

  ;(async () => {
    try {
      initplugins(plugins, options, hooks)
      const compilation = { options }
      hooks.beforeGraphCreate.call(compilation) // hooks beforeGraphCreate
      const graph = await createGraph(entry)
      compilation.graph = graph
      hooks.graphCreated.call(compilation) // hooks graphCreated
      hooks.beforeBundle.call(compilation) // hooks beforeBundle
      const result = bundle(graph)
      const distName = util.getOutputName(filename, result)
      compilation.distName = distName
      compilation.result = result
      hooks.bundled.call(compilation)      // hooks bundled
      hooks.beforeEmit.call(compilation)   // hooks beforeEmit
      // console.log('result', compilation.result)
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath)
      }

      fs.writeFileSync(path.join(outputPath, distName), compilation.result)
      
      hooks.emit.call(compilation)     // hooks emit
    } catch(e) {
      console.log(e)
      callback(false, initiate)
      return
    }

    callback(true, initiate)
  })()
}


// 思考
// 1. 我们在什么时候可以使用loaders
// 2. 我们什么时候可以使用plugins
// 3. 热更新应该如何实现