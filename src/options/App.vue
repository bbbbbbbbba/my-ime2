<template>
  <div>
    <p>这是一个没什么东西可设置的设置页面</p>
    <p>存储使用：{{ bytesInUse }}字节 / {{ quotaBytes }}字节</p>
    <button @click="exportDict()">
      导出词库
    </button>
    <br>
    <input
      ref="dict_file"
      type="file"
    >
    <br>
    <button
      :disabled="loadingFile"
      @click="importDict()"
    >
      {{ loadingFile ? '导入中……' : '导入并合并词库' }}
    </button>
    {{ importMessage }}
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SelfLearning from '../dict/self-learning.js'

const bytesInUse = ref('Loading...')
const quotaBytes = chrome.storage.local.QUOTA_BYTES

chrome.storage.local.getBytesInUse('learnedDict', function (result) {bytesInUse.value = result})

function exportDict() {
  const blob = new Blob([JSON.stringify(SelfLearning.dict)], {type: 'text/json'})
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'dict.json'
  link.click()
  URL.revokeObjectURL(link.href)
}

const dict_file = ref(null)
const loadingFile = ref(false)
const importMessage = ref('')

function importDict() {
  const file = dict_file.value.files[0]
  if (!file) {
    importMessage.value = '请选择文件！'
    return
  }
  loadingFile.value = true
  file.text().then(text => {
    const result = JSON.parse(text)
    const new_count = SelfLearning.merge(result)
    chrome.runtime.sendMessage({reloadDict: true})
    importMessage.value = `导入成功，新增字词${new_count}个`
    loadingFile.value = false
  })
}

</script>

<style scoped>
p {
  font-size: 20px;
}
</style>
