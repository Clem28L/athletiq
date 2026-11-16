<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import EquipmentProductSidebar from "@/components/EquipmentProductSidebar.vue";
import { isAuthenticated } from "@/stores/auth";
import { equipmentRequest } from "@/utils/equipmentApi";
import { categoryDetails } from "@/utils/equipmentCategories";

const route = useRoute();
const router = useRouter();
const selection = ref(null);
const loading = ref(true);
const loadError = ref(false);
const selectedProduct = ref(null);
let loadId = 0;

const category = computed(() => categoryDetails[selection.value?.category]);
const budget = computed(() => selection.value?.answers?.budget_max);

// Charge la sélection enregistrée
async function loadSelection(id) {
  const requestId = ++loadId;
  loading.value = true;
  loadError.value = false;
  selection.value = null;
  selectedProduct.value = null;

  try {
    const path = "/submissions/" + encodeURIComponent(id);
    const data = await equipmentRequest(path, "GET");
    if (requestId === loadId && data) {
      selection.value = data;
    }
  } catch {
    if (requestId === loadId) {
      loadError.value = true;
    }
  } finally {
    if (requestId === loadId) {
      loading.value = false;
    }
  }
}

watch(() => route.params.id, loadSelection, { immediate: true });

// Retour à la connexion si la session expire
watch(isAuthenticated, (authenticated) => {
  if (!authenticated) {
    router.replace("/login");
  }
});
</script>

<template>
  <div class="selection-page" :data-category="selection?.category">
    <RouterLink to="/equipment" class="selection-back">
      Back to equipment
    </RouterLink>

    <p v-if="loading" class="selection-message" role="status">Loading…</p>
    <p v-else-if="loadError" class="selection-message" role="alert">Couldn't open this selection.</p>

    <template v-else-if="selection">
      <header class="selection-header">
        <div>
          <h1>Your recommendations</h1>
          <p v-if="category">{{ category.name }}</p>
        </div>

        <p v-if="Number.isFinite(budget)" class="selection-budget">
          <span>Budget</span>
          <strong>{{ budget }} MYR</strong>
        </p>
      </header>

      <div v-if="selection.products.length === 0" class="selection-message">
        <h2>No matching products</h2>
        <RouterLink
          :to="{ name: 'equipment-questionnaire', params: { category: selection.category } }"
          class="button button-outline"
        >
          Retake questionnaire
        </RouterLink>
      </div>

      <ul v-else class="selection-grid" aria-label="Recommended products">
        <li v-for="product in selection.products" :key="product.id_equipment">
          <button
            type="button"
            class="selection-card"
            aria-haspopup="dialog"
            @click="selectedProduct = product"
          >
            <span v-if="product.image_url" class="selection-image">
              <img
                :src="product.image_url"
                alt=""
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="$event.target.parentElement.hidden = true"
              />
            </span>
            <span class="selection-card-body">
              <span v-if="product.brand" class="selection-brand">{{ product.brand }}</span>
              <strong class="selection-name">{{ product.name }}</strong>
              <span v-if="product.price != null" class="selection-price">
                {{ product.price }} MYR
              </span>
            </span>
          </button>
        </li>
      </ul>

      <EquipmentProductSidebar
        v-if="selectedProduct"
        :product="selectedProduct"
        @close="selectedProduct = null"
      />
    </template>
  </div>
</template>

<style scoped>
.selection-page {
  --selection-art: #eef0e6;
  --selection-ink: #4b5638;
  width: min(1120px, calc(100% - 48px));
  margin: clamp(24px, 5vw, 54px) auto;
}

.selection-page[data-category="trail_packs"] {
  --selection-art: #f3ece2;
  --selection-ink: #734f31;
}

.selection-page[data-category="gps_watches"] {
  --selection-art: #e9eef4;
  --selection-ink: #385473;
}

.selection-page[data-category="trail_poles"] {
  --selection-art: #f0ebf2;
  --selection-ink: #654969;
}

.selection-back {
  display: inline-block;
  margin-bottom: 20px;
  color: var(--muted);
  font-size: 14px;
  text-decoration: none;
}

.selection-back:hover {
  text-decoration: underline;
}

.selection-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding: clamp(18px, 4vw, 36px);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: linear-gradient(120deg, var(--surface), var(--selection-art));
}

.selection-header h1 {
  margin: 0 0 8px;
  font-size: clamp(27px, 4vw, 42px);
  line-height: 1.1;
  letter-spacing: -0.04em;
  overflow-wrap: anywhere;
}

.selection-header p {
  margin: 0;
  color: var(--muted);
}

.selection-budget {
  display: grid;
  gap: 4px;
  font-size: 13px;
}

.selection-budget strong {
  color: var(--selection-ink);
  font-size: 19px;
}

.selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 275px), 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.selection-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease;
}

@media (hover: hover) {
  .selection-card:hover {
    border-color: #aaa69a;
  }
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .selection-image img {
    transition: transform 160ms ease;
  }

  .selection-card:hover .selection-image img {
    transform: scale(1.035);
  }
}

.selection-card:focus-visible {
  outline: 2px solid var(--selection-ink);
  outline-offset: 3px;
}

.selection-image {
  width: 100%;
  overflow: hidden;
  isolation: isolate;
  background: var(--selection-art);
}

.selection-image img {
  display: block;
  width: 100%;
  height: 200px;
  padding: 10px;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.selection-card-body {
  display: block;
  padding: 20px;
  overflow-wrap: anywhere;
}

.selection-brand {
  display: block;
  margin: 0 0 5px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.selection-name {
  display: block;
  font-size: 21px;
  line-height: 1.25;
}

.selection-price {
  display: block;
  margin: 10px 0 0;
  color: var(--selection-ink);
  font-size: 18px;
  font-weight: 700;
}

.selection-message {
  margin: 0;
  padding: clamp(18px, 4vw, 32px);
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--page);
}

.selection-message h2 {
  margin: 0 0 16px;
  font-size: 20px;
}

@media (max-width: 660px) {
  .selection-page {
    width: calc(100% - 28px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .selection-card {
    transition: none;
  }
}
</style>
