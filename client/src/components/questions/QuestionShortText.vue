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
    <label for="accepted-texts">Accepted answers</label>

    <textarea
      id="accepted-texts"
      rows="4"
      :value="modelValue"
      placeholder="One answer per line"
      required
      @input="emit('update:modelValue', $event.target.value)"
    ></textarea>

    <p class="field-help">
      Enter each accepted answer on a new line.
    </p>
  </div>
</template>