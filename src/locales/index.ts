const { execSync } = require('node:child_process')
// scripts/i18n-check.cjs
const fs = require('node:fs')
const process = require('node:process')
const glob = require('glob')

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

const localesDir = './src/locales'
const mainLocale = 'zh-TW'
const targetLocale = 'en'
const vueFilesGlob = './src/**/*.vue'

// ----------------------
// 1️⃣ 用 vue-i18n-extract 找 missing key
// ----------------------
console.log('🔍 Scanning for missing i18n keys...')
let output
try {
  output = execSync(
    `npx vue-i18n-extract report -v --vueFiles '${vueFilesGlob}' --languageFiles '${localesDir}/*.json'`,
    { encoding: 'utf8' },
  )
}
catch (err) {
  console.error('Error running vue-i18n-extract:', err.message)
  process.exit(1)
}

// 解析 vue-i18n-extract 的 missing key
const missingKeys = []
let capture = false
output.split('\n').forEach((line) => {
  line = line.trim()
  if (!line)
    return
  if (line.startsWith('Missing keys in')) {
    capture = true
    return
  }
  if (capture) {
    if (line.startsWith('✔') || line.includes('vue-i18n-extract'))
      return
    missingKeys.push(line)
  }
})

// ----------------------
// 2️⃣ 正則掃描 template 裡的 $t(...) key
// ----------------------
console.log('🔍 Scanning templates for $t(...) keys...')
const vueFiles = glob.sync(vueFilesGlob)
vueFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8')
  const regex = /\$t\(['"`](.*?)['"`]\)/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const key = match[1]
    if (!missingKeys.includes(key))
      missingKeys.push(key)
  }
})

if (missingKeys.length === 0) {
  console.log('✅ No missing keys!')
  process.exit(0)
}

// ----------------------
// 3️⃣ 讀 main & target locale JSON
// ----------------------
let mainJson = {}
try { mainJson = JSON.parse(fs.readFileSync(`${localesDir}/${mainLocale}.json`, 'utf8')) }
catch { }
let targetJson = {}
const targetJsonPath = `${localesDir}/${targetLocale}.json`
if (fs.existsSync(targetJsonPath)) {
  try { targetJson = JSON.parse(fs.readFileSync(targetJsonPath, 'utf8')) }
  catch { }
}

// ----------------------
// 4️⃣ 翻譯函數
// ----------------------
async function translateText(text, target, source = 'auto') {
  try {
    const res = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' }),
    })
    const data = await res.json()
    return data.translatedText || text
  }
  catch (err) {
    console.error('Error translating text:', err.message)
    return text
  }
}

// ----------------------
// 5️⃣ 處理 missing key
// ----------------------
async function main() {
  for (const key of missingKeys) {
    // main locale：如果沒有 key，使用 key 字串翻譯成中文作值
    let mainText = mainJson[key]
    if (!mainText) {
      console.log(`⚠️ Key [${key}] not in main locale. Translating to zh-TW...`)
      mainText = await translateText(key, 'zh', 'auto')
      mainJson[key] = mainText
    }

    // target locale：翻譯 main locale 的值成英文
    let targetText = targetJson[key]
    if (!targetText) {
      if (mainText === key) {
        // mainText 翻譯失敗或是 key 本身 → target 用 key
        targetText = key
      }
      else {
        targetText = await translateText(mainText, 'en', 'zh')
        if (!targetText)
          targetText = key // fallback
      }
      targetJson[key] = targetText
    }

    console.log(`✅ [${key}] zh-TW: ${mainText}, en: ${targetJson[key]}`)
  }

  // ----------------------
  // 6️⃣ 寫回 main locale
  // ----------------------
  fs.writeFileSync(`${localesDir}/${mainLocale}.json`, JSON.stringify(mainJson, null, 2))
  console.log(`✅ Main locale updated: ${mainLocale}.json`)

  // ----------------------
  // 7️⃣ 寫回 target locale
  // ----------------------
  fs.writeFileSync(targetJsonPath, JSON.stringify(targetJson, null, 2))
  console.log(`✅ Target locale updated: ${targetLocale}.json`)
}

// ----------------------
// 8️⃣ 執行
// ----------------------
main().catch((err) => {
  console.error('Unexpected error:', err.message)
  process.exit(1)
})
