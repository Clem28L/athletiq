<script setup>
import { RouterLink, useRoute, useRouter } from "vue-router";
import { computed, onMounted } from "vue";
import {
  isAuthenticated,
  user,
  logoutUser
} from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const title = computed(() => {
  if (route.name === "home") {
    if (user.value) return "Dashboard";
    return "Home";
  }
  const titles = {
    equipment: "Equipment",
    nutrition: "Nutrition",
    injuries: "Injuries",
    blessures: "Injuries",
    athlete: "Athlete",
    expert: "Quizzes",
    login: "Log in",
    register: "Sign up",
  };
  return titles[route.path.split("/")[1]] || "AthletiQ";
});

// Retour à l'accueil public après la déconnexion.
function signOut() {
  logoutUser();
  router.replace("/");
}

// Restore session on page load
onMounted(async () => {
  const token = localStorage.getItem("token");

  // Keep the user already set by loginUser
  if (!token || user.value) return;

  try {
    const response = await fetch(
      "http://localhost:3000/api/auth/me",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      logoutUser();
      return;
    }

    const data = await response.json();

    user.value = data.user; // Store user information
    isAuthenticated.value = true; // Update authentication state
  } catch (error) {
    console.error("Authentication error:", error);
  }
});
</script>

<template>
  <header class="header">
    <span class="header-title">{{ title }}</span>
    <RouterLink to="/" class="header-brand">
      AthletiQ
    </RouterLink>

    <!-- Authentication navigation -->
    <nav class="header-nav">
      <template v-if="!isAuthenticated">
        <RouterLink to="/login" class="nav-link">
          Log in
        </RouterLink>

        <RouterLink to="/register" class="button button-dark">
          Sign up
        </RouterLink>
      </template>

      <template v-else>
        <RouterLink v-if="user.role === 'athlete'" to="/athlete/profile" class="button button-outline">
          My profile
        </RouterLink>

        <button type="button" class="button button-outline" @click="signOut">
          Log out
        </button>
      </template>
    </nav>
  </header>
</template>
