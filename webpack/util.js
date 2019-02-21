
// const fs = require('fs')
const getHashSubfix = (content, length) => {
  var crypto = require('crypto');
  const fullHash = crypto.createHash('md5').update(content).digest('hex')
  return length ? fullHash.slice(0, length) : fullHash
}

const getHashLength = (filename) => {
  const reg = /\[hash\:(\d+)\]/g

  const result = reg.exec(filename)

  return result ? result[1] : undefined
}

const getOutputName = (filename, content) => {
  const hashLength = getHashLength(filename)
  const hash = getHashSubfix(content, hashLength)
  const reg = /\[hash\:\d+\]/g
  return filename.replace(reg, hash)
}

module.exports = {
  getHashSubfix, 
  getHashLength,
  getOutputName
}
