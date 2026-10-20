<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";

import QuizModuleFilter from "@/components/QuizModuleFilter.vue";

const router = useRouter();

const quizzes = ref([]);
const loading = ref(true);
const error = ref("");
const filterModule = ref("all");

// Return quizzes from the selected module
const filteredQuizzes = computed(function () {
  const results = [];

  // Keep all quizzes or those matching the selected module
  for (let i = 0; i < quizzes.value.length; i++) {
    const quiz = quizzes.value[i];

    if (filterModule.value === "all") {
      results.push(quiz);
    } else if (quiz.module === filterModule.value) {
      results.push(quiz);
    }
  }

  return results;
});

// Load quizzes from the API
async function loadQuizzes() {
  loading.value = true;
  error.value = "";

  try {
    const response = await fetch("http://localhost:3000/api/quizzes", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      error.value = data.error || "Loading error";
      return;
    }

    quizzes.value = data;
  } catch (err) {
    error.value = "Cannot reach the server";
  } finally {
    loading.value = false;
  }
}

// Delete a quiz
async function deleteQuiz(id) {
  if (!confirm("Delete this quiz?")) return;

  try {
    const response = await fetch("http://localhost:3000/api/quizzes/" + id, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });

    if (!response.ok) {
      alert("Delete failed");
      return;
    }

    quizzes.value = quizzes.value.filter((q) => q.id_quiz !== id);
  } catch (err) {
    alert("Server error");
  }
}

// Toggle published / draft
async function togglePublish(quiz) {
  try {
    const response = await fetch(
      "http://localhost:3000/api/quizzes/" + quiz.id_quiz,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify({
          title: quiz.title,
          description: quiz.description,
          type: quiz.type,
          module: quiz.module,
          category: quiz.category,
          published: !quiz.published,
        }),
      }
    );

    if (!response.ok) {
      alert("Error");
      return;
    }

    quiz.published = !quiz.published;
  } catch (err) {
    alert("Server error");
  }
}

// Open the quiz form
function editQuiz(id) {
  router.push("/expert/quizzes/" + id + "/edit");
}

// Open the question manager
function manageQuestions(id) {
  router.push("/expert/quizzes/" + id + "/questions");
}

// Open the new quiz form
function goToNewQuiz() {
  router.push("/expert/quizzes/new");
}

onMounted(loadQuizzes);
</script>

<template>
  <div class="quiz-manager">
    <header class="page-header">
      <div>
        <h1>Quiz Management</h1>

        <p class="subtitle">
          {{ quizzes.length }} quizzes ·
          {{ quizzes.filter((q) => q.published).length }} published
        </p>
      </div>

      <button class="btn-primary" @click="goToNewQuiz">
        + New Quiz
      </button>
    </header>

    <!-- Shared module filter -->
    <div class="filters">
      <QuizModuleFilter
        id="expert-module"
        v-model="filterModule"
      />
    </div>

    <div v-if="loading" class="state-msg">
      Loading...
    </div>

    <div v-else-if="error" class="state-msg error">
      {{ error }}
    </div>

    <div v-else-if="filteredQuizzes.length === 0" class="state-msg">
      No quizzes to display.
    </div>

    <div v-else class="quiz-grid">
      <article
        v-for="quiz in filteredQuizzes"
        :key="quiz.id_quiz"
        class="quiz-card"
      >
        <div class="tags">
          <span class="tag">{{ quiz.module }}</span>
        </div>

        <h3>{{ quiz.title }}</h3>
        <p class="description">{{ quiz.description }}</p>
        <p class="category">{{ quiz.category }}</p>

        <div class="actions">
          <button class="btn-action" @click="editQuiz(quiz.id_quiz)">
            Edit
          </button>

          <button
            class="btn-action"
            @click="manageQuestions(quiz.id_quiz)"
          >
            Questions
          </button>

          <button class="btn-action" @click="togglePublish(quiz)">
            <span v-if="quiz.published">Unpublish</span>
            <span v-else>Publish</span>
          </button>

          <button
            class="btn-action danger"
            @click="deleteQuiz(quiz.id_quiz)"
          >
            Delete
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.quiz-manager {
  padding: 40px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
    sans-serif;
  color: #1d1d1f;
  background: #ffffff;
  min-height: 100vh;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.subtitle {
  color: #86868b;
  font-size: 14px;
  margin-top: 6px;
}

.btn-primary {
  background: #1d1d1f;
  color: white;
  border: none;
  padding: 12px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:hover {
  background: #000;
}

/* Filter */
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
}

/* Grid */
.quiz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

/* Card */
.quiz-card {
  background: white;
  border: 1px solid #1d1d1f;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.tags {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tag {
  font-size: 12px;
  padding: 4px 12px;
  border: 1px solid #d2d2d7;
  border-radius: 20px;
  color: #1d1d1f;
  text-transform: capitalize;
}

.quiz-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.description {
  color: #86868b;
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.category {
  color: #86868b;
  font-size: 13px;
  margin: 0 0 20px 0;
  margin-top: auto;
}

/* Actions */
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 16px;
  border-top: 1px solid #e5e5e7;
}

.btn-action {
  flex: 1;
  min-width: 80px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.btn-action:hover {
  background: #f5f5f7;
}

.btn-action.danger {
  color: #ff3b30;
  border-color: #ff3b30;
}

.btn-action.danger:hover {
  background: #ff3b30;
  color: white;
}

/* States */
.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: #86868b;
}

.state-msg.error {
  color: #ff3b30;
}
</style>