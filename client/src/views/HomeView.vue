
<script setup>
import { RouterLink } from "vue-router";
import FeatureCard from "../components/FeatureCard.vue";
</script>

<template>
  <div class="home-page">
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
<!-- Features section: grid of reusable FeatureCard components -->
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
</template>
