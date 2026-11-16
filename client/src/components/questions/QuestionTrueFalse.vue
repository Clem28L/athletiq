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
    <label for="correct-boolean">Correct answer</label>

    <select
      id="correct-boolean"
      :value="modelValue"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option value="true">True</option>
      <option value="false">False</option>
    </select>
  </div>
</template>