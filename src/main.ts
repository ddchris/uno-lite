import * as Icons from '@element-plus/icons-vue'
import * as ElementPlus from 'element-plus'
import * as Vue from 'vue'
import { createApp } from 'vue'

import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'
import i18n from './locales'

import './styles/main.css'
import 'uno.css'
import 'element-plus/dist/index.css'

window.Vue = Vue
window.ElementPlus = ElementPlus
window.ElementPlusIconsVue = Icons
const app = createApp(App)
app.use(ElementPlus)
app.use(i18n)
app.config.compilerOptions.isCustomElement = tag => tag.startsWith('base-')
const router = createRouter({
  routes,
  history: createWebHistory(import.meta.env.BASE_URL),
})
app.use(router)
async function initAPP() {
  // 載入 web component
  const mod = await import(new URL('./components/web-component-proxy.ts', import.meta.url).toString())
  await mod.initWebComponent()
  app.mount('#app')
}

initAPP()
