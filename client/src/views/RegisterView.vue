
<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const role = ref("Athlete");
const specialty = ref("");
const error = ref("");

function handleSubmit() {
  error.value = "";

  if (!name.value || !email.value || !password.value || !confirmPassword.value) {
    error.value = "Please fill in all required fields.";
    return;
  }

  if (password.value.length < 8) {
    error.value = "Password must contain at least 8 characters.";
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match.";
    return;
  }

  error.value = "Registration is not connected to the server yet.";
}
</script>

<template>
  <section class="auth-page">
    <form class="auth-card register-card" @submit.prevent="handleSubmit">
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
        </select>
      </div>

      <div class="form-group" v-if="role === 'Expert'">
        <label for="specialty">Specialty</label>
        <select id="specialty" v-model="specialty">
          <option value="">Select specialty...</option>
          <option value="physiotherapy">Physiotherapy</option>
          <option value="nutrition">Nutrition</option>
          <option value="equipment">Equipment</option>
        </select>
      </div>

      <p v-if="error" class="form-message" role="alert">
        {{ error }}
      </p>

      <button type="submit" class="button button-dark button-full">
        Create account
      </button>

      <p class="auth-switch">
        Already have an account?
        <RouterLink to="/login">Log in</RouterLink>
      </p>
    </form>
  </section>
</template>
