<script setup>
import { ref, computed, onMounted } from "vue";
import { RouterLink, useRouter } from "vue-router";

import { user, logoutUser } from "@/stores/auth";

import FeatureCard from "@/components/FeatureCard.vue";
import QuizModuleFilter from "@/components/QuizModuleFilter.vue";
import DashboardPlanner from "@/components/DashboardPlanner.vue";

import "@/assets/home-dashboard.css";

const router = useRouter();

const stats = ref(null);
const quizzes = ref([]);
const recent = ref([]);
const loading = ref(false);
const error = ref("");
const selectedModule = ref("all");

// Choose the page content from the user's role.
const isExpert = computed(function () {
  return Boolean(user.value && user.value.role === "expert");
});

// Choose the numbers shown in the three small cards.
const statCards = computed(function () {
  if (!stats.value) {
    return [];
  }

  if (isExpert.value) {
    return [
      {
        label: "Athlete attempts",
        value: stats.value.total_attempts,
      },
      {
        label: "Athletes reached",
        value: stats.value.total_athletes,
      },
      {
        label: "Your quizzes",
        value: stats.value.total_quizzes,
      },
    ];
  }

  return [
    {
      label: "Your attempts",
      value: stats.value.total_attempts,
    },
    {
      label: "Quizzes completed",
      value: stats.value.completed_quizzes,
    },
    {
      label: "Available quizzes",
      value: stats.value.total_quizzes,
    },
  ];
});

// Count the quizzes available in each topic.
const topics = computed(function () {
  const items = [
    { key: "prevention", name: "Prevention", count: 0 },
    { key: "nutrition", name: "Nutrition", count: 0 },
    { key: "equipment", name: "Equipment", count: 0 },
  ];

  for (let i = 0; i < quizzes.value.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (quizzes.value[i].module === items[j].key) {
        items[j].count++;
      }
    }
  }

  return items;
});

// Show up to three quizzes from the selected module.
const visibleQuizzes = computed(function () {
  const items = [];

  for (let i = 0; i < quizzes.value.length; i++) {
    const quiz = quizzes.value[i];

    if (
      selectedModule.value === "all" ||
      quiz.module === selectedModule.value
    ) {
      items.push(quiz);
    }

    if (items.length === 3) {
      break;
    }
  }

  return items;
});

// Keep no results different from a real score of zero.
function formatScore(value) {
  if (value === null || value === undefined) {
    return "No results";
  }

  return Number(value).toFixed(1) + "%";
}

// Show the date and time using the browser's local time.
function formatDate(value) {
  return new Date(value).toLocaleString("en-GB");
}

