const { spawnSync } = require('node:child_process')
// scripts/i18n-check-google.cjs
const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')
const glob = require('glob')

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

const localesDir = 'src/locales'
const vueFilesGlob = 'src/**/*.vue'

// Google Sheet CSV 連結（需公開分享 CSV）
const sheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQi1nxgZN_ZzewDtrOGNgCs1N-osG30H9O2n0HS1WkIqqGBCXrv9kvX_BZAmA7QCKy1PqNYOOjTE8I0/pub?output=csv'

// ----------------------
// 1️⃣ 讀取 Google Sheet CSV 並更新本地 locale JSON
// ----------------------
async function importGoogleSheet() {
  const res = await fetch(sheetCsvUrl)
  if (!res.ok)
    throw new Error('Failed to fetch Google Sheet CSV')
  const csvText = await res.text()

  const lines = csvText.split(/\r?\n/).filter(Boolean)
  const headers = lines[0].split(',').map(h => h.trim()) // ['key','zh-TW','en','kr','detail']
  const dataLines = lines.slice(1)

  // 只處理語言欄位，不包含 detail
  const locales = {}
  headers.slice(1, -1).forEach(lang => (locales[lang] = {}))

  dataLines.forEach((line) => {
    const cols = line.split(',')
    const key = cols[0].trim()
    if (!key)
      return

    headers.slice(1, -1).forEach((lang, idx) => {
      const value = (cols[idx + 1] || '').trim()
      locales[lang][key] = value
    })

    // 最後一欄 detail 做為註解
    const detail = cols[cols.length - 1]?.trim()
    if (detail) {
      console.log(`💡 Key "${key}" detail: ${detail}`)
    }
  })

  // 寫入 locales/*.json
  for (const lang of Object.keys(locales)) {
    const safeLang = lang.replace(/[<>:"/\\|?*{}();]/g, '_')
    const filePath = path.join(localesDir, `${safeLang}.json`)
    fs.writeFileSync(filePath, JSON.stringify(locales[lang], null, 2), 'utf8')
    console.log(`✅ Updated ${filePath} from Google Sheet`)
  }

  return Object.keys(locales)
}

// ----------------------
// 2️⃣ 掃描 Vue 文件 missing key
// ----------------------
function scanVueFiles() {
  const vueFiles = glob.sync(vueFilesGlob).map(f => f.replace(/\\/g, '/'))
  if (!vueFiles.length) {
    console.error('❌ No Vue files found')
    process.exit(1)
  }

  const localeFiles = glob.sync(`${localesDir}/*.json`).map(f => f.replace(/\\/g, '/'))
  const args = ['vue-i18n-extract', 'report', '-v', '--vueFiles', ...vueFiles, '--languageFiles', ...localeFiles]
  const result = spawnSync('npx', args, { encoding: 'utf8', shell: true })
  if (result.error)
    console.error(result.error)
  if (result.stdout)
    console.log(result.stdout)
  if (result.stderr)
    console.error(result.stderr)

  const missingKeys = []
  vueFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8')
    const regex = /\b(?:\$t|t|i18n\.t)\(\s*['"`]([^'"`]+)['"`]/g
    let match
    while ((match = regex.exec(content)) !== null) {
      const key = match[1].trim()
      if (!key || /^[#<\\]/.test(key))
        continue
      if (!missingKeys.includes(key))
        missingKeys.push(key)
    }
  })
  return missingKeys
}

// ----------------------
// 3️⃣ 讀 locale JSON
// ----------------------
function loadLocales(langs) {
  const localesData = {}
  langs.forEach((lang) => {
    const filePath = path.join(localesDir, `${lang}.json`)
    let data = {}
    if (fs.existsSync(filePath)) {
      try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')) }
      catch {}
    }
    localesData[lang] = data
  })
  return localesData
}

// ----------------------
// 4️⃣ 多資源翻譯
// ----------------------
async function translateWordViaGoogleFree(word, target) {
  try {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${target}&q=${encodeURIComponent(word)}`
    const res = await fetch(url)
    const data = await res.json()
    if (data && data.sentences && data.sentences[0] && data.sentences[0].trans)
      return data.sentences[0].trans
  }
  catch {}
  return null
}

async function translateViaLibre(text, target) {
  try {
    const res = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'auto', target, format: 'text' }),
    })
    const data = await res.json()
    if (data.translatedText && data.translatedText.trim() !== text)
      return data.translatedText
  }
  catch {}
  return null
}

