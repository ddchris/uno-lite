<script setup>
</script>

<template>
  <div>
    <base-button
      type="danger"
      class="text-amber-600"
      :loading="true"
      icon="Edit"
      name="從消費端傳來的訊息"
      @click="() => console.log('Web Component click event')"
    />
  </div>
</template>
