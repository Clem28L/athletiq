<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { logoutUser, user } from "@/stores/auth";
import QuizModuleFilter from "@/components/QuizModuleFilter.vue";

const router = useRouter();
const dashboard = ref(null);
const loading = ref(true);
const error = ref("");
const selectedModule = ref("all");

const quizzes = computed(() => {
  const items = dashboard.value?.quizzes || [];
  if (selectedModule.value === "all") return items.slice(0, 3);
  return items.filter((quiz) => quiz.module === selectedModule.value).slice(0, 3);
});

// Charge les quiz et les résultats de l'expert.
async function loadDashboard() {
  loading.value = true;
  error.value = "";
  try {
    const response = await fetch("http://localhost:3000/api/quizzes/dashboard", {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    });
    if (response.status === 401) {
      logoutUser();
      await router.replace("/login");
      return;
    }
    if (!response.ok) throw new Error("Dashboard request failed.");
    dashboard.value = await response.json();
  } catch {
    error.value = "Unable to load your quiz activity.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<template>
  <div class="dashboard-page">
    <section class="dashboard-hero expert-hero">
      <div class="hero-copy">
        <p class="hero-greeting">Welcome, {{ user.name }}</p>
        <h1>Expert dashboard</h1>
        <div class="hero-links">
          <RouterLink to="/expert/quizzes/new" class="button button-lime">Create a quiz</RouterLink>
          <RouterLink to="/expert/quizzes" class="button button-outline">Manage quizzes</RouterLink>
        </div>
      </div>
    </section>

    <p v-if="loading" role="status">Loading quiz activity…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>

    <template v-else-if="dashboard">
      <dl class="expert-stats">
        <div><dt>Your quizzes</dt><dd>{{ dashboard.stats.total_quizzes }}</dd></div>
        <div><dt>Athlete attempts</dt><dd>{{ dashboard.stats.total_attempts }}</dd></div>
        <div><dt>Athletes reached</dt><dd>{{ dashboard.stats.total_athletes }}</dd></div>
        <div v-if="dashboard.stats.average_score != null">
          <dt>Average score</dt><dd>{{ Number(dashboard.stats.average_score) }}%</dd>
        </div>
      </dl>

      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <h2>Your quizzes</h2>
          <QuizModuleFilter id="home-module" v-model="selectedModule" />
        </div>
        <p v-if="quizzes.length === 0">No quizzes in this module.</p>
        <ul v-else class="expert-list">
          <li v-for="quiz in quizzes" :key="quiz.id_quiz">
            <RouterLink :to="'/expert/quizzes/' + quiz.id_quiz + '/questions'">
              <strong>{{ quiz.title }}</strong>
              <span v-if="!Number(quiz.published)">Draft</span>
              <span v-else>{{ quiz.attempt_count }} attempts</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-if="dashboard.recent.length" class="dashboard-section">
        <div class="dashboard-section-header"><h2>Latest results</h2></div>
        <ul class="expert-list">
          <li v-for="item in dashboard.recent" :key="item.id_attempt">
            <strong>{{ item.title }}</strong>
            <span>{{ Number(item.score) }}%</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
