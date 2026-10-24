<script setup>
import { computed } from "vue";

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
  modelValue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Display shuffled items before the first answer
const displayedIds = computed(function () {
  if (props.modelValue.length > 0) {
    return props.modelValue;
  }

  const ids = [];

  for (let i = 0; i < props.question.options.length; i++) {
    ids.push(props.question.options[i].id);
  }

  return ids;
});

// Find the text of an item
function getText(id) {
  for (let i = 0; i < props.question.options.length; i++) {
    if (props.question.options[i].id === id) {
      return props.question.options[i].text;
    }
  }

  return "";
}

// Copy the order and move one item
function moveItem(index, direction) {
  const ids = [];

  for (let i = 0; i < displayedIds.value.length; i++) {
    ids.push(displayedIds.value[i]);
  }

  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= ids.length) {
    return;
  }

  const saved = ids[index];
  ids[index] = ids[nextIndex];
  ids[nextIndex] = saved;

  emit("update:modelValue", ids);
}

// Confirm the order without moving an item
function confirmOrder() {
  const ids = [];

  for (let i = 0; i < displayedIds.value.length; i++) {
    ids.push(displayedIds.value[i]);
  }

  emit("update:modelValue", ids);
}
</script>

<template>
  <div class="answer-fields">
    <p class="answer-help">
      Move the items into the correct order.
    </p>

    <div
      v-for="(id, index) in displayedIds"
      :key="id"
      class="answer-row"
    >
      <span>{{ index + 1 }}. {{ getText(id) }}</span>

      <div class="answer-move-buttons">
        <button
          type="button"
          class="refresh-button"
          :disabled="index === 0"
          :aria-label="'Move up: ' + getText(id)"
          @click="moveItem(index, -1)"
        >
          ↑
        </button>

        <button
          type="button"
          class="refresh-button"
          :disabled="index === displayedIds.length - 1"
          :aria-label="'Move down: ' + getText(id)"
          @click="moveItem(index, 1)"
        >
          ↓
        </button>
      </div>
    </div>

    <button
      v-if="modelValue.length === 0"
      type="button"
      class="refresh-button"
      @click="confirmOrder"
    >
      Use this order
    </button>
  </div>
</template>