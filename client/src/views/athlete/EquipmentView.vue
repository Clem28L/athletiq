<script setup>
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Backpack, Footprints, MountainSnow, Watch } from "@lucide/vue";
import EquipmentCard from "@/components/EquipmentCard.vue";
import { isAuthenticated, logoutUser } from "@/stores/auth";

// Textes et icônes des catégories
const categoryDetails = {
  shoes: { name: "Running shoes", icon: Footprints, findLabel: "Find my shoes" },
  trail_packs: { name: "Trail packs", icon: Backpack, findLabel: "Find my trail pack" },
  gps_watches: { name: "GPS watches", icon: Watch, findLabel: "Find my GPS watch" },
  trail_poles: { name: "Trail poles", icon: MountainSnow, findLabel: "Find my trail poles" },
};

const router = useRouter();
const equipment = ref([]);
const loading = ref(true);
const loadError = ref("");

// Retour à la connexion après déconnexion
watch(isAuthenticated, (authenticated) => {
  if (!authenticated) {
    router.replace("/login");
  }
});

// Appelle l'API avec le token
async function equipmentRequest(path, method, body) {
  const response = await fetch("http://localhost:3000/api/equipment" + path, {
    method,
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
      "Content-Type": "application/json",
    },
    body,
  });

  // Session expirée
  if (response.status === 401) {
    logoutUser();
    return null;
  }

  if (!response.ok) {
    throw new Error("Equipment request failed.");
  }
  return response.json();
}

// Charge les choix enregistrés
async function loadEquipment() {
  loading.value = true;
  loadError.value = "";

  try {
    const data = await equipmentRequest("/categories", "GET");
    if (data) {
      // État local de chaque tuile
      for (const item of data) {
        item.saving = false;
        item.error = "";
      }

      equipment.value = data;
    }
  } catch {
    loadError.value = "Unable to load your equipment.";
  } finally {
    loading.value = false;
  }
}

// Enregistre le choix d'une tuile
async function saveStatus(item, hasEquipment) {
  // Évite les envois en double
  if (item.saving || item.has_equipment === hasEquipment) {
    return;
  }

  item.saving = true;
  item.error = "";

  try {
    const path = "/categories/" + item.category + "/status";
    const body = JSON.stringify({ has_equipment: hasEquipment });
    const saved = await equipmentRequest(path, "PUT", body);

    // Sauvegarde confirmée
    if (saved) {
      item.has_equipment = saved.has_equipment;
    }
  } catch {
    item.error = "Couldn't save. Try again.";
  } finally {
    item.saving = false;
  }
}

// Chargement à l'ouverture
onMounted(loadEquipment);
</script>

<template>
  <div class="equipment-page">
    <h1>Equipment</h1>

    <p v-if="loading" role="status">Loading…</p>
    <div v-else-if="loadError">
      <p role="alert">{{ loadError }}</p>
      <button type="button" class="button button-outline" @click="loadEquipment">
        Retry
      </button>
    </div>

    <div v-else class="equipment-grid">
      <EquipmentCard
        v-for="item in equipment"
        :key="item.category"
        :item="item"
        :details="categoryDetails[item.category]"
        @choose="saveStatus(item, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.equipment-page {
  width: min(960px, calc(100% - 48px));
  margin: clamp(24px, 5vw, 54px) auto;
}

h1 {
  margin: 0 0 24px;
  font-size: clamp(30px, 4vw, 42px);
  letter-spacing: -0.04em;
}

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 740px) {
  .equipment-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .equipment-page {
    width: auto;
    margin-inline: 88px 16px;
  }
}
</style>
