<script setup>
import { computed, nextTick, ref, watch } from "vue";
import questionnaire from "../data/injuryQuestionnaire.json";
import { getInjuryResult } from "../utils/injuryQuestionnaire";

// eslint-disable-next-line no-undef
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

// eslint-disable-next-line no-undef
const emit = defineEmits(["complete", "back"]);

const questionId = ref(questionnaire.zones[props.zone.id].start);
const answerId = ref("");
const history = ref([]);
const heading = ref(null);
const question = computed(() => questionnaire.questions[questionId.value]);

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
          ← Changer de zone
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
          <label
            v-for="option in question.options"
            :key="option.id"
            class="injury-option"
            :class="{ 'injury-option-selected': answerId === option.id }"
          >
            <input
              v-model="answerId"
              type="radio"
              name="injury-answer"
              :value="option.id"
            />
            <span>{{ option.text }}</span>
          </label>
        </fieldset>

        <div class="injury-question-actions">
          <button class="injury-text-button" type="button" @click="previousQuestion">
            ← Retour
          </button>
          <button class="button button-dark" type="submit" :disabled="!answerId">
            Continuer <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>

    </div>
  </section>
</template>
