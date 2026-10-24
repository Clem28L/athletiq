<script setup>
import { computed } from "vue";

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Show the minimum before the first selection
const previewValue = computed(function () {
  if (props.modelValue === null) {
    return props.question.min_value;
  }

  return props.modelValue;
});

// Send the selected slider value
function updateAnswer(event) {
  emit("update:modelValue", Number(event.target.value));
}

// Confirm the initial position as an answer
function confirmValue() {
  emit("update:modelValue", previewValue.value);
}
</script>

<template>
  <div class="answer-fields">
    <label for="slider-answer">
      Your answer: {{ previewValue }} {{ question.unit }}
    </label>

    <input
      id="slider-answer"
      type="range"
      :min="question.min_value"
      :max="question.max_value"
      :step="question.step_value"
      :value="previewValue"
      @input="updateAnswer"
    />

    <p class="answer-help">
      {{ question.min_value }} to {{ question.max_value }}
      {{ question.unit }}
    </p>

    <button
      v-if="modelValue === null"
      type="button"
      class="refresh-button"
      @click="confirmValue"
    >
      Use this value
    </button>
  </div>
</template>