<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { logoutUser } from "@/stores/auth";

import QuizModuleFilter from "@/components/QuizModuleFilter.vue";
import "@/assets/athlete-quizzes.css";

const router = useRouter();

// Page data and selected module
const quizzes = ref([]);
const loading = ref(true);
const error = ref("");
const selectedModule = ref("all");

const moduleLabels = {
  prevention: "Prévention",
  nutrition: "Nutrition",
  equipment: "Équipement",
};

// Return quizzes from the selected module
const filteredQuizzes = computed(function () {
  const results = [];

  // Keep all quizzes or only those matching the module
  for (let i = 0; i < quizzes.value.length; i++) {
    const quiz = quizzes.value[i];

    if (selectedModule.value === "all") {
      results.push(quiz);
    } else if (quiz.module === selectedModule.value) {
      results.push(quiz);
    }
  }

  return results;
});

// Return the module name displayed on a card
function getModuleLabel(module) {
  if (moduleLabels[module]) {
    return moduleLabels[module];
  }

  return module;
}

// Load published quizzes from the API
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

    // Return to login if the token is invalid or expired
    if (response.status === 401) {
      logoutUser();
      await router.push("/login");
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      error.value = "Impossible de charger les quiz.";

      if (data.error) {
        error.value = data.error;
      }

      return;
    }

    if (!Array.isArray(data)) {
      error.value = "La réponse du serveur est invalide.";
      return;
    }

    quizzes.value = data;
  } catch (err) {
    error.value = "Impossible de contacter le serveur.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadQuizzes);
</script>

<template>
  <div class="athlete-quizzes-page">
    <header class="athlete-page-header">
      <div>
        <h1>My Quizzes</h1>
        <p>
          Discover quizzes about prevention, nutrition and equipment.
        </p>
      </div>

      <button
        type="button"
        class="refresh-button"
        :disabled="loading"
        @click="loadQuizzes"
      >
        <span v-if="loading">Loading...</span>
        <span v-else>Refresh</span>
      </button>
    </header>

    <!-- Shared module filter -->
    <div class="athlete-quiz-toolbar">
      <QuizModuleFilter
        id="athlete-module"
        v-model="selectedModule"
      />

      <p v-if="!loading && !error" class="quiz-count">
        {{ filteredQuizzes.length }} available quizzes
      </p>
    </div>

    <p v-if="loading" class="athlete-state" role="status">
      Loading quizzes...
    </p>

    <div v-else-if="error" class="athlete-state" role="alert">
      <p class="athlete-error">{{ error }}</p>

      <button
        type="button"
        class="refresh-button"
        @click="loadQuizzes"
      >
        Retry
      </button>
    </div>

    <div v-else-if="quizzes.length === 0" class="athlete-state">
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

        <p v-if="quiz.category" class="quiz-category">
          {{ quiz.category }}
        </p>
      </article>
    </div>
  </div>
</template>