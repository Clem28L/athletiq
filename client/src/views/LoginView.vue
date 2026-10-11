
<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";

const email = ref("");
const password = ref("");
const error = ref("");
// Login validation
function handleSubmit() {
  error.value = "";
  // Required fields
  if (!email.value || !password.value) {
    error.value = "Please fill in all fields.";
    return;
  }
  // Missing backend
  error.value = "Login is not connected to the server yet.";
}
</script>

<template>
  <section class="auth-page">
    <form class="auth-card" @submit.prevent="handleSubmit">
      <h1>Log in</h1>

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="Enter your password"
          autocomplete="current-password"
          required
        />
      </div>

      <p v-if="error" class="form-message" role="alert">
        {{ error }}
      </p>

      <button type="submit" class="button button-dark button-full">
        Log in
      </button>

      <p class="auth-switch">
        No account?
        <RouterLink to="/register">Sign up</RouterLink>
      </p>
    </form>
  </section>
</template>
