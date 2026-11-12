<script setup>
import { ArrowLeftRight, X } from "@lucide/vue";
const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Copy the list and the pair before changing its field.
function updatePair(index, field, value) {
  const pairs = [...props.modelValue];
  pairs[index] = { ...pairs[index] };
  pairs[index][field] = value;

  emit("update:modelValue", pairs);
}

function addPair() {
  emit("update:modelValue", [
    ...props.modelValue,
    { left: "", right: "" },
  ]);
}

function removePair(index) {
  const pairs = [...props.modelValue];
  pairs.splice(index, 1);

  emit("update:modelValue", pairs);
}
</script>

<template>
  <div class="form-group">
    <label>Paires correctes</label>

    <p class="field-help">
      Chaque ligne contient deux éléments à associer.
    </p>

    <div
      v-for="(pair, index) in modelValue"
      :key="index"
      class="answer-row"
    >
      <input
        :value="pair.left"
        :aria-label="'Paire ' + (index + 1) + ', élément de gauche'"
        placeholder="Ex : Un kilomètre"
        required
        @input="updatePair(index, 'left', $event.target.value)"
      />

      <ArrowLeftRight :size="16" aria-hidden="true" />

      <input
        :value="pair.right"
        :aria-label="'Paire ' + (index + 1) + ', élément de droite'"
        placeholder="Ex : 1000 mètres"
        required
        @input="updatePair(index, 'right', $event.target.value)"
      />

      <button
        v-if="modelValue.length > 2"
        type="button"
        class="btn-remove"
        aria-label="Supprimer cette paire"
        @click="removePair(index)"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>

    <button type="button" class="btn-add" @click="addPair">
      + Ajouter une paire
    </button>
  </div>
</template>
