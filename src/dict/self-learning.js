var SelfLearning = {
  dict: {},
  learn: function (word, pinyin) {
    if (!(pinyin in this.dict)) {
      this.dict[pinyin] = []
    }
    if (!this.dict[pinyin].includes(word)) {
      this.dict[pinyin].push(word)
      this.saveDict()
    }
  },
  unlearn: function (word, pinyin) {
    if (pinyin in this.dict) {
      this.dict[pinyin] = this.dict[pinyin].filter(item => item !== word)
      this.saveDict()
    }
  },
  merge: function (other_dict) {
    var res = 0
    Object.keys(other_dict).forEach(pinyin => {
      if (!(pinyin in this.dict)) {
        this.dict[pinyin] = []
      }
      other_dict[pinyin].forEach(word => {
        if (!this.dict[pinyin].includes(word)) {
          this.dict[pinyin].push(word)
          res++
        }
      })
    })
    this.saveDict()
    return res
  },
  loadDict: function () {
    console.log('Loading learned dictionary.')
    chrome.storage.local.get('learnedDict', (result) => {
      Object.assign(this.dict, result.learnedDict)
    })
  },
  saveDict: function () {
    console.log('Saving learned dictionary.')
    chrome.storage.local.set({ learnedDict: this.dict })
  }
}

SelfLearning.loadDict()
module.exports = SelfLearning
