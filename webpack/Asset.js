let ID = 0 // 模块id自增初始值

class Asset {
  constructor(asset) {
    const { filename, dependcies, source } = asset || {}
    this.id = ID++ // 模块id
    this.filename = filename // 模块入口文件路径
    this.dependcies = dependcies // 模块依赖列表
    this.source = source // code
  }
}

module.exports = Asset
