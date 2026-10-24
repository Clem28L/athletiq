<script setup>
// Receive the question and the current text from the parent.
defineProps({
  question: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Send the text to the parent whenever the athlete types.
function updateAnswer(event) {
  emit("update:modelValue", event.target.value);
}
</script>

<template>
  <div class="answer-fields">
    <label for="text-answer">Your answer</label>

    <input
      id="text-answer"
      type="text"
      maxlength="255"
      :value="modelValue"
      @input="updateAnswer"
    />
  </div>
</template>