<script setup>
import { ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { Activity, Backpack, ClipboardList, Crosshair, LayoutDashboard, Menu, Salad, X } from "@lucide/vue";
import { user } from "@/stores/auth";

const route = useRoute();
const mobileOpen = ref(false);
const isAthlete = computed(() => user.value?.role === "athlete");
const isExpert = computed(() => user.value?.role === "expert");

const links = computed(() => {
  const home = { path: "/", label: "Home", icon: LayoutDashboard };
  if (user.value) {
    home.label = "Dashboard";
  }
  if (isExpert.value) {
    return [home, { path: "/expert/quizzes", label: "Manage quizzes", icon: ClipboardList }];
  }

  return [
    home,
    { path: "/equipment", label: "Equipment", icon: Backpack },
    { path: "/nutrition", label: "Nutrition", icon: Salad },
    { path: "/injuries", label: "Injuries", icon: Crosshair },
    { path: "/athlete/quizzes", label: "Quizzes", icon: ClipboardList },
  ];
});

// Ferme le menu mobile après une navigation.
watch(() => route.fullPath, () => {
  mobileOpen.value = false;
});

// Garde la rubrique active quand une fiche est ouverte.
function isActive(path) {
  return route.path === path || route.path.startsWith(path + "/");
}

// Les outils personnels demandent un compte athlète.
function destination(path) {
  if (!isAthlete.value && !isExpert.value && path !== "/" && path !== "/injuries") {
    return "/login";
  }
  return path;
}
</script>

<template>
  <button
    type="button"
    class="mobile-menu"
    aria-controls="site-sidebar"
    :aria-expanded="mobileOpen"
    :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
    @click="mobileOpen = !mobileOpen"
  >
    <X v-if="mobileOpen" :size="21" aria-hidden="true" />
    <Menu v-else :size="21" aria-hidden="true" />
  </button>

  <div v-if="mobileOpen" class="sidebar-overlay" @click="mobileOpen = false"></div>

  <aside
    id="site-sidebar"
    class="sidebar"
    :class="{ 'mobile-open': mobileOpen }"
    @keydown.esc="mobileOpen = false"
  >
    <RouterLink to="/" class="sidebar-logo" aria-label="AthletiQ" @click="mobileOpen = false">
      <span class="logo-icon"><Activity :size="23" aria-hidden="true" /></span>
      <span class="sidebar-label">AthletiQ</span>
    </RouterLink>

    <nav class="sidebar-nav" aria-label="Main navigation">
      <RouterLink
        v-for="link in links"
        :key="link.path"
        :to="destination(link.path)"
        :title="link.label"
        :aria-label="link.label"
        class="sidebar-link"
        :class="{ 'is-active': isActive(link.path) }"
        @click="mobileOpen = false"
      >
        <component :is="link.icon" :size="20" aria-hidden="true" />
        <span class="sidebar-label">{{ link.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 20;
  width: var(--sidebar-width);
  padding: 22px 14px;
  background: var(--panel);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 11px;
  width: fit-content;
  margin: 0 6px 42px;
  color: var(--ink);
  font-size: 22px;
  font-weight: 700;
  text-decoration: none;
}

.logo-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: none;
  place-items: center;
  border-radius: 4px;
  background: var(--primary);
  color: #fff;
}

.sidebar-nav {
  display: grid;
  gap: 5px;
}

.sidebar-link {
  display: flex;
  min-height: 45px;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  color: var(--muted);
  font-size: 14px;
  text-decoration: none;
  transition: background-color 160ms ease, color 160ms ease;
}

.sidebar-link svg {
  flex: none;
}

.sidebar-link:hover,
.sidebar-link.is-active {
  background: var(--page);
  color: var(--primary-deep);
}

.sidebar-link.is-active {
  font-weight: 700;
}

.mobile-menu,
.sidebar-overlay {
  display: none;
}

@media (min-width: 661px) and (max-width: 980px) {
  .sidebar {
    padding-inline: 10px;
  }

  .sidebar-logo {
    margin-inline: auto;
  }

  .sidebar-link {
    justify-content: center;
  }

  .sidebar-label {
    display: none;
  }
}

@media (max-width: 660px) {
  .sidebar {
    width: min(270px, 82vw);
    padding-top: 71px;
    visibility: hidden;
    transform: translateX(-100%);
    transition: transform 200ms ease, visibility 200ms;
  }

  .sidebar.mobile-open {
    visibility: visible;
    transform: translateX(0);
  }

  .sidebar-logo {
    display: none;
  }

  .mobile-menu {
    position: absolute;
    top: 10px;
    left: 12px;
    z-index: 21;
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 0;
    border-radius: 4px;
    background: var(--page);
    color: var(--ink);
    cursor: pointer;
  }

  .mobile-menu[aria-expanded="true"] {
    background: var(--panel);
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 19;
    display: block;
    background: rgb(26 20 50 / 45%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .sidebar-link {
    transition: none;
  }
}
</style>
