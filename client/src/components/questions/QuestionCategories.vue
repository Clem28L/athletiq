<script setup>
import { X } from "@lucide/vue";
const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Copy the list and the item before changing its field.
function updateItem(index, field, value) {
  const items = [...props.modelValue];
  items[index] = { ...items[index] };
  items[index][field] = value;

  emit("update:modelValue", items);
}

function addItem() {
  emit("update:modelValue", [
    ...props.modelValue,
    { text: "", category: "" },
  ]);
}

function removeItem(index) {
  const items = [...props.modelValue];
  items.splice(index, 1);

  emit("update:modelValue", items);
}
</script>

<template>
  <div class="form-group">
    <label>Items and their categories</label>

    <p class="field-help">
      Items can share a category.
      Use the same spelling for each category.
    </p>

    <div
      v-for="(item, index) in modelValue"
      :key="index"
      class="answer-row"
    >
      <input
        :value="item.text"
        :aria-label="'Item ' + (index + 1)"
        placeholder="e.g. Football"
        required
        @input="updateItem(index, 'text', $event.target.value)"
      />

      <input
        :value="item.category"
        :aria-label="'Category for item ' + (index + 1)"
        placeholder="e.g. Team sport"
        maxlength="100"
        required
        @input="updateItem(index, 'category', $event.target.value)"
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
