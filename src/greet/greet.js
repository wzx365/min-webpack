import helloWorld from '../helloWorld.js'
import './greet.less'

export default () => {
  console.log(helloWorld)
  let div = document.createElement('div')
  div.innerText = helloWorld
  document.body.appendChild(div)
}