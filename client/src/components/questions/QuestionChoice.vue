<script setup>
import { X } from "@lucide/vue";
const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Copy the list and the option before changing its field.
function updateOption(index, field, value) {
  const options = [...props.modelValue];
  options[index] = { ...options[index] };
  options[index][field] = value;

  emit("update:modelValue", options);
}

function addOption() {
  emit("update:modelValue", [
    ...props.modelValue,
    { text: "", is_correct: false },
  ]);
}

function removeOption(index) {
  const options = [...props.modelValue];
  options.splice(index, 1);

  emit("update:modelValue", options);
}
</script>

<template>
  <div class="form-group">
    <label>Answer options</label>

    <p class="field-help">
      Mark one correct answer for single choice,
      or more than one for multiple choice.
    </p>

    <div
      v-for="(option, index) in modelValue"
      :key="index"
      class="answer-row"
    >
      <input
        type="checkbox"
        :checked="option.is_correct"
        :aria-label="'Option ' + (index + 1) + ' is correct'"
        @change="updateOption(index, 'is_correct', $event.target.checked)"
      />

      <input
        :value="option.text"
        :aria-label="'Option ' + (index + 1)"
        placeholder="Option text"
        required
        @input="updateOption(index, 'text', $event.target.value)"
      />

      <button
        v-if="modelValue.length > 2"
        type="button"
        class="btn-remove"
        aria-label="Remove option"
        @click="removeOption(index)"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>

    <button type="button" class="btn-add" @click="addOption">
      + Add option
    </button>
  </div>
</template>
