<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { isAuthenticated } from "@/stores/auth";
import { equipmentRequest } from "@/utils/equipmentApi";
import { categoryDetails } from "@/utils/equipmentCategories";

const route = useRoute();
const router = useRouter();
const selection = ref(null);
const loading = ref(true);
const loadError = ref(false);
const failedImages = ref({});
let loadId = 0;

const category = computed(() => categoryDetails[selection.value?.category]);
const budget = computed(() => selection.value?.answers?.budget_max);

// Formate le prix du catalogue
function formatPrice(price, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

// Charge la sélection enregistrée
async function loadSelection(id) {
  const requestId = ++loadId;
  loading.value = true;
  loadError.value = false;
  selection.value = null;
  failedImages.value = {};

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
          <strong>{{ formatPrice(budget) }}</strong>
        </p>
      </header>

      <div v-if="selection.products.length === 0" class="selection-message">
        <h2>No matching products</h2>
        <p>Change your answers to see other options.</p>
        <RouterLink
          :to="{ name: 'equipment-questionnaire', params: { category: selection.category } }"
          class="button button-outline"
        >
          Retake questionnaire
        </RouterLink>
      </div>

      <ul v-else class="selection-grid" aria-label="Recommended products">
        <li v-for="product in selection.products" :key="product.id_equipment" class="selection-card">
          <div class="selection-image">
            <img
              v-if="product.image_url && !failedImages[product.id_equipment]"
              :src="product.image_url"
              alt=""
              loading="lazy"
              @error="failedImages[product.id_equipment] = true"
            />
            <span v-else-if="category" class="selection-symbol" aria-hidden="true">
              <component :is="category.icon" :size="40" :stroke-width="1.5" />
            </span>
          </div>

          <div class="selection-card-body">
            <p v-if="product.brand" class="selection-brand">{{ product.brand }}</p>
            <h2>{{ product.name }}</h2>
            <p v-if="product.price != null" class="selection-price">
              {{ formatPrice(product.price, product.currency || 'MYR') }}
            </p>

            <ul v-if="product.highlights.length" class="selection-highlights">
              <li v-for="highlight in product.highlights" :key="highlight">{{ highlight }}</li>
            </ul>
            <p v-else-if="product.description" class="selection-description">{{ product.description }}</p>
          </div>
        </li>
      </ul>
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
  color: #55544f;
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
  border: 1px solid #e3e1d8;
  border-radius: 16px;
  background: linear-gradient(120deg, #fbfaf7, var(--selection-art));
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
  color: #55544f;
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
  min-width: 0;
  overflow: hidden;
  border: 1px solid #dddbd4;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 12px rgb(40 36 24 / 5%);
}

.selection-image {
  display: grid;
  height: 132px;
  place-items: center;
  background: var(--selection-art);
}

.selection-image img {
  width: 100%;
  height: 132px;
  padding: 10px;
  object-fit: contain;
}

.selection-symbol {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 50%;
  background: rgb(255 255 255 / 55%);
  color: var(--selection-ink);
}

.selection-card-body {
  padding: 20px;
  overflow-wrap: anywhere;
}

.selection-brand {
  margin: 0 0 5px;
  color: #66645c;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.selection-card h2 {
  margin: 0;
  font-size: 21px;
  line-height: 1.25;
}

.selection-price {
  margin: 10px 0 0;
  color: var(--selection-ink);
  font-size: 18px;
  font-weight: 700;
}

.selection-highlights,
.selection-description {
  margin: 16px 0 0;
  color: #55544f;
  font-size: 14px;
  line-height: 1.5;
}

.selection-highlights {
  display: grid;
  gap: 4px;
  padding-left: 19px;
}

.selection-highlights li::marker {
  color: var(--selection-ink);
}

.selection-message {
  margin: 0;
  padding: clamp(18px, 4vw, 32px);
  border: 1px solid #e3e1d8;
  border-radius: 16px;
  background: #fbfaf7;
}

.selection-message h2 {
  margin: 0;
  font-size: 20px;
}

.selection-message p {
  margin: 8px 0 16px;
  line-height: 1.5;
}

@media (max-width: 560px) {
  .selection-page {
    width: auto;
    margin-inline: 88px 16px;
  }
}
</style>
