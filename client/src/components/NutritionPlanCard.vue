<script setup>
defineProps({
  plan: { type: Object, required: true },
});
// Let the page handle opening and deleting the plan.
defineEmits(["open", "delete"]);

// Show when the plan was saved.
function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB");
}
</script>

<template>
  <article class="nutrition-card">
    <span class="nutrition-tag">Race nutrition</span>
    <h2>{{ plan.name }}</h2>
    <p>{{ plan.distance_km }} km · {{ plan.estimated_duration }} min</p>
    <p class="nutrition-muted">Saved on {{ formatDate(plan.created_at) }}</p>
    <p v-if="plan.hydration_warning" class="nutrition-warning">Flask capacity needs review</p>
    <div class="nutrition-card-actions">
      <button class="button button-outline" @click="$emit('open', plan.id_nutplan)">View Plan</button>
      <button class="button nutrition-delete" @click="$emit('delete', plan.id_nutplan)">Delete</button>
    </div>
  </article>
</template>
