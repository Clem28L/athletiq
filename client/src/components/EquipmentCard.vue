<script setup>
// Données reçues depuis la page
defineProps({
  item: {
    type: Object,
    required: true,
  },
  details: {
    type: Object,
    required: true,
  },
});

// Envoie le choix ou la demande de questionnaire
defineEmits(["choose", "find"]);
</script>

<template>
  <div class="equipment-card" :data-category="item.category">
    <div class="equipment-art">
      <component :is="details.icon" :size="44" :stroke-width="1.5" aria-hidden="true" />
    </div>

    <div class="equipment-body">
      <h2>{{ details.name }}</h2>

      <!-- La page se charge de la sauvegarde -->
      <div class="equipment-choices" role="group" aria-label="Ownership">
        <button
          type="button"
          class="button button-outline equipment-owned"
          :aria-pressed="item.has_equipment === true"
          :aria-disabled="item.saving"
          @click="$emit('choose', true)"
        >
          I have it
        </button>
        <button
          type="button"
          class="button button-outline equipment-missing"
          :aria-pressed="item.has_equipment === false"
          :aria-disabled="item.saving"
          @click="$emit('find')"
        >
          <span v-if="item.latest_submission_id && item.has_equipment === false">Retake questionnaire</span>
          <span v-else>{{ details.findLabel }}</span>
        </button>
      </div>

      <RouterLink
        v-if="item.latest_submission_id"
        class="button button-outline equipment-selection"
        :to="{ name: 'equipment-recommendations', params: { id: item.latest_submission_id } }"
      >
        View my selection
      </RouterLink>

      <p v-if="item.error" class="equipment-error" role="alert">{{ item.error }}</p>
    </div>
  </div>
</template>

<style scoped>
.equipment-card {
  --art: #eef0e6;
  --ink: #4b5638;
  overflow: hidden;
  border: 1px solid #dddbd4;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 12px rgb(40 36 24 / 5%);
}

/* Couleurs par catégorie */
[data-category="trail_packs"] {
  --art: #f3ece2;
  --ink: #734f31;
}

[data-category="gps_watches"] {
  --art: #e9eef4;
  --ink: #385473;
}

[data-category="trail_poles"] {
  --art: #f0ebf2;
  --ink: #654969;
}

.equipment-art {
  display: grid;
  min-height: 100px;
  place-items: center;
  color: var(--ink);
  background: radial-gradient(circle at center, rgb(255 255 255 / 50%) 37px, transparent 38px), var(--art);
}

.equipment-body {
  padding: 16px;
}

h2 {
  margin: 0 0 14px;
  font-size: 19px;
}

.equipment-choices {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: 8px;
}

.equipment-choices .button {
  padding: 8px 4px;
  border-color: #dad8cf;
  border-radius: 8px;
  font-size: 13px;
}

.equipment-choices .button[aria-disabled="true"] {
  cursor: default;
}

.equipment-selection {
  width: 100%;
  margin-top: 10px;
}

/* Couleur du choix enregistré */
.equipment-owned[aria-pressed="true"] {
  border-color: #72966e;
  background: #e8f2e4;
  color: #30562e;
}

.equipment-missing[aria-pressed="true"] {
  border-color: #b79568;
  background: #faf0e0;
  color: #6f4b25;
}

.equipment-error {
  margin: 10px 0 0;
  color: #9b2e28;
  font-size: 13px;
}
</style>
