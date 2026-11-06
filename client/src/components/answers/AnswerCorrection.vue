<script setup>
import AnswerStatusIcon from "./AnswerStatusIcon.vue";

defineProps({
  feedback: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div v-if="!feedback.correct && feedback.expected.length > 0" class="answer-correction" role="status">
    <div class="answer-correction-label">
      <AnswerStatusIcon :correct="true" />
      <span>Correct answer</span>
    </div>
    <ul>
      <li v-for="(line, index) in feedback.expected" :key="index">
        {{ line }}
      </li>
    </ul>
  </div>
</template>
