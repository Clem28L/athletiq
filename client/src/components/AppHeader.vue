
<script setup>
// RouterLink import for internal navigation
import { RouterLink } from "vue-router";
</script>

<template>
  <header class="header">
    <RouterLink to="/" class="logo">
      AthletiQ
    </RouterLink>
<!-- Navigation links: auth pages -->
    <nav class="header-nav">
      <RouterLink to="/login" class="nav-link">
        Log in
      </RouterLink>

      <RouterLink to="/register" class="button button-dark">
        Sign up
      </RouterLink>
    </nav>
  </header>
</template>
