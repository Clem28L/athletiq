<script setup>
import { X } from "@lucide/vue";
const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

function updateItem(index, value) {
  const items = [...props.modelValue];
  items[index] = value;

  emit("update:modelValue", items);
}

function addItem() {
  emit("update:modelValue", [...props.modelValue, ""]);
}

function removeItem(index) {
  const items = [...props.modelValue];
  items.splice(index, 1);

  emit("update:modelValue", items);
}
</script>

<template>
  <div class="form-group">
    <label>Items in the correct order</label>

    <p class="field-help">
      Enter the items in order, from first to last.
    </p>

    <div
      v-for="(item, index) in modelValue"
      :key="index"
      class="answer-row"
    >
      <span>{{ index + 1 }}.</span>

      <input
        :value="item"
        :aria-label="'Position ' + (index + 1)"
        placeholder="Item text"
        required
        @input="updateItem(index, $event.target.value)"
      />

      <button
        v-if="modelValue.length > 2"
        type="button"
        class="btn-remove"
        aria-label="Remove item"
        @click="removeItem(index)"
      >
        <X :size="16" aria-hidden="true" />
      </button>
    </div>

    <button type="button" class="btn-add" @click="addItem">
      + Add item
    </button>
  </div>
</template>
