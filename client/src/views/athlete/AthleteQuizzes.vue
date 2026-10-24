<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { logoutUser } from "@/stores/auth";

import QuizModuleFilter from "@/components/QuizModuleFilter.vue";

import "@/assets/athlete-quizzes.css";
import "@/assets/athlete-results.css";

const router = useRouter();

// Keep the lists, selected module and current page state.
const quizzes = ref([]);
const results = ref([]);
const loading = ref(true);
const error = ref("");
const selectedModule = ref("all");
const showResults = ref(false);

const moduleLabels = {
  prevention: "Prevention",
  nutrition: "Nutrition",
  equipment: "Equipment",
};

// Update the quiz list when the selected module or quizzes change.
const filteredQuizzes = computed(function () {
  const items = [];

  for (let i = 0; i < quizzes.value.length; i++) {
    const quiz = quizzes.value[i];

    if (selectedModule.value === "all") {
      items.push(quiz);
    } else if (quiz.module === selectedModule.value) {
      items.push(quiz);
    }
  }

  return items;
});

// Update the results list when the selected module or results change.
const filteredResults = computed(function () {
  const items = [];

  for (let i = 0; i < results.value.length; i++) {
    const result = results.value[i];

    if (selectedModule.value === "all") {
      items.push(result);
    } else if (result.module === selectedModule.value) {
      items.push(result);
    }
  }

  return items;
});

// Return the display name, or keep the original name if it is unknown.
function getModuleLabel(module) {
  if (moduleLabels[module]) {
    return moduleLabels[module];
  }

  return module;
}

// Show the date in English using the browser's local time.
function formatDate(value) {
  const date = new Date(value);

  return date.toLocaleString("en-GB");
}

// Load the quizzes published by experts.
async function loadQuizzes() {
  loading.value = true;
  error.value = "";

  const token = localStorage.getItem("token");

  if (!token) {
    logoutUser();
    loading.value = false;
    await router.push("/login");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:3000/api/quizzes/published",
      {
        method: "GET",
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

    if (!response.ok) {
      error.value = "Unable to load the quizzes.";
      return;
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      error.value = "The server returned an invalid response.";
      return;
    }

    quizzes.value = data;
  } catch (err) {
    error.value = "Unable to contact the server.";
  } finally {
    loading.value = false;
  }
}

// Load the athlete's latest saved result for each completed quiz.
async function loadResults() {
  loading.value = true;
  error.value = "";

  const token = localStorage.getItem("token");

  if (!token) {
    logoutUser();
    loading.value = false;
    await router.push("/login");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:3000/api/quizzes/results",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    if (response.status === 401) {
      logoutUser();
      await router.push("/login");
      return;
    }

    if (!response.ok) {
      error.value = "Unable to load your results.";
      return;
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      error.value = "The server returned an invalid response.";
      return;
    }

    results.value = data;
  } catch (err) {
    error.value = "Unable to contact the server.";
  } finally {
    loading.value = false;
  }
}

// Switch between quizzes and results, then load the selected list.
async function toggleResults() {
  showResults.value = !showResults.value;

  if (showResults.value) {
    await loadResults();
  } else {
    await loadQuizzes();
  }
}

// Reload the list currently displayed.
async function refreshPage() {
  if (showResults.value) {
    await loadResults();
  } else {
    await loadQuizzes();
  }
}

// Open the selected quiz without creating an attempt yet.
function startQuiz(id) {
  router.push("/athlete/quizzes/" + id);
}

// Load available quizzes when the page opens.
onMounted(loadQuizzes);
</script>

<template>
  <div class="athlete-quizzes-page">
    <header class="athlete-page-header">
      <div>
        <h1 v-if="showResults">My Results</h1>
        <h1 v-else>My Quizzes</h1>

        <p v-if="showResults">
          Your latest submitted score for each quiz.
        </p>

        <p v-else>
          Discover quizzes about prevention, nutrition and equipment.
        </p>
      </div>

      <button
        type="button"
        class="refresh-button"
        :disabled="loading"
        @click="refreshPage"
      >
        <span v-if="loading">Loading...</span>
        <span v-else>Refresh</span>
      </button>
    </header>

    <div class="athlete-quiz-toolbar">
      <div class="athlete-filter-actions">
        <!-- Use the same module filter as the expert page. -->
        <QuizModuleFilter
          id="athlete-module"
          v-model="selectedModule"
        />

        <button
          type="button"
          class="refresh-button"
          :disabled="loading"
          @click="toggleResults"
        >
          <span v-if="showResults">Available quizzes</span>
          <span v-else>My results</span>
        </button>
      </div>

      <p v-if="!loading && !error" class="quiz-count">
        <span v-if="showResults">
          {{ filteredResults.length }} quiz results
        </span>

        <span v-else>
          {{ filteredQuizzes.length }} available quizzes
        </span>
      </p>
    </div>

    <p v-if="loading" class="athlete-state" role="status">
      Loading...
    </p>

    <div v-else-if="error" class="athlete-state" role="alert">
      <p class="athlete-error">{{ error }}</p>

      <button
        type="button"
        class="refresh-button"
        @click="refreshPage"
      >
        Retry
      </button>
    </div>

    <!-- Show saved results after loading has finished without an error. -->
    <div v-else-if="showResults">
      <div v-if="results.length === 0" class="athlete-state">
        <h2>No results yet</h2>
        <p>Submit a quiz to see your result here.</p>
      </div>

      <div
        v-else-if="filteredResults.length === 0"
        class="athlete-state"
      >
        <h2>No results in this module</h2>
        <p>Select another module to see your results.</p>
      </div>

      <div v-else class="results-table-container">
        <table class="results-table">
          <caption>
            Latest submitted attempt for each quiz
          </caption>

          <thead>
            <tr>
              <th scope="col">Quiz</th>
              <th scope="col">Module</th>
              <th scope="col">Last score</th>
              <th scope="col">Submitted</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="result in filteredResults"
              :key="result.id_attempt"
            >
              <td>{{ result.title }}</td>

              <td>
                {{ getModuleLabel(result.module) }}
              </td>

              <td class="result-score">
                {{ Number(result.score) }}%
              </td>

              <td>
                {{ formatDate(result.attempt_date) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Show available quizzes when the results view is closed. -->
    <div v-else>
      <div v-if="quizzes.length === 0" class="athlete-state">
        <h2>No quizzes available</h2>
        <p>Quizzes will appear here when an expert publishes them.</p>
      </div>

      <div
        v-else-if="filteredQuizzes.length === 0"
        class="athlete-state"
      >
        <h2>No quizzes in this module</h2>
        <p>Select another module to see available quizzes.</p>
      </div>

      <div v-else class="athlete-quiz-grid">
        <article
          v-for="quiz in filteredQuizzes"
          :key="quiz.id_quiz"
          class="athlete-quiz-card"
        >
          <span class="quiz-module">
            {{ getModuleLabel(quiz.module) }}
          </span>

          <h2>{{ quiz.title }}</h2>

          <p v-if="quiz.description" class="quiz-description">
            {{ quiz.description }}
          </p>

          <div class="quiz-card-footer">
            <p v-if="quiz.category" class="quiz-category">
              {{ quiz.category }}
            </p>

            <button
              type="button"
              class="start-quiz-button"
              @click="startQuiz(quiz.id_quiz)"
            >
              Start quiz
            </button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>