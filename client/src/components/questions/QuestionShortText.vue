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
    <label for="accepted-texts">Réponses acceptées</label>

    <textarea
      id="accepted-texts"
      rows="4"
      :value="modelValue"
      placeholder="Une réponse acceptée par ligne"
      required
      @input="emit('update:modelValue', $event.target.value)"
    ></textarea>

    <p class="field-help">
      Écris chaque formulation acceptée sur une nouvelle ligne.
    </p>
  </div>
</template>