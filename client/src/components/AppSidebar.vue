<template>
  <div>
    <!-- Fond assombri sur mobile -->
    <div
      v-if="isMobileOpen"
      class="sidebar-overlay"
      @click="isMobileOpen = false"
    ></div>

    <aside
      class="sidebar"
      :class="{ 'mobile-open': isMobileOpen }"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <div class="sidebar-top">
        <RouterLink to="/" class="sidebar-logo" @click="closeMobile">
          <span class="logo-icon">A</span>
          <span class="sidebar-label">AthletiQ</span>
        </RouterLink>

        <!-- Bouton d'ouverture uniquement sur mobile -->
        <button
          class="mobile-toggle"
          @click="isMobileOpen = !isMobileOpen"
          :aria-label="isMobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'"
        >
          {{ isMobileOpen ? "‹" : "☰" }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <RouterLink
          to="/"
          class="sidebar-link"
          title="Accueil"
          @click="closeMobile"
        >
          <span class="sidebar-icon">⌂</span>
          <span class="sidebar-label">Accueil</span>
        </RouterLink>

        <RouterLink
          :to="quizLink"
          class="sidebar-link"
          :title="quizLabel"
          @click="closeMobile"
        >
          <span class="sidebar-icon">▤</span>
          <span class="sidebar-label">{{ quizLabel }}</span>
        </RouterLink>

        <RouterLink
          to="/nutrition"
          class="sidebar-link"
          title="Nutrition"
          @click="closeMobile"
        >
          <span class="sidebar-icon">◉</span>
          <span class="sidebar-label">Nutrition</span>
        </RouterLink>

        <RouterLink
          to="/prevention"
          class="sidebar-link"
          title="Prévention"
          @click="closeMobile"
        >
          <span class="sidebar-icon">✚</span>
          <span class="sidebar-label">Prévention</span>
        </RouterLink>

        <RouterLink
          to="/equipment"
          class="sidebar-link"
          title="Équipement"
          @click="closeMobile"
        >
          <span class="sidebar-icon">⚙</span>
          <span class="sidebar-label">Équipement</span>
        </RouterLink>
      </nav>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { RouterLink } from "vue-router";
import { getCurrentUser } from "@/stores/auth";

const isMobileOpen = ref(false);

// Utilisateur connecté
const user = computed(() => getCurrentUser());

// Lien Quiz selon le rôle
const quizLink = computed(() => {
  if (!user.value) return "/login";
  if (user.value.role === "expert") return "/expert/quizzes";
  return "/athlete/quizzes";
});

// Texte du lien Quiz selon le rôle
const quizLabel = computed(() => {
  if (user.value?.role === "expert") return "Gérer les quiz";
  return "Quiz";
});

// Détecte si on est sur mobile
const isMobile = () => window.matchMedia("(max-width: 560px)").matches;

// Gestion du survol sur ordinateur
const handleMouseEnter = () => {
  // Sur ordinateur, le CSS gère l'ouverture
};

const handleMouseLeave = () => {
  // Sur ordinateur, le CSS gère la fermeture
};

// Ferme le menu après une navigation sur mobile
const closeMobile = () => {
  if (isMobile()) {
    isMobileOpen.value = false;
  }
};
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  box-sizing: border-box;
  width: 72px;
  height: 100vh;
  height: 100dvh;
  padding: 18px 10px;
  display: flex;
  flex-direction: column;
  background: #f7f7f4;
  border-right: 1px solid #d6d5d1;
  overflow: hidden;
  transition:
    width 0.25s ease,
    box-shadow 0.25s ease;
}

/* Ordinateur : ouverture uniquement au survol */
@media (min-width: 561px) {
  .sidebar:hover {
    width: 240px;
    box-shadow: 8px 0 24px rgb(0 0 0 / 8%);
  }

  .sidebar:hover .sidebar-label {
    opacity: 1;
  }

  .mobile-toggle {
    display: none;
  }
}

/* En-tête */
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

.sidebar-label {
  opacity: 0;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}

/* Navigation */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-link {
  min-height: 44px;
  box-sizing: border-box;
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
  transition: background 0.15s ease, color 0.15s ease;
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

/* Bouton réservé aux petits écrans */
.mobile-toggle {
  display: none;
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

.sidebar-overlay {
  display: none;
}

/* Mobile et petits écrans tactiles */
@media (max-width: 560px) {
  .sidebar {
    width: 72px;
    box-shadow: none;
  }

  .sidebar.mobile-open {
    width: min(260px, 85vw);
    box-shadow: 8px 0 24px rgb(0 0 0 / 12%);
  }

  .sidebar.mobile-open .sidebar-label {
    opacity: 1;
  }

  .mobile-toggle {
    display: block;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgb(0 0 0 / 35%);
  }
}

/* Respecte les préférences de réduction des animations */
@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .sidebar-label,
  .sidebar-link {
    transition: none;
  }
}
</style>
