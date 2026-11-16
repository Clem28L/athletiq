<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowUpRight, Backpack, ClipboardList, Crosshair, Salad } from "@lucide/vue";
import { user } from "@/stores/auth";
import { equipmentRequest } from "@/utils/equipmentApi";
import { categoryDetails } from "@/utils/equipmentCategories";
import { nutritionRequest } from "@/utils/nutritionApi";
import ExpertDashboard from "@/views/expert/ExpertDashboard.vue";
import runnerPhoto from "@/assets/trail-runner.webp";
import "@/assets/home-dashboard.css";

const router = useRouter();
const equipment = ref([]);
const latestPlan = ref(null);
const isAthlete = computed(() => user.value?.role === "athlete");
const isExpert = computed(() => user.value?.role === "expert");
const firstName = computed(() => user.value?.name?.trim().split(/\s+/)[0]);

const tools = [
  { name: "Equipment", description: "Find gear for your terrain, training and budget.", route: "equipment", icon: Backpack, tone: "violet" },
  { name: "Nutrition", description: "Plan fuel and hydration for race day.", route: "nutrition-plans", icon: Salad, tone: "lime" },
  { name: "Injuries", description: "Select a painful area on the 3D body map.", route: "injury", icon: Crosshair, tone: "coral" },
  { name: "Quizzes", description: "Test your knowledge and review your results.", route: "athlete-quizzes", icon: ClipboardList, tone: "violet" },
];

const selections = computed(() => equipment.value.filter((item) => item.latest_submission_id));

// Les deux modules se chargent indépendamment.
watch(user, (_account, _previous, onCleanup) => {
  equipment.value = [];
  latestPlan.value = null;
  if (!isAthlete.value) {
    return;
  }

  let active = true;
  onCleanup(() => { active = false; });

  equipmentRequest("/categories", "GET").then((rows) => {
    if (active && rows) equipment.value = rows;
  }).catch((error) => console.warn("Unable to load equipment selections.", error));

  nutritionRequest(router, "?page=1").then((data) => {
    if (active) latestPlan.value = data.plans[0] || null;
  }).catch((error) => console.warn("Unable to load the latest nutrition plan.", error));
}, { immediate: true });

// Les outils avec un compte ouvrent la connexion pour un visiteur.
function toolDestination(tool) {
  if (!isAthlete.value && tool.route !== "injury") {
    return { name: "login" };
  }
  return { name: tool.route };
}
</script>

<template>
  <ExpertDashboard v-if="isExpert" />

  <div v-else class="dashboard-page">
    <section class="dashboard-hero">
      <div class="hero-copy">
        <p v-if="firstName" class="hero-greeting">Welcome, {{ firstName }}</p>
        <h1 v-if="isAthlete">Plan your<br />next race.</h1>
        <h1 v-else>Your running<br />toolkit.</h1>
        <p v-if="isAthlete" class="hero-description">
          Build a fueling plan around your distance, pace and aid stations.
        </p>
        <p v-else class="hero-description">
          Find your gear, plan your race nutrition and explore the 3D injury map.
        </p>
        <div class="hero-links">
          <RouterLink
            v-if="isAthlete"
            :to="{ name: 'nutrition-plans', query: { new: '1' } }"
            class="button button-lime"
          >
            Create a race plan
            <ArrowUpRight :size="17" aria-hidden="true" />
          </RouterLink>
          <RouterLink v-else to="/register" class="button button-lime">
            Create an account
            <ArrowUpRight :size="17" aria-hidden="true" />
          </RouterLink>
        </div>
      </div>
      <div class="hero-image">
        <img :src="runnerPhoto" alt="" fetchpriority="high" />
      </div>
    </section>

    <section class="dashboard-section">
      <div class="dashboard-section-header">
        <h2>Athlete tools</h2>
      </div>
      <div class="dashboard-tools">
        <RouterLink
          v-for="tool in tools"
          :key="tool.route"
          :to="toolDestination(tool)"
          class="dashboard-tool"
          :data-tone="tool.tone"
        >
          <span class="tool-icon">
            <component :is="tool.icon" :size="19" aria-hidden="true" />
          </span>
          <div>
            <h3>{{ tool.name }}</h3>
            <p>{{ tool.description }}</p>
          </div>
        </RouterLink>
      </div>
    </section>

    <section v-if="isAthlete && (latestPlan || selections.length)" class="dashboard-section">
      <div class="dashboard-section-header">
        <h2>Pick up where you left off</h2>
      </div>
      <div class="dashboard-resume">
        <RouterLink
          v-if="latestPlan"
          :to="{ name: 'nutrition-plans', query: { plan: latestPlan.id_nutplan } }"
          class="resume-link"
        >
          <span class="tool-icon" data-tone="lime"><Salad :size="18" aria-hidden="true" /></span>
          <span><strong>{{ latestPlan.name }}</strong><small>Latest nutrition plan</small></span>
          <ArrowUpRight :size="17" aria-hidden="true" />
        </RouterLink>
        <RouterLink
          v-for="item in selections"
          :key="item.category"
          :to="{ name: 'equipment-recommendations', params: { id: item.latest_submission_id } }"
          class="resume-link"
        >
          <span class="tool-icon"><component :is="categoryDetails[item.category].icon" :size="18" aria-hidden="true" /></span>
          <span><strong>{{ categoryDetails[item.category].name }}</strong><small>Saved equipment selection</small></span>
          <ArrowUpRight :size="17" aria-hidden="true" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>
