
<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const role = ref("Athlete");
const error = ref("");
const success = ref("");
const loading = ref(false);

// Form validation and server request
async function handleSubmit() {
  error.value = "";
  success.value = "";

  // Check required fields
  if (
    !name.value ||
    !email.value ||
    !password.value ||
    !confirmPassword.value
  ) {
    error.value = "Please fill in all required fields.";
    return;
  }

  // Password length (min 8 chars)
  if (password.value.length < 8) {
    error.value = "Password must contain at least 8 characters.";
    return;
  }

  // Check that both passwords match
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match.";
    return;
  }

  // Show loading state while waiting for the server
  loading.value = true;

  try {
    // Send registration details to the backend
    const response = await fetch(
      "http://localhost:3000/api/auth/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Send the fields expected by the backend
        body: JSON.stringify({
          name: name.value,
          email: email.value,
          password: password.value,
          role: role.value,
        }),
      }
    );

    // Read the response sent by the server
    const data = await response.json();

    // Display the error returned by the backend
    if (!response.ok) {
      error.value = data.error || "Registration failed.";
      return;
    }

    // Display success message after account creation
    success.value =
      "Account created successfully! You can now log in.";

    // Clear password fields after successful registration
    password.value = "";
    confirmPassword.value = "";
  } catch (err) {
    // Handle connection errors
    error.value =
      "Unable to contact the server. Please try again.";
  } finally {
    // Hide the loading state
    loading.value = false;
  }
}
</script>

<template>
  <section class="auth-page">
    <form
      class="auth-card register-card"
      @submit.prevent="handleSubmit"
    >
      <h1>Create your account</h1>

      <div class="form-group">
        <label for="name">Full name</label>
        <input
          id="name"
          v-model.trim="name"
          type="text"
          placeholder="Jane Runner"
          autocomplete="name"
          required
        />
      </div>

      <div class="form-group">
        <label for="register-email">Email</label>
        <input
          id="register-email"
          v-model.trim="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          required
        />
      </div>

      <div class="form-group">
        <label for="register-password">Password</label>
        <input
          id="register-password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          minlength="8"
          required
        />
      </div>

      <div class="form-group">
        <label for="confirm-password">Confirm password</label>
        <input
          id="confirm-password"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          required
        />
      </div>

      <div class="form-group">
        <label for="role">Role</label>
        <select id="role" v-model="role">
          <option value="Athlete">Athlete</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      <!-- Display registration errors -->
      <p v-if="error" class="form-message" role="alert">
        {{ error }}
      </p>

      <!-- Display registration success message -->
      <p v-if="success" class="form-message" role="status">
        {{ success }}
        <RouterLink to="/login">Log in</RouterLink>
      </p>

      <button
        type="submit"
        class="button button-dark button-full"
        :disabled="loading"
      >
        <!-- Change button text while waiting -->
        {{ loading ? "Creating account..." : "Create account" }}
      </button>

      <p class="auth-switch">
        Already have an account?
        <RouterLink to="/login">Log in</RouterLink>
      </p>
    </form>
  </section>
</template>
