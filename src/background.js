var ime = require('./ime/my-ime.js')
var SelfLearning = require('./dict/self-learning.js')

chrome.input.ime.onFocus.addListener(function (context) {
  console.log('onFocus:' + context.contextID)
  ime.onFocus(context)
})

chrome.input.ime.onBlur.addListener(function (contextID) {
  console.log('onBlur:' + contextID)
  ime.onBlur()
})

chrome.input.ime.onReset.addListener(function (engineID) {
  ime.onReset()
})

chrome.input.ime.onActivate.addListener(function (engineID) {
  console.log('onActivate:' + engineID)
  ime.Init(engineID)
  console.log('IME:')
  console.log(ime)
})

chrome.input.ime.onDeactivated.addListener(function (engineID) {
  console.log('onDeactivated:' + engineID)
  ime.onDeactivated()
})

chrome.input.ime.onKeyEvent.addListener(function (engineID, keyData) {
  return ime.handleKeyEvent(keyData)
})

chrome.runtime.onMessage.addListener(function (message) {
  if (message.reloadDict) {
    SelfLearning.loadDict()
  }
})
