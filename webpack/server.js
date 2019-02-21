const http = require('http')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')
const opn = require('opn')

const myEventEmitter = new EventEmitter()

const webpack = require('./webpack')
const webpackConfig = require('../webpack.config')

// let reloadFlag = false
let bundling = false
let bindListener = false

fs.watch(path.resolve(process.cwd(), './src'), { recursive: true}, (eventType, filename) => {
  if (!bundling) {
    bundling = true
    webpack(webpackConfig, (success) => {
      console.log(success ? '更新成功' : '更新失败')
      bundling = false

      myEventEmitter.emit('reload')
    })
  }
})

webpack(webpackConfig, (success) => {
  console.log(success ? '打包成功' : '打包失败')
})

http.createServer((req, res) => {
  const url = req.url.split(/(\?|#)/)[0]
  if (url === '/') {
    res.end(fs.readFileSync(path.resolve(process.cwd(), './dist/index.html')).toString())
  } else if (url === '/__auto_flash__') {
    
    res.writeHead(200, {
      "Content-Type" : "text/event-stream",
      "Cache-Control" : "no-cache",
      "Connection": "keep-alive",
    })

    !bindListener && myEventEmitter.on('reload', () => {
      res.write('data: reload\n\n')
    })

    bindListener = true

    setInterval(() => {
      res.write('data: \uD83D\uDC93\n\n')
    }, 2000)
  } else {
    let file
    try {
      file = fs.readFileSync(path.resolve(process.cwd(), `./dist${url}`))
    } catch(e) {
      res.statusCode = 404
      res.end('{code: 404}')
      return
    }

    res.end(file)
  } 
  
}).listen(3000, () => {
  opn('http://localhost:3000')
})
console.log('listening at: http://localhost:3000')