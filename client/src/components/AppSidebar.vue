<template>
  <aside class="sidebar" :class="{ 'sidebar-open': isOpen }">
    <div class="sidebar-top">
      <RouterLink to="/" class="sidebar-logo">
        <span class="logo-icon">A</span>
        <span class="sidebar-label">AthletiQ</span>
      </RouterLink>

      <button
        class="toggle-button"
        @click="isOpen = !isOpen"
        :aria-label="isOpen ? 'Réduire le menu' : 'Ouvrir le menu'"
      >
        {{ isOpen ? "‹" : "☰" }}
      </button>
    </div>

    <nav class="sidebar-nav">
      <RouterLink to="/" class="sidebar-link" title="Accueil">
        <span class="sidebar-icon">⌂</span>
        <span class="sidebar-label">Accueil</span>
      </RouterLink>

      <RouterLink to="/quizzes" class="sidebar-link" title="Quiz">
        <span class="sidebar-icon">▤</span>
        <span class="sidebar-label">Quiz</span>
      </RouterLink>

      <RouterLink to="/nutrition" class="sidebar-link" title="Nutrition">
        <span class="sidebar-icon">◉</span>
        <span class="sidebar-label">Nutrition</span>
      </RouterLink>

      <RouterLink to="/prevention" class="sidebar-link" title="Prévention">
        <span class="sidebar-icon">✚</span>
        <span class="sidebar-label">Prévention</span>
      </RouterLink>

      <RouterLink to="/equipment" class="sidebar-link" title="Équipement">
        <span class="sidebar-icon">⚙</span>
        <span class="sidebar-label">Équipement</span>
      </RouterLink>
    </nav>

    <div class="sidebar-bottom">
      <button
        class="sidebar-link bottom-button"
        @click="isOpen = !isOpen"
      >
        <span class="sidebar-icon">⇔</span>
        <span class="sidebar-label">
          {{ isOpen ? "Réduire le menu" : "Agrandir le menu" }}
        </span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";

const isOpen = ref(false);
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  width: 72px;
  height: 100vh;
  padding: 18px 10px;
  display: flex;
  flex-direction: column;
  background: #f7f7f4;
  border-right: 1px solid #d6d5d1;
  transition: width 0.25s ease;
  overflow: hidden;
}

.sidebar-open {
  width: 240px;
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  margin-bottom: 32px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #33322f;
  text-decoration: none;
  font-size: 19px;
  font-weight: 700;
}

.logo-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #373631;
  color: white;
}

.toggle-button {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #373631;
  font-size: 22px;
  cursor: pointer;
}

.toggle-button:hover {
  background: #e9e8e3;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-link {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  color: #55544f;
  background: transparent;
  text-decoration: none;
  white-space: nowrap;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.sidebar-link:hover,
.sidebar-link.router-link-active {
  background: #e9e8e3;
  color: #25241f;
}

.sidebar-icon {
  width: 26px;
  flex-shrink: 0;
  text-align: center;
  font-size: 21px;
}

.sidebar-label {
  opacity: 0;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.sidebar-open .sidebar-label {
  opacity: 1;
}

.sidebar-bottom {
  margin-top: auto;
}

.bottom-button {
  width: 100%;
  text-align: left;
}

@media (max-width: 560px) {
  .sidebar-open {
    width: 240px;
    box-shadow: 8px 0 24px rgb(0 0 0 / 10%);
  }
}
</style>
