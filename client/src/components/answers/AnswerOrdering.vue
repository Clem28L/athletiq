<script setup>
import { computed } from "vue";

// Receive the question and the selected order from the parent.
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

// Show the athlete's order, or the starting order if there is no answer yet.
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

// Find the text belonging to an item ID.
function getText(id) {
  for (let i = 0; i < props.question.options.length; i++) {
    if (props.question.options[i].id === id) {
      return props.question.options[i].text;
    }
  }

  return "";
}

// Move an item up with -1 or down with 1.
function moveItem(index, direction) {
  const ids = [];

  // Copy the displayed order before changing it.
  for (let i = 0; i < displayedIds.value.length; i++) {
    ids.push(displayedIds.value[i]);
  }

  const nextIndex = index + direction;

  // Do not move an item outside the list.
  if (nextIndex < 0 || nextIndex >= ids.length) {
    return;
  }

  // Swap the item with the item above or below it.
  const saved = ids[index];
  ids[index] = ids[nextIndex];
  ids[nextIndex] = saved;

  emit("update:modelValue", ids);
}

// Use the displayed order without moving an item.
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

    <!-- The starting order is not an answer until the athlete confirms it. -->
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