<script setup>
import { computed } from "vue";

// Receive the question and the current answer from the parent.
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

// Update the displayed value when the answer changes.
const previewValue = computed(function () {
  // Show the minimum until the athlete chooses an answer.
  if (props.modelValue === null) {
    return props.question.min_value;
  }

  return props.modelValue;
});

// Send the slider value as a number to the parent.
function updateAnswer(event) {
  emit("update:modelValue", Number(event.target.value));
}

// Use the displayed value without moving the slider.
function confirmValue() {
  emit("update:modelValue", previewValue.value);
}
</script>

<template>
  <div class="answer-fields">
    <label for="slider-answer">
      Your answer: {{ previewValue }} {{ question.unit }}
    </label>

    <!-- Use the limits and step chosen by the expert. -->
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

    <!-- Show this button until the athlete chooses an answer. -->
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