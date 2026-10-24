<script setup>
const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Return the category selected for an item
function getSelection(id) {
  if (props.modelValue[id]) {
    return props.modelValue[id];
  }

  return "";
}

// Copy the answers before changing a category
function updateCategory(id, value) {
  const answer = {};

  for (const key in props.modelValue) {
    answer[key] = props.modelValue[key];
  }

  answer[id] = value;

  emit("update:modelValue", answer);
}
</script>

<template>
  <div class="answer-fields">
    <p class="answer-help">
      Choose a category for every item.
    </p>

    <div
      v-for="option in question.options"
      :key="option.id"
      class="answer-fields"
    >
      <label :for="'category-' + option.id">
        {{ option.text }}
      </label>

      <select
        :id="'category-' + option.id"
        :value="getSelection(option.id)"
        @change="updateCategory(option.id, $event.target.value)"
      >
        <option value="">Choose a category</option>

        <option
          v-for="category in question.categories"
          :key="category"
          :value="category"
        >
          {{ category }}
        </option>
      </select>
    </div>
  </div>
</template>