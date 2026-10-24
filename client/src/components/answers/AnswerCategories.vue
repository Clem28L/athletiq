<script setup>
// Receive the question and the current answers from the parent.
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

// Return the selected category, or an empty value if nothing is selected.
function getSelection(id) {
  if (props.modelValue[id]) {
    return props.modelValue[id];
  }

  return "";
}

// Update the category selected for one item.
function updateCategory(id, value) {
  const answer = {};

  // Copy the other answers before changing this item.
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

    <!-- Show a category list for each item. -->
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