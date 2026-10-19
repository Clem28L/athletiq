<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Send the updated fields to the parent
function updateField(field, value) {
  const data = { ...props.modelValue };
  data[field] = value;

  emit("update:modelValue", data);
}

// Keep empty inputs empty
function updateNumber(field, value) {
  updateField(field, value === "" ? "" : Number(value));
}
</script>

<template>
  <div class="form-group">
    <label for="correct-number">Réponse attendue</label>
    <input
      id="correct-number"
      type="number"
      step="0.001"
      :value="modelValue.correct_number"
      required
      @input="updateNumber('correct_number', $event.target.value)"
    />

    <label for="number-tolerance">Tolérance acceptée</label>
    <input
      id="number-tolerance"
      type="number"
      min="0"
      step="0.001"
      :value="modelValue.tolerance"
      required
      @input="updateNumber('tolerance', $event.target.value)"
    />

    <p class="field-help">
      Mets 0 pour une réponse exacte.
      Ex : 10 avec une tolérance de 1 accepte les valeurs de 9 à 11.
    </p>

    <label for="number-unit">Unité (facultatif)</label>
    <input
      id="number-unit"
      type="text"
      maxlength="30"
      placeholder="Ex : minutes, km, g"
      :value="modelValue.unit"
      @input="updateField('unit', $event.target.value)"
    />
  </div>
</template>