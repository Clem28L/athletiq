
<script setup>
import { defineProps } from 'vue'
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ""
  }
});
</script>

<template>
  <article class="feature-card">
    <img
      v-if="image"
      :src="image"
      :alt="title"
      class="feature-image"
    />

    <div v-else class="feature-placeholder"></div>

    <div class="feature-content">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>

      <RouterLink :to="link" class="button button-outline">
        Learn more
      </RouterLink>
    </div>
  </article>
</template>
