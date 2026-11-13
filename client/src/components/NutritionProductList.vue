<script setup>
import { Droplets, Package, X } from "@lucide/vue";

defineProps({
  products: { type: Array, required: true },
  disabled: { type: Boolean, default: false },
  placement: { type: Boolean, default: false }
});
const emit = defineEmits(["place", "remove", "drag"]);
</script>

<template>
  <!-- Use the same products for setup and timeline editing. -->
  <div class="nutrition-product-list-grid">
    <div v-for="product in products" :key="product.id" class="nutrition-product-tile">
      <div
        class="nutrition-product-name"
        :draggable="placement && !disabled"
        @dragstart="emit('drag', $event, product.id)"
      >
        <Droplets v-if="product.kind === 'drink'" :size="24" aria-hidden="true" />
        <Package v-else :size="24" aria-hidden="true" />
        <div>
          <strong>{{ product.name }}</strong>
          <small>
            {{ product.carbs }}
            g carbs
            <template v-if="product.kind === 'drink'">/ 500 ml</template>
            <template v-else>/ portion</template>
          </small>
        </div>
      </div>
      <button
        v-if="placement"
        type="button"
        :disabled="disabled"
        @click="emit('place', product.id)"
      >
        Add to timeline
      </button>
      <button
        v-else
        type="button"
        class="nutrition-product-remove"
        :disabled="disabled"
        :aria-label="'Remove ' + product.name"
        @click="emit('remove', product.id)"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Let product cards fit the available space. */
.nutrition-product-list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}

.nutrition-product-tile {
  position: relative;
  border: 1px solid #d6d5d1;
  border-radius: 10px;
  padding: 16px;
  background: #fbfaf7;
  min-width: 0;
}

.nutrition-product-name {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 15px;
  min-height: 42px;
}

.nutrition-product-name[draggable="true"] {
  cursor: grab;
}

.nutrition-product-name svg {
  flex-shrink: 0;
  color: #55544f;
}

.nutrition-product-name strong {
  display: block;
  font-size: 15px;
  overflow-wrap: anywhere;
}

.nutrition-product-name small {
  display: block;
  margin-top: 5px;
  font-size: 12px;
}

.nutrition-product-tile > button {
  margin-top: 12px;
  border: 0;
  padding: 0;
  background: transparent;
  color: #55544f;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.nutrition-product-tile > .nutrition-product-remove {
  position: absolute;
  right: 10px;
  top: 10px;
  margin: 0;
  padding: 4px;
}

</style>
