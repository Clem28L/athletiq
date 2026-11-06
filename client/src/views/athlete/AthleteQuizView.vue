<script setup>
import { ArrowLeft } from "@lucide/vue";
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { logoutUser } from "@/stores/auth";

import {
  createAnswer,
  isAnswerComplete,
} from "@/utils/QuizAnswers";

import AnswerChoice from "@/components/answers/AnswerChoice.vue";
import AnswerTrueFalse from "@/components/answers/AnswerTrueFalse.vue";
import AnswerNumber from "@/components/answers/AnswerNumber.vue";
import AnswerSlider from "@/components/answers/AnswerSlider.vue";
import AnswerShortText from "@/components/answers/AnswerShortText.vue";
import AnswerOrdering from "@/components/answers/AnswerOrdering.vue";
import AnswerMatching from "@/components/answers/AnswerMatching.vue";
import AnswerCategories from "@/components/answers/AnswerCategories.vue";
import AnswerCorrection from "@/components/answers/AnswerCorrection.vue";

import "@/assets/athlete-quizzes.css";
import "@/assets/quiz-answers.css";

const route = useRoute();
const router = useRouter();

// Keep the quiz and answers here while the athlete moves between questions.
const quiz = ref(null);
const questions = ref([]);
const answers = ref({});
const feedbacks = ref({});
const questionIndex = ref(0);

const loading = ref(true);
const submitting = ref(false);
const checking = ref(false);
const error = ref("");
const submitError = ref("");
const quizChanged = ref(false);
const result = ref(null);

// Update the displayed question when questionIndex changes.
const currentQuestion = computed(function () {
  if (questions.value.length === 0) {
    return null;
  }

  return questions.value[questionIndex.value];
});

// Keep each correction when the athlete visits another question.
const currentFeedback = computed(function () {
  if (currentQuestion.value) {
    const feedback = feedbacks.value[currentQuestion.value.id_question];

    if (feedback) {
      return feedback;
    }
  }

  return null;
});

// Count completed answers without checking if they are correct.
const answeredCount = computed(function () {
  let count = 0;

  for (let i = 0; i < questions.value.length; i++) {
    const question = questions.value[i];
    const value = answers.value[question.id_question];

    if (isAnswerComplete(question, value)) {
      count++;
    }
  }

  return count;
});

// Load the quiz and start with empty answers.
async function loadQuiz() {
  loading.value = true;
  error.value = "";
  submitError.value = "";
  quizChanged.value = false;

  quiz.value = null;
  questions.value = [];
  answers.value = {};
  feedbacks.value = {};
  questionIndex.value = 0;
  result.value = null;

  const token = localStorage.getItem("token");

  if (!token) {
    logoutUser();
    loading.value = false;
    await router.push("/login");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:3000/api/quizzes/" + route.params.id,
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    // Ask the athlete to log in again if the token is no longer valid.
    if (response.status === 401) {
      logoutUser();
      await router.push("/login");
      return;
    }

    if (response.status === 404) {
      error.value = "This quiz is no longer available.";
      return;
    }

    if (!response.ok) {
      error.value = "Unable to load this quiz.";
      return;
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.questions) || !data.version) {
      error.value = "The server returned an invalid response.";
      return;
    }

    quiz.value = data;
    questions.value = data.questions;

    // Use each question's ID to store its own answer.
    for (let i = 0; i < questions.value.length; i++) {
      const question = questions.value[i];

      answers.value[question.id_question] = createAnswer(question);
    }
  } catch (err) {
    error.value = "Unable to contact the server.";
  } finally {
    loading.value = false;
  }
}

// Ask the server to check the current answer before showing its correction.
async function checkCurrentAnswer() {
  if (checking.value || submitting.value || currentFeedback.value || quizChanged.value) {
    return;
  }

  const question = currentQuestion.value;
  const value = answers.value[question.id_question];
  submitError.value = "";

  if (!isAnswerComplete(question, value)) {
    submitError.value = "Please complete your answer first.";
    return;
  }

  checking.value = true;

  try {
    const response = await fetch(
      "http://localhost:3000/api/quizzes/" + route.params.id +
        "/questions/" + question.id_question + "/check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify({ version: quiz.value.version, value: value }),
      }
    );

    if (response.status === 401) {
      logoutUser();
      await router.push("/login");
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      submitError.value = "Unable to check this answer.";

      if (data.error) {
        submitError.value = data.error;
      }

      if (response.status === 409) {
        quizChanged.value = true;
      }

      return;
    }

    feedbacks.value[question.id_question] = data;
  } catch (err) {
    submitError.value = "Unable to check your answer. Please try again.";
  } finally {
    checking.value = false;
  }
}

