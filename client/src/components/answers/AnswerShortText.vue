<script setup>
import { getFeedbackClass } from "@/utils/QuizAnswers";
import AnswerStatusIcon from "./AnswerStatusIcon.vue";
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
  feedback: {
    type: Object,
    default: null,
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

    <div class="answer-control">
      <input
        :class="getFeedbackClass(feedback)"
        id="text-answer"
        type="text"
        maxlength="255"
        :value="modelValue"
        @input="updateAnswer"
      />
      <AnswerStatusIcon v-if="feedback" :correct="feedback.correct" />
    </div>
  </div>
</template>