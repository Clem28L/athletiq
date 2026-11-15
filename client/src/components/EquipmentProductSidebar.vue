<script setup>
import { onMounted, ref } from "vue";
import { equipmentRequest } from "@/utils/equipmentApi";

const props = defineProps({
  product: { type: Object, required: true },
});

const emit = defineEmits(["close"]);
const sidebar = ref(null);
const details = ref(null);
const loading = ref(true);

// Affiche le panneau et charge la fiche
onMounted(async () => {
  sidebar.value.showModal();

  try {
    details.value = await equipmentRequest("/products/" + props.product.id_equipment, "GET");
  } catch {
    details.value = null;
  } finally {
    loading.value = false;
  }
});

// Ferme le panneau quand on clique sur le fond
function closeFromBackdrop(event) {
  if (event.target === sidebar.value) {
    sidebar.value.close();
  }
}

// Garde le nom des champs lisible
function specLabel(name) {
  if (name === "drop_mm") {
    return "Drop";
  }

  return name.replaceAll("_", " ").replace("gps ", "GPS ");
}

// Affiche les listes et le drop en millimètres
function specValue(name, value) {
  if (name === "drop_mm") {
    return value + " mm";
  }
  if (value === "true") {
    return "Yes";
  }
  if (value === "false") {
    return "No";
  }

  const text = String(value).replaceAll("_", " ");
  if (text.startsWith("[") && text.endsWith("]")) {
    return text.slice(1, -1).replaceAll('"', "").replaceAll(/,\s*/g, ", ");
  }
  return text;
}
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="sidebar"
      class="product-sidebar"
      :data-category="product.category"
      aria-labelledby="equipment-product-name"
      @click="closeFromBackdrop"
      @close="emit('close')"
    >
      <div class="product-panel">
        <header class="product-header">
          <div>
            <p v-if="product.brand" class="product-brand">{{ product.brand }}</p>
            <h2 id="equipment-product-name">{{ product.name }}</h2>
          </div>
          <form method="dialog">
            <button type="submit" class="button button-outline" autofocus>Close</button>
          </form>
        </header>

        <div v-if="product.image_url" class="product-photo">
          <img
            :src="product.image_url"
            :alt="product.name"
            referrerpolicy="no-referrer"
            @error="$event.target.parentElement.hidden = true"
          />
        </div>

        <div class="product-content">
          <p v-if="loading" role="status">Loading…</p>
          <p v-else-if="!details" role="alert">Couldn't load product details.</p>

          <template v-else>
            <section v-if="details.offers.length" class="product-section">
              <h3>Retailers</h3>
              <ul class="product-offers">
                <li v-for="offer in details.offers" :key="offer.url">
                  <a :href="offer.url" target="_blank" rel="noopener noreferrer">
                    <span class="offer-retailer">{{ offer.retailer }}</span>
                    <strong>
                      {{ offer.price }} MYR
                      <small v-if="offer.sold_per_pole">/ pole</small>
                    </strong>
                  </a>
                </li>
              </ul>
            </section>

            <section v-if="details.model_reference || Object.keys(details.attributes).length" class="product-section">
              <h3>Specifications</h3>
              <dl class="product-specs">
                <div v-for="(value, name) in details.attributes" :key="name">
                  <dt>{{ specLabel(name) }}</dt>
                  <dd>{{ specValue(name, value) }}</dd>
                </div>
                <div v-if="details.model_reference">
                  <dt>Model reference</dt>
                  <dd>{{ details.model_reference }}</dd>
                </div>
              </dl>
            </section>
          </template>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.product-sidebar {
  --photo-background: #eef0e6;
  position: fixed;
  inset: 0 0 auto auto;
  width: min(100%, 550px);
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: #fff;
  color: #33322f;
  overflow-y: auto;
  overscroll-behavior: contain;
  box-shadow: -10px 0 40px rgb(36 34 24 / 15%);
}

.product-sidebar::backdrop {
  background: rgb(33 31 24 / 38%);
}

.product-sidebar[open] {
  animation: sidebar-in 180ms ease-out;
}

.product-sidebar[data-category="trail_packs"] { --photo-background: #f3ece2; }
.product-sidebar[data-category="gps_watches"] { --photo-background: #e9eef4; }
.product-sidebar[data-category="trail_poles"] { --photo-background: #f0ebf2; }

.product-panel {
  min-height: 100%;
}

.product-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border-bottom: 1px solid #e9e7df;
}

.product-header h2 {
  margin: 0;
  font-size: clamp(22px, 4vw, 28px);
  overflow-wrap: anywhere;
}

.product-brand {
  margin: 0 0 4px;
  color: #676458;
  font-size: 13px;
}

.product-photo {
  isolation: isolate;
  background: var(--photo-background);
}

.product-photo img {
  display: block;
  width: 100%;
  height: clamp(200px, 42vh, 340px);
  padding: 12px;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.product-content {
  padding: 20px 24px 28px;
}

.product-section {
  margin-bottom: 24px;
}

.product-section:last-child {
  margin-bottom: 0;
}

.product-section h3 {
  margin: 0 0 10px;
  font-size: 18px;
}

.product-offers,
.product-specs {
  margin: 0;
  padding: 0;
  list-style: none;
}

.product-offers a,
.product-specs div {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid #e9e7df;
  overflow-wrap: anywhere;
}

.product-offers a {
  text-decoration: none;
}

.offer-retailer {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.product-offers small {
  color: #676458;
  font-weight: normal;
}

.product-specs div {
  grid-template-columns: 1fr 1fr;
}

.product-specs dt {
  color: #676458;
  font-size: 13px;
}

.product-specs dt::first-letter {
  text-transform: uppercase;
}

.product-specs dd {
  margin: 0;
  font-size: 14px;
}

@keyframes sidebar-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@media (max-width: 560px) {
  .product-header,
  .product-content {
    padding-inline: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .product-sidebar[open] {
    animation: none;
  }
}
</style>
