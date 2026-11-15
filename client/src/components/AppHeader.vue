<script setup>
import { RouterLink } from "vue-router";
import { onMounted } from "vue";
import {
  isAuthenticated,
  user,
  logoutUser
} from "@/stores/auth";

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
    <RouterLink to="/" class="logo">
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
        <span class="nav-link">Welcome, {{ user.name }}</span>

        <RouterLink v-if="user.role === 'athlete'" to="/athlete/profile" class="button button-outline">
          My Profile
        </RouterLink>

        <button class="button button-dark" @click="logoutUser">
          Log out
        </button>
      </template>
    </nav>
  </header>
</template>

<style scoped>
/* Let account buttons wrap on small screens. */
.header,
.header-nav {
  flex-wrap: wrap;
}

.header-nav {
  justify-content: flex-end;
}

@media (max-width: 560px) {
  .header {
    padding-left: 88px;
  }
}
</style>
