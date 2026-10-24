<script setup>
import { computed } from "vue";

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

// Return the left items
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

// Return the right items
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

// Return the match selected for one left item
function getSelection(id) {
  if (props.modelValue[id]) {
    return props.modelValue[id];
  }

  return "";
}

// Prevent the same right item from being selected twice
function isUsed(rightId, leftId) {
  for (const key in props.modelValue) {
    if (key !== leftId && props.modelValue[key] === rightId) {
      return true;
    }
  }

  return false;
}

// Copy the answers before changing a pair
function updatePair(id, value) {
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