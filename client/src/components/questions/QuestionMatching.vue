<script setup>
const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Each row contains one correct pair
function updatePair(index, field, value) {
  const pairs = props.modelValue.map((pair) => ({ ...pair }));
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
        type="text"
        :value="pair.left"
        :aria-label="'Paire ' + (index + 1) + ', élément de gauche'"
        placeholder="Ex : Un kilomètre"
        required
        @input="updatePair(index, 'left', $event.target.value)"
      />

      <span>↔</span>

      <input
        type="text"
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
        ✕
      </button>
    </div>

    <button type="button" class="btn-add" @click="addPair">
      + Ajouter une paire
    </button>
  </div>
</template>