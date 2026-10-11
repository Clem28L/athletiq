<script setup>
// Component props definition (received from parent component)
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
  <!-- Card component container -->
  <article class="feature-card">
    <!-- Conditional rendering: display image if available, else placeholder -->
    <img
      v-if="image"
      :src="image"
      :alt="title"
      class="feature-image"
    />

    <div v-else class="feature-placeholder"></div>
<!-- Content section: title, description, and navigation button -->
    <div class="feature-content">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>

      <RouterLink :to="link" class="button button-outline">
        Learn more
      </RouterLink>
    </div>
  </article>
</template>
