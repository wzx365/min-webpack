module.exports = (content, options) => {
  return `
    ${content};
    var doc = document
    const $style = doc.createElement('style')
    $style.type = 'text/css'
    $style.innerHTML = content
    doc.getElementsByTagName('head')[0].appendChild($style)
  `
}