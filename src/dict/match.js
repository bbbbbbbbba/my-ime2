const BasicDict = require('./basic.js')
const LearnedDict = require('./self-learning.js').dict

const Dicts = [LearnedDict, BasicDict]

var Match = {
  trans: function (text) {
    var result = []
    var appeared = new Set()
    for (var i in Dicts) {
      var index = text.length
      while (index !== -1) {
        var partialText = text.slice(0, index)
        if (Dicts[i][partialText]) {
          for (var j in Dicts[i][partialText]) {
            var word = Dicts[i][partialText][j]
            if (!appeared.has(word)) {
              appeared.add(word)
              result.push({ char: word, pinyin: partialText.replaceAll(' ', ''), spacedPinyin: partialText })
            }
          }
        }
        index = text.slice(0, index).lastIndexOf(' ')
      }
    }
    return result
  }
}

module.exports = Match
