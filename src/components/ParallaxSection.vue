<template>
  <section class="parallax-section" ref="sectionRef">
    <div
      class="parallax-bg"
      :style="{ transform: `translateY(${offsetY}px)` }"
    ></div>
    <div class="content">
      <slot></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  speed: { type: Number, default: 0.4 } // 視差強度
})

const sectionRef = ref<HTMLElement | null>(null)
const offsetY = ref(0)
let observer: IntersectionObserver | null = null

onMounted(() => {
  const section = sectionRef.value
  if (!section) return

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const scrollHandler = () => {
            const rect = section.getBoundingClientRect()
            offsetY.value = rect.top * props.speed
          }

          window.addEventListener('scroll', scrollHandler)
          scrollHandler() // 初始化

          // 當離開可見區域就解除監聽
          observer?.unobserve(section)
          observer = null
        }
      })
    },
    { threshold: 0.1 } // 進入 10% 可視範圍時觸發
  )

  observer.observe(section)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.parallax-section {
  position: relative;
  overflow: hidden;
  height: 100vh;
}

.parallax-bg {
  position: absolute;
  top: -20%;
  left: 0;
  width: 100%;
  height: 140%;
  background-image: url('https://picsum.photos/1920/1080?blur=3');
  background-size: cover;
  background-position: center;
  z-index: -1;
  transition: transform 0.1s linear;
  will-change: transform;
}

.content {
  position: relative;
  z-index: 1;
  color: white;
  text-align: center;
  padding-top: 40vh;
  font-size: 2rem;
}
</style>
