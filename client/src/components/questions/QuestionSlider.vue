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

// Keep an empty field empty, or change its text into a number.
function updateNumber(field, value) {
  let number = "";

  if (value !== "") {
    number = Number(value);
  }

  updateField(field, number);
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

    <label for="slider-step">Slider step</label>
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
      A step of 5 lets you select values like 0, 5, 10 and 15.
    </p>

    <label for="slider-answer">Correct answer</label>
    <input
      id="slider-answer"
      type="number"
      step="0.001"
      :value="modelValue.correct_number"
      required
      @input="updateNumber('correct_number', $event.target.value)"
    />

    <label for="slider-tolerance">Allowed tolerance</label>
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
      Use 0 to require an exact answer.
    </p>

    <label for="slider-unit">Unit (optional)</label>
    <input
      id="slider-unit"
      maxlength="30"
      placeholder="e.g. minutes"
      :value="modelValue.unit"
      @input="updateField('unit', $event.target.value)"
    />

    <template v-if="validSlider">
      <label for="slider-preview">
        Preview: {{ modelValue.correct_number }} {{ modelValue.unit }}
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
        From {{ modelValue.min_value }} to {{ modelValue.max_value }}
        {{ modelValue.unit }}.
        Move the slider to set the correct answer.
      </p>
    </template>

    <p v-else class="field-help">
      The maximum must exceed the minimum, and the step must be greater than zero.
    </p>
  </div>
</template>
