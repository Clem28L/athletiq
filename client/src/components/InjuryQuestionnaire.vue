<script setup>
import { ArrowLeft, ArrowRight } from "@lucide/vue";
import { computed, nextTick, ref, watch } from "vue";
import questionnaire from "../data/injuryQuestionnaire.json";
import { getInjuryResult } from "../utils/injuryQuestionnaire";
import AnswerChoice from "./answers/AnswerChoice.vue";

const props = defineProps({
  zone: {
    type: Object,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["complete", "back"]);

const questionId = ref(questionnaire.zones[props.zone.id].start);
const answerId = ref("");
const history = ref([]);
const heading = ref(null);
const question = computed(() => questionnaire.questions[questionId.value]);

// Use the same question format as the quiz answer component
const choiceQuestion = computed(() => ({
  id_question: questionId.value,
  type_answer: "single_choice",
  options: question.value.options,
}));

const selectedAnswers = computed({
  get() {
    if (!answerId.value) {
      return [];
    }

    return [answerId.value];
  },
  set(answers) {
    answerId.value = answers[0] || "";
  },
});

function nextQuestion() {
  let choice = null;

  for (const option of question.value.options) {
    if (option.id === answerId.value) {
      choice = option;
      break;
    }
  }

  if (!choice) {
    return;
  }

  const answer = {
    questionId: questionId.value,
    optionId: choice.id,
  };

  if (choice.next === "finish") {
    const answers = [...history.value, answer];
    const result = getInjuryResult(questionnaire, props.zone, answers);
    emit("complete", result);
    return;
  }

  const nextId = choice.next;

  if (!questionnaire.questions[nextId]) {
    emit("complete", getInjuryResult(questionnaire, props.zone, [...history.value, answer]));
    return;
  }

  history.value.push(answer);
  questionId.value = nextId;
  answerId.value = "";
}

function previousQuestion() {
  if (history.value.length === 0) {
    emit("back");
    return;
  }

  // Remove the next branch so an old answer cannot affect a new path
  const previous = history.value.pop();
  questionId.value = previous.questionId;
  answerId.value = previous.optionId;
}

watch([questionId, () => props.active], async () => {
  await nextTick();

  if (props.active && heading.value) {
    heading.value.focus();
  }
}, { immediate: true });
</script>

<template>
  <section class="injury-question-page" aria-labelledby="question-title">
    <div class="injury-question-shell">
      <div class="injury-question-top">
        <button class="injury-text-button" type="button" @click="emit('back')">
          <ArrowLeft :size="16" aria-hidden="true" /> Change area
        </button>
      </div>

      <form class="injury-question-form" @submit.prevent="nextQuestion">
        <p class="injury-step">Question {{ history.length + 1 }}</p>

        <h1 id="question-title" ref="heading" tabindex="-1">
          {{ question.text }}
        </h1>

        <fieldset
          :key="questionId"
          class="injury-options"
          aria-labelledby="question-title"
        >
          <AnswerChoice
            v-model="selectedAnswers"
            :question="choiceQuestion"
            :show-help="false"
          />
        </fieldset>

        <div class="injury-question-actions">
          <button class="injury-text-button" type="button" @click="previousQuestion">
            <ArrowLeft :size="16" aria-hidden="true" /> Back
          </button>
          <button class="button button-dark" type="submit" :disabled="!answerId">
            Continue <ArrowRight :size="16" aria-hidden="true" />
          </button>
        </div>
      </form>

    </div>
  </section>
</template>