// Show the next question without going past the last one.
function nextQuestion() {
  if (checking.value || submitting.value) {
    return;
  }

  submitError.value = "";

  if (currentFeedback.value && questionIndex.value < questions.value.length - 1) {
    questionIndex.value++;
  }
}

// Show the previous question without going before the first one.
function previousQuestion() {
  if (checking.value || submitting.value) {
    return;
  }

  submitError.value = "";

  if (questionIndex.value > 0) {
    questionIndex.value--;
  }
}

// Send all answers and let the server calculate the score.
async function submitQuiz() {
  // Stop if we are already sending, have a result, or must reload the quiz.
  if (checking.value || submitting.value || result.value || quizChanged.value) {
    return;
  }

  submitError.value = "";

  const submittedAnswers = [];

  for (let i = 0; i < questions.value.length; i++) {
    const question = questions.value[i];
    const value = answers.value[question.id_question];

    // Open the first question that still needs to be checked.
    if (!feedbacks.value[question.id_question] || !isAnswerComplete(question, value)) {
      questionIndex.value = i;
      submitError.value = "Please check your answer to question " + (i + 1) + ".";
      return;
    }

    submittedAnswers.push({
      questionId: question.id_question,
      value: value,
    });
  }

  submitting.value = true;

  try {
    const response = await fetch(
      "http://localhost:3000/api/quizzes/" +
        route.params.id +
        "/attempts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify({
          version: quiz.value.version,
          answers: submittedAnswers,
        }),
      }
    );

    if (response.status === 401) {
      logoutUser();
      await router.push("/login");
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      submitError.value = "Unable to submit this quiz.";

      if (data.error) {
        submitError.value = data.error;
      }

      // The server returns 409 when the quiz has changed.
      if (response.status === 409) {
        quizChanged.value = true;
      }

      // Open the question that caused the server error.
      for (let i = 0; i < questions.value.length; i++) {
        if (questions.value[i].id_question === data.questionId) {
          questionIndex.value = i;
        }
      }

      return;
    }

    result.value = data;
  } catch (err) {
    submitError.value =
      "Unable to confirm the submission. Check the server before trying again.";
  } finally {
    submitting.value = false;
  }
}

// Return to the quiz list.
function goBack() {
  router.push("/athlete/quizzes");
}

// Load the quiz when the page opens.
onMounted(loadQuiz);
</script>

