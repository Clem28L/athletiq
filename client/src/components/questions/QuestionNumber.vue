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

// Keep an empty field empty, or change its text into a number.
function updateNumber(field, value) {
  let number = "";

  if (value !== "") {
    number = Number(value);
  }

  updateField(field, number);
}
</script>

<template>
  <div class="form-group">
    <label for="correct-number">Correct answer</label>
    <input
      id="correct-number"
      type="number"
      step="0.001"
      :value="modelValue.correct_number"
      required
      @input="updateNumber('correct_number', $event.target.value)"
    />

    <label for="number-tolerance">Allowed tolerance</label>
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
      Use 0 to require an exact answer.
      For an answer of 10, a tolerance of 1 accepts 9 to 11.
    </p>

    <label for="number-unit">Unit (optional)</label>
    <input
      id="number-unit"
      maxlength="30"
      placeholder="e.g. minutes, km, g"
      :value="modelValue.unit"
      @input="updateField('unit', $event.target.value)"
    />
  </div>
</template>
