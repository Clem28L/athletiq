<script setup>
// Receive the question and the current answer from the parent.
defineProps({
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

// Send the entered number to the parent.
function updateAnswer(event) {
  // Keep null for an empty field because zero can be a real answer.
  let value = null;

  if (event.target.value !== "") {
    value = Number(event.target.value);
  }

  emit("update:modelValue", value);
}
</script>

<template>
  <div class="answer-fields">
    <label for="numeric-answer">
      Your answer
      <span v-if="question.unit">({{ question.unit }})</span>
    </label>

    <input
      id="numeric-answer"
      type="number"
      step="0.001"
      :value="modelValue"
      @input="updateAnswer"
    />
  </div>
</template>