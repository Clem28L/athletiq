<script setup>
import AnswerChoice from "./AnswerChoice.vue";

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

// Send the selected answer to the parent
function updateAnswer(value) {
  emit("update:modelValue", value);
}
</script>

<template>
  <AnswerChoice
    :question="question"
    :model-value="modelValue"
    @update:modelValue="updateAnswer"
  />
</template>