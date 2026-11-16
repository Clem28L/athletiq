<script setup>
import { RouterView } from "vue-router";
import AppHeader from "./components/AppHeader.vue";
import AppFooter from "./components/AppFooter.vue";
import AppSidebar from "./components/AppSidebar.vue";
</script>

<template>
  <AppSidebar />
  <div class="app">
    <AppHeader />
    <main class="main-content">
      <RouterView v-slot="{ Component, route }">
        <component
          :is="Component"
          :key="route.name === 'nutrition-plans' ? route.fullPath : route.name"
        />
      </RouterView>
    </main>
    <AppFooter />
  </div>
</template>
