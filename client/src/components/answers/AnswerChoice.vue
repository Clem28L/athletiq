<script setup>
const props = defineProps({
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

// Select one option or update the multiple selection
function selectOption(id, checked) {
  const selected = [];

  if (props.question.type_answer === "multiple_choice") {
    // Copy the selection without the option being changed
    for (let i = 0; i < props.modelValue.length; i++) {
      if (props.modelValue[i] !== id) {
        selected.push(props.modelValue[i]);
      }
    }

    if (checked) {
      selected.push(id);
    }
  } else {
    selected.push(id);
  }

  emit("update:modelValue", selected);
}
</script>

<template>
  <div class="answer-fields">
    <p
      v-if="question.type_answer === 'multiple_choice'"
      class="answer-help"
    >
      Select all correct answers.
    </p>

    <p v-else class="answer-help">
      Select one answer.
    </p>

    <label
      v-for="option in question.options"
      :key="option.id"
      class="answer-option"
    >
      <input
        v-if="question.type_answer === 'multiple_choice'"
        type="checkbox"
        :checked="modelValue.includes(option.id)"
        @change="selectOption(option.id, $event.target.checked)"
      />

      <input
        v-else
        type="radio"
        :name="'question-' + question.id_question"
        :checked="modelValue.includes(option.id)"
        @change="selectOption(option.id, true)"
      />

      <span>{{ option.text }}</span>
    </label>
  </div>
</template>