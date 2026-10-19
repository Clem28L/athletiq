<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="form-group">
    <label for="correct-boolean">Bonne réponse</label>

    <select
      id="correct-boolean"
      :value="modelValue"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option value="true">Vrai</option>
      <option value="false">Faux</option>
    </select>
  </div>
</template>