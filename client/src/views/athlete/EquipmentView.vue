<script setup>
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import EquipmentCard from "@/components/EquipmentCard.vue";
import { isAuthenticated } from "@/stores/auth";
import { equipmentRequest } from "@/utils/equipmentApi";
import { categoryDetails } from "@/utils/equipmentCategories";

const router = useRouter();
const equipment = ref([]);
const loading = ref(true);

// Retour à la connexion après déconnexion
watch(isAuthenticated, (authenticated) => {
  if (!authenticated) {
    router.replace("/login");
  }
});

// Charge les choix enregistrés
async function loadEquipment() {
  loading.value = true;

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
    router.replace("/");
  } finally {
    loading.value = false;
  }
}

// Enregistre le choix d'une tuile
async function saveStatus(item, hasEquipment) {
  if (item.saving) {
    return false;
  }

  // Le choix est déjà enregistré
  if (item.has_equipment === hasEquipment) {
    return true;
  }

  item.saving = true;
  item.error = "";

  try {
    const path = "/categories/" + item.category + "/status";
    const body = JSON.stringify({ has_equipment: hasEquipment });
    const saved = await equipmentRequest(path, "PUT", body);

    if (!saved) {
      return false;
    }

    item.has_equipment = saved.has_equipment;
    return true;
  } catch {
    item.error = "Couldn't save. Try again.";
    return false;
  } finally {
    item.saving = false;
  }
}

// Ouvre le questionnaire après avoir enregistré le choix
async function openQuestionnaire(item) {
  const saved = await saveStatus(item, false);
  if (saved && isAuthenticated.value) {
    router.push({
      name: "equipment-questionnaire",
      params: { category: item.category },
    });
  }
}

// Chargement à l'ouverture
onMounted(loadEquipment);
</script>

<template>
  <div class="equipment-page">
    <h1>Equipment</h1>

    <p v-if="loading" role="status">Loading…</p>
    <div v-else class="equipment-grid">
      <EquipmentCard
        v-for="item in equipment"
        :key="item.category"
        :item="item"
        :details="categoryDetails[item.category]"
        @choose="saveStatus(item, $event)"
        @find="openQuestionnaire(item)"
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
