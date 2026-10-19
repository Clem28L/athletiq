<script setup>
const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Copy the options before changing them
function updateOption(index, field, value) {
  const options = props.modelValue.map((option) => ({ ...option }));

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
    <label>Options de réponse</label>

    <p class="field-help">
      Coche une bonne réponse pour un choix unique,
      ou plusieurs pour un choix multiple.
    </p>

    <div
      v-for="(option, index) in modelValue"
      :key="index"
      class="answer-row"
    >
      <input
        type="checkbox"
        :checked="option.is_correct"
        :aria-label="'Option ' + (index + 1) + ' correcte'"
        @change="updateOption(index, 'is_correct', $event.target.checked)"
      />

      <input
        type="text"
        :value="option.text"
        :aria-label="'Option ' + (index + 1)"
        placeholder="Texte de l’option"
        required
        @input="updateOption(index, 'text', $event.target.value)"
      />

      <button
        v-if="modelValue.length > 2"
        type="button"
        class="btn-remove"
        aria-label="Supprimer cette option"
        @click="removeOption(index)"
      >
        ✕
      </button>
    </div>

    <button type="button" class="btn-add" @click="addOption">
      + Ajouter une option
    </button>
  </div>
</template>