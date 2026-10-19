<script setup>
const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

function updateItem(index, value) {
  const items = [...props.modelValue];
  items[index] = value;

  emit("update:modelValue", items);
}

function addItem() {
  emit("update:modelValue", [...props.modelValue, ""]);
}

function removeItem(index) {
  const items = [...props.modelValue];
  items.splice(index, 1);

  emit("update:modelValue", items);
}
</script>

<template>
  <div class="form-group">
    <label>Éléments dans le bon ordre</label>

    <p class="field-help">
      Saisis les éléments dans l’ordre attendu, du premier au dernier.
    </p>

    <div
      v-for="(item, index) in modelValue"
      :key="index"
      class="answer-row"
    >
      <span>{{ index + 1 }}.</span>

      <input
        type="text"
        :value="item"
        :aria-label="'Position ' + (index + 1)"
        placeholder="Texte de l’élément"
        required
        @input="updateItem(index, $event.target.value)"
      />

      <button
        v-if="modelValue.length > 2"
        type="button"
        class="btn-remove"
        aria-label="Supprimer cet élément"
        @click="removeItem(index)"
      >
        ✕
      </button>
    </div>

    <button type="button" class="btn-add" @click="addItem">
      + Ajouter un élément
    </button>
  </div>
</template>