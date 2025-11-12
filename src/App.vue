<script setup lang="ts">
import { Delete, Plus, Search } from '@element-plus/icons-vue' // 引入 Element Plus 圖示
import { useI18n } from 'vue-i18n'

const newTodoTitle = ref('') // 用於綁定到 BaseInput
const loading = ref(false)
const toDos = ref([])

onMounted(() => {
  // Fetch 待辦事項
  getTodos()
})

async function getTodos() {
  try {
    loading.value = true
    const rawData = await fetch('https://jsonplaceholder.typicode.com/todos')
    const res = await rawData.json()
    toDos.value = res
  }
  finally {
    loading.value = false
  }
}

async function addTodo() {
  if (!newTodoTitle.value.trim()) {
    alert('請輸入待辦事項名稱')
    return
  }

  const newTodo = {
    title: newTodoTitle.value,
    completed: false,
  }

  try {
    loading.value = true
    const res = await fetch('https://jsonplaceholder.typicode.com/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTodo),
    })

    const addedTodo = await res.json()
    toDos.value.unshift(addedTodo)
    newTodoTitle.value = ''
  }
  finally {
    loading.value = false
  }
}

function onInput(e) {
  console.log('onInput', e)
  // e.target.modelValue = e.data
  // newTodoTitle.value += e.data
}

const { t, locale } = useI18n()

function switchLang() {
  locale.value = locale.value === 'zh-TW' ? 'en' : 'zh-TW'
}
</script>

<template>
  <div>
    <ParallaxSection :speed="0.3">
      <h1>山景背景</h1>
      <main class="gray-700 dark:gray-200 font-sans p-4 text-center">
        <!-- 搜尋框與按鈕佈局 -->
        <div class="mt-3 flex items-center justify-center space-x-4">
          newTodoTitle: {{ $t('welcome', { name: 'Chris' }) }}
          <base-input
            :model-value="newTodoTitle"
            class="h-10 w-80"
            :prefix-icon="Search"
            :placeholder="$t('welcome', { name: 'Chris' })"
            @input="onInput"
          />
          <el-button @click="switchLang">
            Switch Language
          </el-button>
          <base-button
            type="success"
            :loading="loading"
            :icon="Plus"
            :name="$t('help')"
            @click="addTodo"
          />
        </div>

        <!-- 顯示待辦事項 -->
        <div class="mx-auto mt-4 p-4 rounded-lg bg-white max-w-md shadow">
          <ul class="divide-gray-200 divide-y">
            <li
              v-for="todo in toDos.slice(0, 5)"
              :key="todo.id"
              class="px-4 py-2 rounded transition-colors hover:bg-gray-50"
            >
              <div class="flex items-center justify-between">
                <span :class="{ 'line-through': todo.completed }" @click="toggleTodoCompletion(todo)">
                  {{ `${todo.id}: ${todo.title}` }}
                </span>
                <base-button
                  type="danger"
                  :icon="Delete"
                  size="small"
                  @click="() => deleteTodo(todo.id)"
                />
              </div>
            </li>
          </ul>
        </div>

        <!-- 頁腳 -->
        <TheFooter />
      </main>
    </ParallaxSection>
    <!--
    <ParallaxSection :speed="0.6">
      <h1>山景背景</h1>
    </ParallaxSection> -->
  </div>
</template>
