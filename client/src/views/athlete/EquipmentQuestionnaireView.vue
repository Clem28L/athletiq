<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import AnswerChoice from "@/components/answers/AnswerChoice.vue";
import AnswerSlider from "@/components/answers/AnswerSlider.vue";
import { isAuthenticated } from "@/stores/auth";
import { createAnswer, isAnswerComplete } from "@/utils/QuizAnswers";
import { equipmentRequest } from "@/utils/equipmentApi";

import "@/assets/athlete-quizzes.css";
import "@/assets/quiz-answers.css";

const route = useRoute();
const router = useRouter();
const questionnaire = ref(null);
const answers = ref({});
const questionIndex = ref(0);
const questionTitle = ref(null);
const loading = ref(true);
const submitting = ref(false);
const submitError = ref("");
let loadId = 0;

// Question à afficher
const currentQuestion = computed(() => {
  if (!questionnaire.value) {
    return null;
  }

  return questionnaire.value.questions[questionIndex.value];
});

// Vérifie que la question a une réponse
const canContinue = computed(() => {
  const question = currentQuestion.value;
  if (!question) {
    return false;
  }

  return isAnswerComplete(question, answers.value[question.id_question]);
});

// Charge le questionnaire et prépare les réponses
async function loadQuestionnaire() {
  const requestId = ++loadId;
  loading.value = true;
  submitting.value = false;
  submitError.value = "";
  questionnaire.value = null;
  questionIndex.value = 0;
  answers.value = {};

  try {
    const category = encodeURIComponent(route.params.category);
    const path = "/categories/" + category + "/questionnaire";
    const data = await equipmentRequest(path, "GET");

    // Ignore une réponse d'une ancienne requête
    if (requestId !== loadId || !data) {
      return;
    }

    for (const question of data.questions) {
      answers.value[question.id_question] = createAnswer(question);
    }

    questionnaire.value = data;
  } catch {
    // Retour à la grille si le questionnaire ne charge pas
    if (requestId === loadId) {
      router.replace("/equipment");
    }
  } finally {
    if (requestId === loadId) {
      loading.value = false;
    }
  }
}

// Change de question en gardant les réponses
async function moveQuestion(step) {
  questionIndex.value += step;
  await nextTick();

  if (questionTitle.value) {
    questionTitle.value.focus();
  }
}

// Envoie les réponses quand l'athlète termine
async function submitQuestionnaire() {
  if (submitting.value || !canContinue.value) {
    return;
  }

  const requestId = loadId;
  submitting.value = true;
  submitError.value = "";

  try {
    const category = encodeURIComponent(route.params.category);
    const path = "/categories/" + category + "/submissions";
    const body = JSON.stringify({
      version: questionnaire.value.version,
      answers: answers.value,
    });

    const result = await equipmentRequest(path, "POST", body);
    if (result && requestId === loadId) {
      await router.replace({
        name: "equipment-recommendations",
        params: { id: result.id_submission },
      });
    }
  } catch (err) {
    if (requestId !== loadId) {
      return;
    }

    submitError.value = "Couldn't save your answers. Try again.";
    if (err.status === 409) {
      submitError.value = "The questionnaire changed. Reopen it from Equipment.";
    }
  } finally {
    if (requestId === loadId) {
      submitting.value = false;
    }
  }
}

// Recharge si la catégorie change dans l'URL
watch(() => route.params.category, loadQuestionnaire, { immediate: true });

// Retour à la connexion après déconnexion
watch(isAuthenticated, (authenticated) => {
  if (!authenticated) {
    router.replace("/login");
  }
});
</script>

<template>
  <div class="athlete-quizzes-page equipment-questionnaire">
    <div class="quiz-player">
      <RouterLink to="/equipment" class="quiz-back-button">
        Back to equipment
      </RouterLink>

      <p v-if="loading" class="athlete-state" role="status">Loading…</p>

      <template v-else-if="currentQuestion">
        <header class="athlete-page-header">
          <h1 lang="fr">{{ questionnaire.title }}</h1>
        </header>

        <div class="quiz-question-card">
          <div class="quiz-question-header">
            <p class="quiz-progress">
              Question {{ questionIndex + 1 }} of {{ questionnaire.questions.length }}
            </p>
          </div>

          <h2 id="equipment-question-title" ref="questionTitle" tabindex="-1" lang="fr">
            {{ currentQuestion.text }}
          </h2>

          <fieldset
            :key="currentQuestion.id_question"
            :disabled="submitting"
            class="quiz-answer-area"
            aria-labelledby="equipment-question-title"
          >
            <AnswerSlider
              v-if="currentQuestion.type_answer === 'slider'"
              v-model="answers[currentQuestion.id_question]"
              :question="currentQuestion"
            />
            <AnswerChoice
              v-else
              v-model="answers[currentQuestion.id_question]"
              :question="currentQuestion"
              :show-help="false"
            />
          </fieldset>

          <p v-if="submitError" class="athlete-error" role="alert">{{ submitError }}</p>

          <div class="quiz-player-actions">
            <button
              v-if="questionIndex > 0"
              type="button"
              class="refresh-button"
              :disabled="submitting"
              @click="moveQuestion(-1)"
            >
              Previous
            </button>
            <button
              v-if="questionIndex < questionnaire.questions.length - 1"
              type="button"
              class="start-quiz-button"
              :disabled="!canContinue"
              @click="moveQuestion(1)"
            >
              Next
            </button>
            <button
              v-else
              type="button"
              class="start-quiz-button"
              :disabled="!canContinue || submitting"
              @click="submitQuestionnaire"
            >
              Finish
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.quiz-player {
  max-width: 760px;
}

.quiz-back-button {
  display: inline-block;
}

.start-quiz-button {
  margin-left: auto;
}

@media (max-width: 560px) {
  .equipment-questionnaire {
    padding-left: 88px;
  }
}
</style>