// Load the numbers, quiz list and recent activity.
async function loadDashboard() {
  if (!user.value) {
    return;
  }

  loading.value = true;
  error.value = "";
  stats.value = null;
  quizzes.value = [];
  recent.value = [];

  try {
    const response = await fetch(
      "http://localhost:3000/api/quizzes/dashboard",
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      }
    );

    if (response.status === 401) {
      logoutUser();
      await router.push("/login");
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      error.value = "Unable to load the dashboard.";

      if (data.error) {
        error.value = data.error;
      }

      return;
    }

    if (
      !data.stats ||
      !Array.isArray(data.quizzes) ||
      !Array.isArray(data.recent)
    ) {
      error.value = "The server returned an invalid response.";
      return;
    }

    stats.value = data.stats;
    quizzes.value = data.quizzes;
    recent.value = data.recent;
  } catch (err) {
    error.value = "Unable to contact the server.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<template>
  <div>
    <div v-if="!user" class="home-page">
      <section class="hero">
        <h1>Train smarter. Run longer.</h1>

        <p>
          Prevention, nutrition and gear for runners and trail runners.
        </p>

        <div class="hero-actions">
          <RouterLink to="/register" class="button button-dark">
            Sign up
          </RouterLink>

          <RouterLink to="/login" class="button button-outline">
            Log in
          </RouterLink>
        </div>
      </section>

      <section class="features">
        <FeatureCard
          title="Injury Prevention"
          description="Personalized exercise plans to prevent common running injuries."
          link="/login"
        />

        <FeatureCard
          title="Nutrition"
          description="Meal plans built around your training load and goals."
          link="/login"
        />

        <FeatureCard
          title="Equipment"
          description="Gear recommendations tailored to your terrain and style."
          link="/login"
        />
      </section>
    </div>

    <div v-else class="home-dashboard">
      <header class="dash-header">
        <div>
          <p class="dash-small">YOUR ATHLETIQ SPACE</p>
          <h1>Welcome, {{ user.name }}</h1>
          <p>Learn, plan your day and follow your activity.</p>
        </div>

        <button
          type="button"
          class="button button-outline"
          :disabled="loading"
          @click="loadDashboard"
        >
          Refresh
        </button>
      </header>

      <p v-if="loading" class="dash-state" role="status">
        Loading your dashboard...
      </p>

      <p
        v-else-if="error"
        class="dash-state dash-error"
        role="alert"
      >
        {{ error }}
      </p>

      <div v-if="stats && !loading && !error" class="dash-stats">
        <article
          v-for="card in statCards"
          :key="card.label"
          class="dash-card"
        >
          <p>{{ card.label }}</p>
          <strong class="dash-number">{{ card.value }}</strong>
        </article>
      </div>

      <div class="dash-grid">
        <section class="dash-card dash-score">
          <p class="dash-small">QUIZ RESULTS</p>
          <h2>Average score</h2>

          <div v-if="stats" class="dash-score-circle">
            {{ formatScore(stats.average_score) }}
          </div>

          <p v-else class="dash-state">
            Results are not available yet.
          </p>

          <p v-if="isExpert">
            Results from athletes on your quizzes.
          </p>

          <p v-else>
            Your results from completed quiz attempts.
          </p>

          <p class="dash-help">
            Every submitted attempt counts in the average.
          </p>
        </section>

        <!-- Keep the calendar available even if the server is offline. -->
        <DashboardPlanner
          :key="user.id"
          :user-id="user.id"
        />

        <section class="dash-card dash-actions">
          <p class="dash-small">QUICK ACCESS</p>
          <h2>Your next step</h2>

          <p v-if="isExpert">
            Share your knowledge and manage your questions.
          </p>

          <p v-else>
            Explore a topic or plan your next session.
          </p>

          <div v-if="isExpert" class="dash-links">
            <RouterLink
              to="/expert/quizzes/new"
              class="button button-dark"
            >
              Create a quiz
            </RouterLink>

            <RouterLink
              to="/expert/quizzes"
              class="button button-outline"
            >
              Manage quizzes
            </RouterLink>
          </div>

          <div v-else class="dash-links">
            <RouterLink
              to="/athlete/quizzes"
              class="button button-dark"
            >
              Explore quizzes
            </RouterLink>

            <a href="#home-planner" class="button button-outline">
              Plan my day
            </a>
          </div>
        </section>

        <section class="dash-card dash-topics">
          <p class="dash-small">EXPLORE</p>
          <h2>Your topics</h2>

          <p class="dash-help">
            Choose a topic to filter the quiz list below.
          </p>

          <p v-if="!stats">
            Topics appear after the dashboard loads.
          </p>

          <div v-else>
            <button
              v-for="topic in topics"
              :key="topic.key"
              type="button"
              class="dash-topic"
              :aria-pressed="selectedModule === topic.key"
              @click="selectedModule = topic.key"
            >
              <span>{{ topic.name }}</span>
              <strong>{{ topic.count }} quizzes</strong>
            </button>
          </div>
        </section>

        <section class="dash-card dash-activity">
          <p class="dash-small">RECENT ACTIVITY</p>
          <h2>Latest results</h2>

          <p v-if="!stats">
            Activity appears after the dashboard loads.
          </p>

          <p v-else-if="recent.length === 0">
            No recent results to show.
          </p>

          <ul v-else class="dash-activity-list">
            <li
              v-for="item in recent"
              :key="item.id_attempt"
            >
              <div>
                <strong>{{ item.title }}</strong>
                <small>{{ formatDate(item.attempt_date) }}</small>
              </div>

              <span>{{ formatScore(item.score) }}</span>
            </li>
          </ul>
        </section>
      </div>

      <section
        v-if="stats && !loading && !error"
        class="dash-card dash-quizzes"
      >
        <div class="dash-header">
          <div>
            <p class="dash-small">KEEP LEARNING</p>
            <h2 v-if="isExpert">Your quizzes</h2>
            <h2 v-else>Quizzes to explore</h2>
          </div>

          <QuizModuleFilter
            id="home-module"
            v-model="selectedModule"
          />
        </div>

        <p
          v-if="visibleQuizzes.length === 0"
          class="dash-state"
        >
          No quizzes in this module yet.
        </p>

        <div v-else class="dash-quiz-list">
          <article
            v-for="quiz in visibleQuizzes"
            :key="quiz.id_quiz"
            class="dash-quiz"
          >
            <p class="dash-small">{{ quiz.module }}</p>
            <h3>{{ quiz.title }}</h3>

            <p>
              {{ quiz.attempt_count }} attempts ·
              {{ formatScore(quiz.average_score) }}
            </p>

            <p
              v-if="isExpert && Number(quiz.published) === 0"
              class="dash-help"
            >
              Draft
            </p>

            <RouterLink
              v-if="isExpert"
              :to="'/expert/quizzes/' + quiz.id_quiz + '/questions'"
              class="button button-outline"
            >
              Manage questions
            </RouterLink>

            <RouterLink
              v-else
              :to="'/athlete/quizzes/' + quiz.id_quiz"
              class="button button-outline"
            >
              Start quiz
            </RouterLink>
          </article>
        </div>

        <p class="dash-help">
          Up to three of the newest quizzes are shown.
        </p>
      </section>
    </div>
  </div>
</template>