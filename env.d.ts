import type * as ElementPlusType from 'element-plus'
// src/env.d.ts
import type * as VueType from 'vue'

declare global {
  interface Window {
    Vue: typeof VueType
    ElementPlus: typeof ElementPlusType
    ElementPlusIconsVue: typeof import('@element-plus/icons-vue')
  }
}

export { }
