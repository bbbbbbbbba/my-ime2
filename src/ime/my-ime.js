var Mode = require('./mode.js')
var Buffer = require('./buffer.js')
var Composition = require('./composition.js')
var Candidate = require('./candidate.js')

var Parser = require('../parser/parser.js')
var Match = require('../dict/match.js')
var SelfLearning = require('../dict/self-learning.js')

var punctuations = {
  ',': ['\uff0c'],
  '.': ['\u3002'],
  '<': ['\u300a'],
  '>': ['\u300b'],
  '?': ['\uff1f'],
  '!': ['\uff01'],
  ';': ['\uff1b'],
  ':': ['\uff1a'],
  '[': ['\u3010'],
  ']': ['\u3011'],
  '\\': ['\u3001'],
  '^': ['\u2026\u2026'],
  '(': ['\uff08'],
  ')': ['\uff09'],
  '_': ['\u2014\u2014'],
  '$': ['\uffe5'],
  '`': ['\u00b7'],
  "'": ['\u2018', '\u2019'],
  '"': ['\u201c', '\u201d']
}

var MyIME = {
  itemPerPage: 5,
  engineID: null,
  contextID: null,
  buffer: Buffer,
  composition: Composition,
  candidate: Candidate,
  mode: Mode,
  parser: Parser,
  transer: [Match],
  stage: 0, // stage 0: outer ime; stage 1: inner ime, inputting; stage 2: inner ime, selecting characters
  punctuationIndex: {}, // for quotation marks

  Init: function (engineID) {
    this.engineID = engineID
    Mode.current = 'zh'
  },
  onFocus: function (context) {
    this.context = context
    this.contextID = context.contextID
    this.buffer.Init(this.parser)
    this.composition.Init(this.contextID)
    this.candidate.Init(
      this.engineID,
      this.contextID,
      this.transer,
      this.itemPerPage
    )
    this.stage = 0
  },
  onBlur: function () {
    this.clearInput()
  },
  onReset: function () {
    this.clearInput()
  },
  onDeactivated: function () {
    this.clearInput()
  },
  commitText: function (text) {
    chrome.input.ime.commitText({ contextID: this.contextID, text: text })
  },
  moveCursor: function (rel) {
    if (
      (rel < 0 && this.buffer.cursor > 0) ||
      (rel > 0 && this.buffer.cursor < this.buffer.raw.length)
    ) {
      this.buffer.cursor += rel
      this.composition.set(this.composition.text, this.buffer.calcCursor())
      this.candidate.set(
        this.buffer.parsed.text.slice(0, this.buffer.calcCursorWithoutSpace())
      )
    }
  },
  inputChar: function (char) {
    this.buffer.addChar(char)
    var spacedStr = this.buffer.parsed.spacedText
    this.composition.set(spacedStr, this.buffer.calcCursor())
    this.candidate.set(this.buffer.parsed.spacedText)
  },
  removeChar: function () {
    this.buffer.removeChar()
    var spacedStr = this.buffer.parsed.spacedText
    if (spacedStr === '') {
      this.clearInput()
    } else {
      this.composition.set(spacedStr, this.buffer.calcCursor())
      this.candidate.set(this.buffer.parsed.spacedText)
    }
  },
  clearInput: function () {
    this.buffer.clear()
    this.composition.clear()
    this.candidate.clear()
    this.stage = 0
  },
  select: function () {
    var select = this.candidate.select()
    console.log(select)
    if (select) {
      this.buffer.pushSelected(select)
      console.log(this.buffer)
      // whether need commit
      if (
        this.buffer.calcSelectedLetter() ===
        this.buffer.calcCursorWithoutSpace()
      ) {
        var word = this.buffer.mergeAllSelected()
        if (this.context.shouldDoLearning) {
          SelfLearning.learn(word, this.buffer.parsed.spacedText)
        }
        this.commitText(word)
        this.clearInput()
        return true
      }
      // update composition text
      var spacedStr = this.buffer.parsed.spacedText
      var selectedLetter = this.buffer.calcSelectedLetter()
      spacedStr =
        this.buffer.mergeAllSelected() +
        spacedStr.slice(
          selectedLetter +
            this.buffer.parsed.space.filter(function (item, index, array) {
              return item < selectedLetter
            }).length
        )
      this.composition.set(spacedStr, spacedStr.length)
      // update candidate
      this.candidate.set(
        this.buffer.parsed.spacedText.slice(this.buffer.calcSelectedLetterWithSpace())
      )
      return true
    }
    return false
  },
  deleteCandidate: function () {
    var select = this.candidate.select()
    if (select) {
      SelfLearning.unlearn(select.char, select.spacedPinyin)
      // update candidate
      this.candidate.set(
        this.buffer.parsed.spacedText.slice(this.buffer.calcSelectedLetterWithSpace())
      )
    }
  },
  deSelect: function () {
    // when user use backspace or left under stage 2
    // pop buffer
    this.buffer.popSelected()
    // whether back to stage 1
    if (this.buffer.calcSelectedLetter() === 0) {
      this.stage = 1
    }
    // update composition text
    var spacedStr = this.buffer.parsed.spacedText
    var selectedLetter = this.buffer.calcSelectedLetter()
    spacedStr =
      this.buffer.mergeAllSelected() +
      spacedStr.slice(
        selectedLetter +
          this.buffer.parsed.space.filter(function (item, index, array) {
            return item < selectedLetter
          }).length
      )
    this.composition.set(spacedStr, spacedStr.length)
    // update candidate
    this.candidate.set(
      this.buffer.parsed.spacedText.slice(this.buffer.calcSelectedLetterWithSpace())
    )
    return true
  },
  choose: function (label) {
    if (label >= 1 && label <= 5) {
      return this.candidate.cursorSet(label - 1)
    } else {
      return false
    }
  },
  handleKeyEvent: function (keyData) {
    // TODO need fully fully fully rewrite

    // switch modes(Use SHIFT)
    if (this.mode.switchMode(keyData)) {
      this.commitText(this.buffer.raw)
      this.clearInput()
      return true
    } else if (this.mode.current === 'en') {
      return false
    }
    if (keyData.type === 'keydown' && this.mode.current === 'zh' && (!keyData.ctrlKey) && (!keyData.altKey)) {
      if (this.stage === 0) {
        if (keyData.key.match(/^[a-z]$/) && (!keyData.shiftKey)) {
          this.stage = 1
          this.inputChar(keyData.key)
          return true
        }
        if (Object.keys(punctuations).includes(keyData.key)) {
          var l = punctuations[keyData.key]
          var i = this.punctuationIndex[keyData.key] || 0
          this.commitText(l[i])
          this.punctuationIndex[keyData.key] = (i + 1) % l.length
          return true
        }
        return false
      } else {
        if (keyData.key.match(/^[a-zA-z;]$/)) {
          this.inputChar(keyData.key)
          return true
        }
        if (this.stage === 1) {
          if (keyData.key === 'Backspace') {
            this.removeChar()
            return true
          }
          if (keyData.key === 'Right') {
            this.moveCursor(1)
            return true
          }
          if (keyData.key === 'Left') {
            this.moveCursor(-1)
            return true
          }
        } else {
          if (keyData.key === 'Backspace' || keyData.key === 'Left') {
            this.deSelect()
            return true
          }
        }
        if (keyData.key === 'Enter') {
          this.commitText(this.buffer.raw)
          this.clearInput()
          return true
        }
        if (keyData.key === 'Up') {
          this.candidate.cursorUp()
          return true
        }
        if (keyData.key === 'Down') {
          this.candidate.cursorDown()
          return true
        }
        if (keyData.key === '=' || keyData.key === '.') {
          this.candidate.pageDown()
          return true
        }
        if (keyData.key === '-' || keyData.key === ',') {
          this.candidate.pageUp()
          return true
        }
        if (
          keyData.key === ' ' &&
          !keyData.ctrlKey &&
          !keyData.altKey &&
          !keyData.shiftKey
        ) {
          // Enter Stage 2
          this.stage = 2
          this.select()
          return true
        }
        if (keyData.key.match(/^[1-5]$/)) {
          this.stage = 2
          if (this.choose(keyData.key)) {
            this.select()
          }
          return true
        }
        // For some reason on my computer, keyData.key for the delete key is '\x7f'...
        if (keyData.key === 'Delete' || keyData.code === 'Delete') {
          this.deleteCandidate()
          return true
        }
      }
    } else {
      return false
    }
  }
}

module.exports = MyIME