async function translateText(text, target) {
  // 如果是單詞先嘗試 Google free endpoint
  const isWord = !/\s/.test(text)
  if (isWord) {
    const wordTr = await translateWordViaGoogleFree(text, target)
    if (wordTr && wordTr.trim() !== text)
      return wordTr
  }

  // fallback LibreTranslate
  const libreTr = await translateViaLibre(text, target)
  if (libreTr && libreTr.trim() !== text)
    return libreTr

  // 全部失敗就用原字
  return text
}

// ----------------------
// 5️⃣ 處理 missing key 並寫回 JSON
// ----------------------
async function processMissingKeys(missingKeys, localesData, langs) {
  for (const [idx, key] of missingKeys.entries()) {
    for (const lang of langs) {
      if (!localesData[lang][key]) {
        const tr = await translateText(key, lang)
        localesData[lang][key] = tr
      }
    }
    console.log(`✅ [${idx + 1}/${missingKeys.length}] ${key} processed`)
  }

  langs.forEach((lang) => {
    const filePath = path.join(localesDir, `${lang}.json`)
    fs.writeFileSync(filePath, JSON.stringify(localesData[lang], null, 2), 'utf8')
    console.log(`✅ Updated ${filePath}`)
  })
}

// ----------------------
// 6️⃣ 主流程
// ----------------------
(async () => {
  try {
    const langs = await importGoogleSheet()
    const missingKeys = scanVueFiles()
    if (!missingKeys.length) {
      console.log('✅ No missing keys!')
      process.exit(0)
    }
    const localesData = loadLocales(langs)
    await processMissingKeys(missingKeys, localesData, langs)
    console.log('🎉 i18n process completed!')
  }
  catch (err) {
    console.error(err)
    process.exit(1)
  }
})()

/*
================================================================================
📌 使用說明 / 上手指南

資料夾最外層建立 scripts 放 i18n-check.cjs

1️⃣ Node.js 環境
- Node.js >= 18（內建 fetch 可用，或安裝 node-fetch）
- npm 或 pnpm

2️⃣ 安裝必要套件
npm install glob node-fetch vue-i18n-extract --save-dev
# 或 pnpm
pnpm add glob node-fetch vue-i18n-extract -D

3️⃣ Google Sheet CSV 設定
- 建立 Google Sheet，欄位範例：
key     zh‑TW   en      kr    detail
welcome 歡迎    welcome 환영   ...
help    幫助    help    도움   ...

- 發佈 CSV 連結：
  文件 -> 檔案 -> 共用 -> 發佈到網路 -> 選擇 CSV 格式
- 將生成的 CSV URL 填入 `sheetCsvUrl`

4️⃣ locales 目錄結構
- src/locales/
  - zh-TW.json
  - en.json
  - kr.json

5️⃣ 執行指令
package.json scripts 加入："i18n:check": "node ./scripts/i18n-check.cjs"
pnpm i18n:check

6️⃣ 功能
- 自動從 Google Sheet 更新 locale JSON（忽略 detail 欄）
- 掃描 Vue 文件 missing key
- 缺少的 key 自動使用免費翻譯服務補上
- 單詞先走 Google 無 API Key 端點，句子 fallback LibreTranslate
- detail 欄作為日誌說明，不影響 JSON
- 跨平台可用（Windows / Mac / Linux）
================================================================================
*/
