<script setup>
import { X } from "@lucide/vue";
const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Copy the list and the item before changing its field.
function updateItem(index, field, value) {
  const items = [...props.modelValue];
  items[index] = { ...items[index] };
  items[index][field] = value;

  emit("update:modelValue", items);
}

function addItem() {
  emit("update:modelValue", [
    ...props.modelValue,
    { text: "", category: "" },
  ]);
}

function removeItem(index) {
  const items = [...props.modelValue];
  items.splice(index, 1);

  emit("update:modelValue", items);
}
</script>

<template>
  <div class="form-group">
    <label>Éléments et catégories correctes</label>

    <p class="field-help">
      Plusieurs éléments peuvent avoir la même catégorie.
      Utilise exactement le même nom.
    </p>

    <div
      v-for="(item, index) in modelValue"
      :key="index"
      class="answer-row"
    >
      <input
        :value="item.text"
        :aria-label="'Élément ' + (index + 1)"
        placeholder="Ex : Football"
        required
        @input="updateItem(index, 'text', $event.target.value)"
      />

      <input
        :value="item.category"
        :aria-label="'Catégorie de l’élément ' + (index + 1)"
        placeholder="Ex : Sport collectif"
        maxlength="100"
        required
        @input="updateItem(index, 'category', $event.target.value)"
      />

      <button
        v-if="modelValue.length > 2"
        type="button"
        class="btn-remove"
        aria-label="Supprimer cet élément"
        @click="removeItem(index)"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>

    <button type="button" class="btn-add" @click="addItem">
      + Ajouter un élément
    </button>
  </div>
</template>
