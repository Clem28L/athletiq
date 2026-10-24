<script setup>
import { computed } from "vue";

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

// Keep only the items from the left side.
const leftOptions = computed(function () {
  const items = [];

  for (let i = 0; i < props.question.options.length; i++) {
    const option = props.question.options[i];

    if (option.pair_side === "left") {
      items.push(option);
    }
  }

  return items;
});

// Keep only the items from the right side.
const rightOptions = computed(function () {
  const items = [];

  for (let i = 0; i < props.question.options.length; i++) {
    const option = props.question.options[i];

    if (option.pair_side === "right") {
      items.push(option);
    }
  }

  return items;
});

// Return the selected match, or an empty value if nothing is selected.
function getSelection(id) {
  if (props.modelValue[id]) {
    return props.modelValue[id];
  }

  return "";
}

// Check if another left item already uses this right item.
function isUsed(rightId, leftId) {
  for (const key in props.modelValue) {
    if (key !== leftId && props.modelValue[key] === rightId) {
      return true;
    }
  }

  return false;
}

// Update the match selected for one left item.
function updatePair(id, value) {
  const answer = {};

  // Copy the other answers before changing this pair.
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
      Choose a different match for each item.
    </p>

    <div
      v-for="option in leftOptions"
      :key="option.id"
      class="answer-fields"
    >
      <label :for="'match-' + option.id">
        {{ option.text }}
      </label>

      <select
        :id="'match-' + option.id"
        :value="getSelection(option.id)"
        @change="updatePair(option.id, $event.target.value)"
      >
        <option value="">Choose a match</option>

        <!-- An item already used in another pair cannot be selected. -->
        <option
          v-for="right in rightOptions"
          :key="right.id"
          :value="right.id"
          :disabled="isUsed(right.id, option.id)"
        >
          {{ right.text }}
        </option>
      </select>
    </div>
  </div>
</template>