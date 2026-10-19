<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

function updateField(field, value) {
  const data = { ...props.modelValue };
  data[field] = value;

  emit("update:modelValue", data);
}

function updateNumber(field, value) {
  updateField(field, value === "" ? "" : Number(value));
}

// Show the preview only with valid limits
const validSlider = computed(() => {
  const data = props.modelValue;

  return (
    Number.isFinite(data.min_value) &&
    Number.isFinite(data.max_value) &&
    Number.isFinite(data.step_value) &&
    data.min_value < data.max_value &&
    data.step_value > 0
  );
});
</script>

<template>
  <div class="form-group">
    <div class="form-row">
      <div class="form-group">
        <label for="slider-min">Minimum</label>
        <input
          id="slider-min"
          type="number"
          step="0.001"
          :value="modelValue.min_value"
          required
          @input="updateNumber('min_value', $event.target.value)"
        />
      </div>

      <div class="form-group">
        <label for="slider-max">Maximum</label>
        <input
          id="slider-max"
          type="number"
          step="0.001"
          :value="modelValue.max_value"
          required
          @input="updateNumber('max_value', $event.target.value)"
        />
      </div>
    </div>

    <label for="slider-step">Pas du curseur</label>
    <input
      id="slider-step"
      type="number"
      min="0.001"
      step="0.001"
      :value="modelValue.step_value"
      required
      @input="updateNumber('step_value', $event.target.value)"
    />

    <p class="field-help">
      Ex : un pas de 5 permet de choisir 0, 5, 10, 15...
    </p>

    <label for="slider-answer">Réponse attendue</label>
    <input
      id="slider-answer"
      type="number"
      step="0.001"
      :value="modelValue.correct_number"
      required
      @input="updateNumber('correct_number', $event.target.value)"
    />

    <label for="slider-tolerance">Tolérance acceptée</label>
    <input
      id="slider-tolerance"
      type="number"
      min="0"
      step="0.001"
      :value="modelValue.tolerance"
      required
      @input="updateNumber('tolerance', $event.target.value)"
    />

    <p class="field-help">
      Mets 0 pour une réponse exacte.
    </p>

    <label for="slider-unit">Unité (facultatif)</label>
    <input
      id="slider-unit"
      type="text"
      maxlength="30"
      placeholder="Ex : minutes"
      :value="modelValue.unit"
      @input="updateField('unit', $event.target.value)"
    />

    <template v-if="validSlider">
      <label for="slider-preview">
        Aperçu : {{ modelValue.correct_number }} {{ modelValue.unit }}
      </label>

      <input
        id="slider-preview"
        type="range"
        :min="modelValue.min_value"
        :max="modelValue.max_value"
        :step="modelValue.step_value"
        :value="modelValue.correct_number"
        @input="updateNumber('correct_number', $event.target.value)"
      />

      <p class="field-help">
        De {{ modelValue.min_value }} à {{ modelValue.max_value }}
        {{ modelValue.unit }}.
        Déplace le curseur pour choisir la réponse attendue.
      </p>
    </template>

    <p v-else class="field-help">
      Le maximum doit dépasser le minimum et le pas doit être positif.
    </p>
  </div>
</template>