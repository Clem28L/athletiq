<script setup>
import { RouterView, useRoute } from "vue-router";
import AppHeader from "./components/AppHeader.vue";
import AppFooter from "./components/AppFooter.vue";
import AppSidebar from "./components/AppSidebar.vue";

const route = useRoute();
</script>

<template>
  <AppSidebar />
  <div class="app" :class="{ 'app-full-height': route.meta.fullHeight }">
    <AppHeader />
    <main class="main-content">
      <RouterView />
    </main>
    <AppFooter v-if="!route.meta.fullHeight" />
  </div>
</template>
