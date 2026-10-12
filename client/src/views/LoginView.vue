
<script setup>
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { loginUser } from "@/stores/auth";

const router = useRouter();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

// Login validation and server request
async function handleSubmit() {
  error.value = "";

  // Required fields
  if (!email.value || !password.value) {
    error.value = "Please fill in all fields.";
    return;
  }

  // Show loading state while waiting for the server
  loading.value = true;

  try {
    // Send login details to the backend
    const response = await fetch(
      "http://localhost:3000/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.value,
          password: password.value,
        }),
      }
    );

    // Read the server response
    const data = await response.json();

    // Handle login errors
    if (!response.ok) {
      error.value = data.error || data.message || "Login failed.";
      return;
    }

    // Check the response data
    if (!data.token || !data.user) {
      error.value = "Invalid response from server.";
      return;
    }

    // Save authentication state and user information
    loginUser(data.user, data.token);

    // Redirect to the home page
    await router.push("/");
  } catch (err) {
    // Handle connection errors
    error.value = "Unable to contact the server. Please try again.";
  } finally {
    // Hide the loading state
    loading.value = false;
  }
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

      <!-- Display login errors -->
      <p v-if="error" class="form-message" role="alert">
        {{ error }}
      </p>

      <button
        type="submit"
        class="button button-dark button-full"
        :disabled="loading"
      >
        <!-- Change button text while waiting -->
        {{ loading ? "Logging in..." : "Log in" }}
      </button>

      <p class="auth-switch">
        No account?
        <RouterLink to="/register">Sign up</RouterLink>
      </p>
    </form>
  </section>
</template>
