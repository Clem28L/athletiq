<script setup>
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

// Keep an empty field unanswered
function updateAnswer(event) {
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