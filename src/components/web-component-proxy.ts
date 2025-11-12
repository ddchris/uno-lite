const MODULE_URL = 'https://ddchris.github.io/my-widget/base-all.js' + `?t=${Date.now()}`
const ETAG_KEY = 'base-all-etag'

async function loadModuleIfUpdated(url: string) {
  try {
    // 先用 HEAD 檢查 ETag
    const res = await fetch(url, { method: 'HEAD' })
    const remoteETag = res.headers.get('ETag') || res.headers.get('Last-Modified')
    const cachedETag = localStorage.getItem(ETAG_KEY)

    // if (cachedETag && cachedETag === remoteETag) {
    //   console.log('沒更新，直接回傳', { cachedETag, remoteETag })
    //   // 沒更新，直接回傳
    //   await import(/* @vite-ignore */ `${MODULE_URL}`)
    //   return
    // }

    console.log('更新了:', MODULE_URL)
    // 更新了，存 ETag 並 import
    localStorage.setItem(ETAG_KEY, remoteETag ?? '')
    await import(/* @vite-ignore */ `${MODULE_URL}`)
  }
  catch (err) {
    console.error('載入 module 失敗:', err)
  }
}

export async function initWebComponent() {
  await loadModuleIfUpdated(MODULE_URL)
  return {
    BaseButton: window.customElements.get('base-button'),
    BaseInput: window.customElements.get('base-input'),
    BasePagination: window.customElements.get('base-pagination'),
    BaseBreadcrumb: window.customElements.get('base-breadcrumb'),
    BaseTabs: window.customElements.get('base-tabs'),
    BaseDateTimePicker: window.customElements.get('base-date-time-picker'),
    BaseTooltip: window.customElements.get('base-tooltip'),
    BaseMessage: window.customElements.get('base-message'),
    BaseMessageBox: window.customElements.get('base-message-box'),
  }
}