<template>
  <div class="athlete-quizzes-page">
    <button
      type="button"
      class="quiz-back-button"
      :disabled="checking || submitting"
      @click="goBack"
    >
      <ArrowLeft :size="16" aria-hidden="true" /> Back to quizzes
    </button>

    <p v-if="loading" class="athlete-state" role="status">
      Loading quiz...
    </p>

    <div v-else-if="error" class="athlete-state" role="alert">
      <p class="athlete-error">{{ error }}</p>

      <button
        type="button"
        class="refresh-button"
        @click="loadQuiz"
      >
        Retry
      </button>
    </div>

    <div v-else-if="quiz" class="quiz-player">
      <header class="athlete-page-header">
        <div>
          <h1>{{ quiz.title }}</h1>
          <p v-if="quiz.description">{{ quiz.description }}</p>
        </div>
      </header>

      <!-- Show the result after the server has saved the attempt. -->
      <section
        v-if="result"
        class="quiz-question-card quiz-result"
        role="status"
      >
        <h2>Quiz completed</h2>

        <p class="quiz-score">{{ result.score }}%</p>

        <p>
          {{ result.earnedPoints }} / {{ result.totalPoints }} points
        </p>

        <p>
          {{ result.correctAnswers }} / {{ result.totalQuestions }}
          correct answers
        </p>

        <p class="answer-help">
          Attempt #{{ result.attemptId }} saved.
        </p>

        <button
          type="button"
          class="start-quiz-button"
          @click="goBack"
        >
          Back to quizzes
        </button>
      </section>

      <div v-else-if="questions.length === 0" class="athlete-state">
        This quiz does not contain any questions yet.
      </div>

      <section
        v-else-if="currentQuestion"
        class="quiz-question-card"
        aria-labelledby="current-question-title"
      >
        <div class="quiz-question-header">
          <p class="quiz-progress">
            Question {{ questionIndex + 1 }} of {{ questions.length }}
          </p>

          <span class="question-points">
            {{ currentQuestion.points }} points
          </span>
        </div>

        <h2 id="current-question-title" aria-live="polite">
          {{ currentQuestion.text }}
        </h2>

        <!-- The key creates a fresh answer block when the question changes. -->
        <fieldset
          :key="currentQuestion.id_question"
          class="quiz-answer-area"
          :disabled="checking || submitting || quizChanged || currentFeedback"
        >
          <legend class="answer-legend">Your answer</legend>

          <!-- Show the right component and keep its answer under the question ID. -->
          <AnswerChoice
            v-if="
              currentQuestion.type_answer === 'single_choice' ||
              currentQuestion.type_answer === 'multiple_choice'
            "
            :question="currentQuestion"
            :feedback="currentFeedback"
            v-model="answers[currentQuestion.id_question]"
          />

          <AnswerTrueFalse
            v-else-if="currentQuestion.type_answer === 'true_false'"
            :question="currentQuestion"
            :feedback="currentFeedback"
            v-model="answers[currentQuestion.id_question]"
          />

          <AnswerNumber
            v-else-if="currentQuestion.type_answer === 'numeric'"
            :question="currentQuestion"
            :feedback="currentFeedback"
            v-model="answers[currentQuestion.id_question]"
          />

          <AnswerSlider
            v-else-if="currentQuestion.type_answer === 'slider'"
            :question="currentQuestion"
            :feedback="currentFeedback"
            v-model="answers[currentQuestion.id_question]"
          />

          <AnswerShortText
            v-else-if="currentQuestion.type_answer === 'short_text'"
            :question="currentQuestion"
            :feedback="currentFeedback"
            v-model="answers[currentQuestion.id_question]"
          />

          <AnswerOrdering
            v-else-if="currentQuestion.type_answer === 'ordering'"
            :question="currentQuestion"
            :feedback="currentFeedback"
            v-model="answers[currentQuestion.id_question]"
          />

          <AnswerMatching
            v-else-if="currentQuestion.type_answer === 'matching'"
            :question="currentQuestion"
            :feedback="currentFeedback"
            v-model="answers[currentQuestion.id_question]"
          />

          <AnswerCategories
            v-else-if="currentQuestion.type_answer === 'categorization'"
            :question="currentQuestion"
            :feedback="currentFeedback"
            v-model="answers[currentQuestion.id_question]"
          />
        </fieldset>

        <AnswerCorrection v-if="currentFeedback" :feedback="currentFeedback" />

        <p class="answer-help">
          {{ answeredCount }} / {{ questions.length }} answered
        </p>

        <p v-if="submitError" class="athlete-error" role="alert">
          {{ submitError }}
        </p>

        <button
          v-if="quizChanged"
          type="button"
          class="refresh-button"
          @click="loadQuiz"
        >
          Reload quiz
        </button>

        <div class="quiz-player-actions">
          <button
            type="button"
            class="refresh-button"
            :disabled="questionIndex === 0 || checking || submitting"
            @click="previousQuestion"
          >
            Previous
          </button>

          <button
            v-if="!currentFeedback"
            type="button"
            class="start-quiz-button"
            :disabled="checking || submitting || quizChanged"
            @click="checkCurrentAnswer"
          >
            <span v-if="checking">Checking...</span>
            <span v-else>Check answer</span>
          </button>

          <button
            v-else-if="questionIndex < questions.length - 1"
            type="button"
            class="start-quiz-button"
            :disabled="submitting"
            @click="nextQuestion"
          >
            Next
          </button>

          <button
            v-else
            type="button"
            class="start-quiz-button"
            :disabled="submitting || quizChanged"
            @click="submitQuiz"
          >
            <span v-if="submitting">Submitting...</span>
            <span v-else>Submit quiz</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
