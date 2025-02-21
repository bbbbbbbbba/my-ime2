var Candidate = {
  engineID: null,
  contextID: null,
  rawText: '',
  candidates: [],
  transBack: [],
  page: 0,
  cursor: 0,
  itemPerPage: null,
  transer: null,

  Init: function (engineID, contextID, transer, itemPerPage) {
    this.engineID = engineID
    this.contextID = contextID
    this.transer = transer
    this.itemPerPage = itemPerPage
    return this
  },
  show: function () {
    chrome.input.ime.setCandidateWindowProperties({
      engineID: this.engineID,
      properties: {
        visible: true,
        cursorVisible: true,
        vertical: true,
        pageSize: this.itemPerPage,
        windowPosition: 'cursor'
      }
    })
  },
  hide: function () {
    chrome.input.ime.setCandidateWindowProperties({
      engineID: this.engineID,
      properties: {
        visible: false,
        cursorVisible: false,
        vertical: true,
        pageSize: this.itemPerPage,
        windowPosition: 'cursor'
      }
    },
    (success) => {
      if (!success) {
        console.log('setCandidateWindowProperties failed:', chrome.runtime.lastError.message)
      }
    })
  },
  clear: function () {
    this.cursor = 0
    this.rawText = ''
    this.candidates = []
    this.transBack = []
    this.page = 0
    this.hide()
  },
  update: function () {
    this.candidates = []
    for (var j = 0; j < this.itemPerPage && j < this.transBack.length - this.page * this.itemPerPage; j++) {
      this.candidates[j] = {
        candidate: this.transBack[this.page * this.itemPerPage + j].char,
        id: j,
        label: (j + 1).toString()
      }
    }
    chrome.input.ime.setCandidates({
      contextID: this.contextID,
      candidates: this.candidates
    })
    this.cursorSet(0)
  },
  set: function (text) {
    this.rawText = text
    var transerResult = null
    for (var i = 0; i < this.transer.length; i++) {
      transerResult = this.transer[i].trans(this.rawText)
      if (transerResult) {
        this.transBack = transerResult
        this.page = 0
        this.update()
        this.show()
        return true
      }
    }
    return false
  },
  pageUp: function () {
    if (this.page !== 0) {
      this.page--
      this.update()
      return true
    } else {
      return false
    }
  },
  pageDown: function () {
    if ((this.page + 1) * this.itemPerPage < this.transBack.length) {
      this.page++
      this.update()
      return true
    } else {
      return false
    }
  },
  cursorSet: function (id) {
    if (id >= 0 && id < this.candidates.length) {
      this.cursor = id
      chrome.input.ime.setCursorPosition({
        contextID: this.contextID,
        candidateID: this.cursor
      })
      return true
    } else {
      return false
    }
  },
  cursorDown: function () {
    if (this.cursor < this.candidates.length - 1) {
      this.cursor++
      chrome.input.ime.setCursorPosition({
        contextID: this.contextID,
        candidateID: this.cursor
      })
    } else {
      if (this.pageDown()) {
        this.cursor = 0
        chrome.input.ime.setCursorPosition({
          contextID: this.contextID,
          candidateID: this.cursor
        })
      }
    }
  },
  cursorUp: function () {
    if (this.cursor > 0) {
      this.cursor--
      chrome.input.ime.setCursorPosition({
        contextID: this.contextID,
        candidateID: this.cursor
      })
    } else {
      if (this.pageUp()) {
        this.cursor = this.itemPerPage - 1
        chrome.input.ime.setCursorPosition({
          contextID: this.contextID,
          candidateID: this.cursor
        })
      }
    }
  },
  select: function () {
    return this.transBack[this.cursor + this.page * this.itemPerPage]
  }
}

module.exports = Candidate
