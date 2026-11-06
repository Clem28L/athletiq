<script setup>
defineProps({
  correct: {
    type: Boolean,
    required: true,
  },
});
</script>

<template>
  <img
    v-if="correct"
    class="answer-status-icon"
    src="/icons/good/favicon-32x32.png"
    alt="Correct answer"
  />
  <img
    v-else
    class="answer-status-icon"
    src="/icons/cross/favicon-32x32.png"
    alt="Wrong answer"
  />
</template>
