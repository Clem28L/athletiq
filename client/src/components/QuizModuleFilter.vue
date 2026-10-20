<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Send the selected module to the parent
function changeModule(event) {
  emit("update:modelValue", event.target.value);
}
</script>

<template>
  <div class="quiz-module-filter">
    <label :for="id">Module</label>

    <select
      :id="id"
      :value="modelValue"
      @change="changeModule"
    >
      <option value="all">All modules</option>
      <option value="prevention">Prevention</option>
      <option value="nutrition">Nutrition</option>
      <option value="equipment">Equipment</option>
    </select>
  </div>
</template>

<style scoped>
.quiz-module-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quiz-module-filter label {
  font-size: 14px;
  font-weight: bold;
}

.quiz-module-filter select {
  min-width: 210px;
  padding: 11px 14px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: white;
  color: #33322f;
  font: inherit;
  font-size: 14px;
}

.quiz-module-filter select:focus {
  outline: 2px solid #55544f;
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .quiz-module-filter {
    width: 100%;
  }

  .quiz-module-filter select {
    width: 100%;
    min-width: 0;
  }
}
</style>