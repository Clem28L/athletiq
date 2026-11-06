<script setup>
import { getFeedbackClass } from "@/utils/QuizAnswers";
import AnswerStatusIcon from "./AnswerStatusIcon.vue";
const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Array,
    required: true,
  },
  showHelp: {
    type: Boolean,
    default: true,
  },
  feedback: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Update the selection before the answer is checked.
function selectOption(id, checked) {
  if (props.feedback) {
    return;
  }

  const selected = [];

  if (props.question.type_answer === "multiple_choice") {
    // Keep the other checked options when one box changes
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
  <div class="answer-fields answer-choice">
    <p
      v-if="showHelp && question.type_answer === 'multiple_choice'"
      class="answer-help"
    >
      Select all correct answers.
    </p>

    <p v-else-if="showHelp" class="answer-help">
      Select one answer.
    </p>

    <label
      v-for="option in question.options"
      :key="option.id"
      class="answer-option"
      :class="[
        { 'answer-option-selected': modelValue.includes(option.id) },
        getFeedbackClass(feedback, option.id),
      ]"
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
      <span v-if="getFeedbackClass(feedback, option.id)" class="answer-mark">
        <AnswerStatusIcon :correct="getFeedbackClass(feedback, option.id) === 'answer-correct'" />
      </span>
    </label>
  </div>
</template>

<style scoped>
.answer-choice {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.answer-help {
  margin: 0;
  color: #68686d;
  font-size: 13px;
  line-height: 1.6;
}

.answer-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
}

.answer-option:hover {
  background: #f7f7f3;
}

.answer-option-selected {
  border-color: #373631;
  background: #f7f7f3;
}

.answer-option:focus-within {
  outline: 2px solid #55544f;
  outline-offset: 2px;
}

.answer-option span {
  overflow-wrap: anywhere;
}

.answer-option input {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  accent-color: #373631;
}
</style>
