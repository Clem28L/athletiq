<script setup>
import AnswerChoice from "./AnswerChoice.vue";

// Receive the question and the selected answer from the parent.
defineProps({
  question: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Send the answer from AnswerChoice to the parent page.
function updateAnswer(value) {
  emit("update:modelValue", value);
}
</script>

<template>
  <!-- Reuse the choice component to select True or False. -->
  <AnswerChoice
    :question="question"
    :model-value="modelValue"
    @update:modelValue="updateAnswer"
  />
</template>