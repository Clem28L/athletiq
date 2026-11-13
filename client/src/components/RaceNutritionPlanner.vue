<script setup>
import { computed, ref, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { Droplets, Flag, Check, ChevronDown } from "@lucide/vue";
import { nutritionRequest } from "@/utils/nutritionApi";
import NutritionProductList from "./NutritionProductList.vue";
const props = defineProps({
  savedPlan: {
    type: Object,
    default: null
  }
});
const emit = defineEmits(["busy"]);
const router = useRouter();
const draft = ref({
  format: "timeline",
  name: "",
  distance_km: "",
  estimated_duration: "",
  carbs_per_hour: "",
  hydration_ml_per_hour: "",
  flask_capacity_ml: "",
  products: [{
    id: 1,
    kind: "drink",
    name: "Water",
    carbs: 0
  }],
  foods: [],
  drinks: [],
  aid_stations: []
});
const stage = ref("setup");
const report = ref(null);
const proposal = ref(null);
const savedId = ref(null);
const message = ref("");
const error = ref("");
const busy = ref(false);
const selection = ref(null);
const productForm = ref({
  kind: "gel",
  name: "",
  carbs: ""
});
const productFormElement = ref(null);
const editorElement = ref(null);
const expandedStep = ref(null);

// Copy the saved plan so edits stay local.
if (props.savedPlan) {
  draft.value = JSON.parse(JSON.stringify(props.savedPlan.plan_data.draft));
  report.value = props.savedPlan.plan_data;
  savedId.value = props.savedPlan.id_nutplan;
  stage.value = "build";
}

// A changed plan must be checked again before showing its old results.
watch(draft, function () {
  report.value = null;
  proposal.value = null;
  message.value = "";
  error.value = "";
}, {
  deep: true,
  flush: "sync"
});

// Keep the parent screen in sync while loading.
watch(busy, function (value) {
  emit("busy", value);
}, {
  flush: "sync"
});

// Find the item selected in the editor.
const selectedEntry = computed(function () {
  if (!selection.value) {
    return null;
  }
  const items = draft.value[selection.value.list];
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === selection.value.id) {
      return items[i];
    }
  }
  return null;
});

// Use whole gels and allow half bars or food.
const portionStep = computed(function () {
  if (selectedEntry.value && selection.value.list === "foods" && getProduct(selectedEntry.value.product_id).kind === "gel") {
    return 1;
  }
  return 0.5;
});

// Keep time labels readable on long races.
const ticks = computed(function () {
  const items = [];
  let interval = 30;
  if (draft.value.estimated_duration > 240) {
    interval = 60;
  }
  if (draft.value.estimated_duration > 720) {
    interval = 120;
  }
  for (let minute = 0; minute < draft.value.estimated_duration; minute += interval) {
    items.push(minute);
  }
  items.push(draft.value.estimated_duration);
  return items;
});

// Leave enough room for the intake cards.
const timelineWidth = computed(function () {
  return Math.max(720, Math.ceil(draft.value.estimated_duration / 60) * 280);
});

// Give each food type its own row. Stack only when two labels overlap.
const foodLanes = computed(function () {
  const lanes = [
    { kind: "gel", name: "Gels", items: [] },
    { kind: "bar", name: "Bars", items: [] },
    { kind: "food", name: "Other food", items: [] }
  ];
  const foods = [...draft.value.foods];
  // Sort food by race time.
  foods.sort(function (a, b) {
    return a.time_minutes - b.time_minutes;
  });
  const visible = [];
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    const rowEnds = [];
    for (let j = 0; j < foods.length; j++) {
      const food = foods[j];
      if (getProduct(food.product_id).kind !== lane.kind) {
        continue;
      }
      const left = food.time_minutes / draft.value.estimated_duration * timelineWidth.value;
      let row = rowEnds.length;
      for (let k = 0; k < rowEnds.length; k++) {
        if (rowEnds[k] <= left - 148) {
          row = k;
          break;
        }
      }
      rowEnds[row] = left;
      lane.items.push({ food: food, row: row });
    }
    if (lane.items.length > 0) {
      lane.height = rowEnds.length * 88 + 16;
      visible.push(lane);
    }
  }
  return visible;
});

// Show each drink product on its own line.
const drinkLanes = computed(function () {
  const lanes = [];
  for (let i = 0; i < draft.value.products.length; i++) {
    const product = draft.value.products[i];
    const drinks = [];
    for (let j = 0; j < draft.value.drinks.length; j++) {
      if (draft.value.drinks[j].product_id === product.id) {
        drinks.push(draft.value.drinks[j]);
      }
    }
    if (drinks.length > 0) {
      lanes.push({ product: product, drinks: drinks });
    }
  }
  return lanes;
});

// Group actions at the same time and show what to drink before the next step.
const roadbookSteps = computed(function () {
  const times = [0, draft.value.estimated_duration];
  const lists = [draft.value.foods, draft.value.aid_stations];
  for (let i = 0; i < lists.length; i++) {
    for (let j = 0; j < lists[i].length; j++) {
      times.push(lists[i][j].time_minutes);
    }
  }
  for (let i = 0; i < draft.value.drinks.length; i++) {
    times.push(draft.value.drinks[i].start_minutes, draft.value.drinks[i].end_minutes);
  }
  const uniqueTimes = [...new Set(times)];
  // Read the steps from start to finish.
  uniqueTimes.sort(function (a, b) {
    return a - b;
  });
  const steps = [];
  for (let i = 0; i < uniqueTimes.length; i++) {
    const time = uniqueTimes[i];
    let end = time;
    if (i + 1 < uniqueTimes.length) {
      end = uniqueTimes[i + 1];
    }
    const step = {
      time: time,
      end: end,
      foods: [],
      stops: [],
      drinks: [],
      fluid: 0,
      pickup: null
    };
    for (let j = 0; j < draft.value.foods.length; j++) {
      if (draft.value.foods[j].time_minutes === time) {
        step.foods.push(draft.value.foods[j]);
      }
    }
    for (let j = 0; j < draft.value.aid_stations.length; j++) {
      if (draft.value.aid_stations[j].time_minutes === time) {
        step.stops.push(draft.value.aid_stations[j]);
      }
    }
    for (let j = 0; j < draft.value.products.length; j++) {
      const product = draft.value.products[j];
      let volume = 0;
      for (let k = 0; k < draft.value.drinks.length; k++) {
        const drink = draft.value.drinks[k];
        if (drink.product_id === product.id) {
          const overlap = Math.max(0, Math.min(end, drink.end_minutes) - Math.max(time, drink.start_minutes));
          volume += drink.volume_ml * overlap / (drink.end_minutes - drink.start_minutes);
        }
      }
      if (volume > 0) {
        step.drinks.push({ name: product.name, volume: volume });
        step.fluid += volume;
      }
    }
    if (report.value) {
      for (let j = 0; j < report.value.supplies.length; j++) {
        if (report.value.supplies[j].time_minutes === time) {
          step.pickup = report.value.supplies[j];
        }
      }
    }
    steps.push(step);
  }
  return steps;
});

// These totals change while the athlete places products.
const totals = computed(function () {
  let carbs = 0;
  let fluid = 0;
  for (let i = 0; i < draft.value.foods.length; i++) {
    const food = draft.value.foods[i];
    carbs += getProduct(food.product_id).carbs * Number(food.quantity);
  }
  for (let i = 0; i < draft.value.drinks.length; i++) {
    const drink = draft.value.drinks[i];
    fluid += Number(drink.volume_ml);
    carbs += Number(drink.volume_ml) / 500 * getProduct(drink.product_id).carbs;
  }
  return {
    carbs: carbs,
    fluid: fluid
  };
});

// Find the product used by an intake.
function getProduct(id) {
  for (let i = 0; i < draft.value.products.length; i++) {
    if (draft.value.products[i].id === id) {
      return draft.value.products[i];
    }
  }
  return null;
}

// Make an ID that is not used in this list.
function nextId(items) {
  let id = 1;
  for (let i = 0; i < items.length; i++) {
    id = Math.max(id, items[i].id + 1);
  }
  return id;
}

// Keep numbers short and easy to read.
function formatNumber(value) {
  return Number(value).toLocaleString("en-GB", {
    maximumFractionDigits: 2
  });
}

// Show minutes as a short race time.
function formatTime(minutes) {
  const total = Math.round(minutes);
  if (total < 60) {
    return total + " min";
  }
  const hours = Math.floor(total / 60);
  if (total % 60 === 0) {
    return hours + " h";
  }
  return hours + " h " + total % 60 + " min";
}

// Place a time on the race line.
function position(minutes) {
  return minutes / draft.value.estimated_duration * 100 + "%";
}

// Show the start and length of a drink period.
function drinkStyle(drink) {
  return {
    left: position(drink.start_minutes),
    width: position(drink.end_minutes - drink.start_minutes)
  };
}

// Open the product list after the race form.
function openProducts() {
  stage.value = "products";
  selection.value = null;
}

// Build a strategy from the race and products.
async function generateStrategy() {
  // Include the last product if its form has not been added yet.
  if (productForm.value.name.trim() || productForm.value.carbs !== "") {
    if (!productFormElement.value.reportValidity()) {
      return;
    }
    addProduct();
  }
  busy.value = true;
  error.value = "";
  try {
    const generated = await nutritionRequest(router, "/suggest", "POST", draft.value);
    draft.value = generated.draft;
    report.value = generated.report;
    stage.value = "build";
    selection.value = null;
    expandedStep.value = null;
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

// Open or close one roadbook step.
function toggleStep(time) {
  if (expandedStep.value === time) {
    expandedStep.value = null;
  } else {
    expandedStep.value = time;
  }
}

// Open the editor for this roadbook item.
async function editRoadbookItem(list, id) {
  selectEntry(list, id);
  await nextTick();
  editorElement.value.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Add the product and clear its form.
function addProduct() {
  const product = {
    id: nextId(draft.value.products),
    kind: productForm.value.kind,
    name: productForm.value.name.trim(),
    carbs: productForm.value.carbs
  };
  if (!product.name) {
    return;
  }
  draft.value.products.push(product);
  productForm.value = {
    kind: product.kind,
    name: "",
    carbs: ""
  };
}

// Remove placements with the product so no broken reference stays in the plan.
function removeProduct(id) {
  const product = getProduct(id);
  const lists = [draft.value.foods, draft.value.drinks];
  for (let i = 0; i < lists.length; i++) {
    for (let j = lists[i].length - 1; j >= 0; j--) {
      if (lists[i][j].product_id === id) {
        lists[i].splice(j, 1);
      }
    }
  }
  for (let i = 0; i < draft.value.products.length; i++) {
    if (draft.value.products[i].id === id) {
      draft.value.products.splice(i, 1);
      break;
    }
  }
  selection.value = null;
  if (product.kind === "drink" && product.carbs > 0) {
    rebalanceWater();
  }
}

// Choose the item to edit.
function selectEntry(list, id) {
  selection.value = {
    list: list,
    id: id
  };
}

// Remove the selected intake or aid station.
function removeEntry() {
  const items = draft.value[selection.value.list];
  let removedCarbDrink = false;
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === selection.value.id) {
      if (selection.value.list === "drinks" && getProduct(items[i].product_id).carbs > 0) {
        removedCarbDrink = true;
      }
      items.splice(i, 1);
      break;
    }
  }
  selection.value = null;
  if (removedCarbDrink) {
    rebalanceWater();
  }
}

// Keep total drink volume near the target when a carb drink changes.
function rebalanceWater() {
  const drinks = draft.value.drinks;
  const boundaries = [];
  let next = nextId(drinks);
  for (let i = 0; i < drinks.length; i++) {
    const drink = drinks[i];
    if (drink.end_minutes <= drink.start_minutes || !Number.isFinite(drink.volume_ml)) {
      return;
    }
    boundaries.push(drink.start_minutes, drink.end_minutes);
  }
  // Split water where a drink starts or ends.
  boundaries.sort(function (a, b) {
    return a - b;
  });
  const balanced = [];
  for (let i = 0; i < drinks.length; i++) {
    const drink = drinks[i];
    if (getProduct(drink.product_id).carbs > 0) {
      balanced.push(drink);
      continue;
    }
    let firstPart = true;
    for (let j = 0; j < boundaries.length - 1; j++) {
      const start = boundaries[j];
      const end = boundaries[j + 1];
      if (end <= start || start < drink.start_minutes || end > drink.end_minutes) {
        continue;
      }
      let waterRate = 0;
      let carbDrinkRate = 0;
      for (let k = 0; k < drinks.length; k++) {
        const item = drinks[k];
        if (item.start_minutes <= start && item.end_minutes >= end) {
          const rate = item.volume_ml / (item.end_minutes - item.start_minutes);
          if (getProduct(item.product_id).carbs === 0) {
            waterRate += rate;
          } else {
            carbDrinkRate += rate;
          }
        }
      }
      if (waterRate <= 0) {
        continue;
      }
      const remainingRate = Math.max(0, draft.value.hydration_ml_per_hour / 60 - carbDrinkRate);
      const ownShare = drink.volume_ml / (drink.end_minutes - drink.start_minutes) / waterRate;
      const volume = Math.round(remainingRate * ownShare * (end - start));
      if (volume > 0) {
        let id = drink.id;
        if (!firstPart) {
          id = next;
          next++;
        }
        firstPart = false;
        balanced.push({ id: id, product_id: drink.product_id, start_minutes: start,
          end_minutes: end, volume_ml: volume });
      }
    }
  }
  draft.value.drinks = balanced;
}

// Update water after editing a carb drink.
function finishEditing() {
  if (selection.value.list === "drinks" && getProduct(selectedEntry.value.product_id).carbs > 0) {
    rebalanceWater();
  }
  selection.value = null;
}

// Clicking Add also works on touch screens without drag and drop.
function placeProduct(id, time = 0) {
  if (busy.value) {
    return;
  }
  const product = getProduct(id);
  if (!product) {
    error.value = "Select a product first.";
    return;
  }
  const minute = Math.min(Math.max(0, time), draft.value.estimated_duration - 1);
  if (product.kind === "drink") {
    const end = Math.min(minute + 60, draft.value.estimated_duration);
    const entry = {
      id: nextId(draft.value.drinks),
      product_id: id,
      start_minutes: minute,
      end_minutes: end,
      volume_ml: Math.ceil(draft.value.hydration_ml_per_hour * (end - minute) / 60)
    };
    if (product.carbs > 0) {
      entry.volume_ml = Math.max(1, Math.round(entry.volume_ml / 2));
    }
    draft.value.drinks.push(entry);
    if (product.carbs > 0) {
      rebalanceWater();
    }
    selectEntry("drinks", entry.id);
  } else {
    const entry = {
      id: nextId(draft.value.foods),
      product_id: id,
      time_minutes: minute,
      quantity: 1
    };
    draft.value.foods.push(entry);
    selectEntry("foods", entry.id);
  }
}

// Add an aid station halfway through the race.
function addStop() {
  const stop = {
    id: nextId(draft.value.aid_stations),
    name: "Aid station " + (draft.value.aid_stations.length + 1),
    time_minutes: Math.max(1, Math.floor(draft.value.estimated_duration / 2)),
    collect_products: false
  };
  draft.value.aid_stations.push(stop);
  selectEntry("aid_stations", stop.id);
}

// Keep the item ID while it is dragged.
function startDrag(event, list, id) {
  event.dataTransfer.setData("text/plain", list + ":" + id);
  event.dataTransfer.effectAllowed = "copyMove";
}

// Drag a product from the product list.
function dragProduct(event, id) {
  startDrag(event, "products", id);
}

// Read the race time under the pointer.
function timeAtPointer(event) {
  const box = event.currentTarget.getBoundingClientRect();
  return Math.round(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) * draft.value.estimated_duration);
}

// Add or move the dropped item to this time.
function dropOnTimeline(event) {
  if (busy.value) {
    return;
  }
  const parts = event.dataTransfer.getData("text/plain").split(":");
  const list = parts[0];
  const id = Number(parts[1]);
  const time = timeAtPointer(event);
  if (list === "products") {
    placeProduct(id, time);
    return;
  }
  if (!["foods", "drinks", "aid_stations"].includes(list)) {
    return;
  }
  selectEntry(list, id);
  const entry = selectedEntry.value;
  if (!entry) {
    return;
  }
  if (list === "drinks") {
    const length = entry.end_minutes - entry.start_minutes;
    const start = Math.min(time, draft.value.estimated_duration - length);
    entry.start_minutes = start;
    entry.end_minutes = start + length;
    if (getProduct(entry.product_id).carbs > 0) {
      rebalanceWater();
    }
  } else {
    let minimum = 0;
    if (list === "aid_stations") {
      minimum = 1;
    }
    entry.time_minutes = Math.max(minimum, Math.min(time, draft.value.estimated_duration - 1));
  }
}

// Compare the edited plan with its targets.
async function checkStrategy() {
  busy.value = true;
  error.value = "";
  proposal.value = null;
  try {
    report.value = await nutritionRequest(router, "/calculate", "POST", draft.value);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

// Get an update to preview before applying it.
async function suggestAdditions() {
  busy.value = true;
  error.value = "";
  try {
    proposal.value = await nutritionRequest(router, "/suggest", "POST", draft.value);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

// Apply the update shown in the preview.
function acceptProposal() {
  const accepted = proposal.value;
  draft.value = accepted.draft;
  report.value = accepted.report;
  selection.value = null;
}

// Create a saved plan or update this one.
async function savePlan() {
  busy.value = true;
  error.value = "";
  try {
    let path = "";
    let method = "POST";
    if (savedId.value !== null) {
      path = "/" + savedId.value;
      method = "PUT";
    }
    const data = await nutritionRequest(router, path, method, draft.value);
    savedId.value = data.planId;
    report.value = data.plan;
    proposal.value = null;
    message.value = "Plan saved to your account.";
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

// Open the print and PDF options.
function printRoadbook() {
  window.print();
}
</script>

<template>
  <div class="race-planner">
    <p v-if="error" class="nutrition-error" role="alert">{{ error }}</p>
    <p v-if="message" class="race-saved" role="status">{{ message }}</p>
    <ol v-if="stage !== 'build'" class="race-steps" aria-label="Plan your race">
      <li :class="{ active: stage === 'setup' }">1. Your race</li>
      <li :class="{ active: stage === 'products' }">2. Your products</li>
      <li>3. Your strategy</li>
    </ol>
    <!-- Step 1: set the race and hourly targets. -->
    <form v-if="stage === 'setup'" class="nutrition-panel race-onboarding" @submit.prevent="openProducts">
      <h2>Tell us about your race</h2>
      <p class="nutrition-help">
        Choose your own hourly targets.
      </p>
      <div class="nutrition-fields">
        <label>
          Race name
          <input v-model="draft.name" maxlength="100" required />
        </label>
        <label>
          Distance (km)
          <input
            v-model.number="draft.distance_km"
            type="number"
            min="0.01"
            max="9999.99"
            step="0.01"
            required
          />
        </label>
        <label>
          Estimated duration (minutes)
          <input
            v-model.number="draft.estimated_duration"
            type="number"
            min="1"
            max="10080"
            step="1"
            required
          />
        </label>
        <label>
          Carbohydrates (g/hour)
          <input
            v-model.number="draft.carbs_per_hour"
            type="number"
            min="0.01"
            max="10000"
            step="0.01"
            required
          />
        </label>
        <label>
          Fluid (ml/hour)
          <input
            v-model.number="draft.hydration_ml_per_hour"
            type="number"
            min="1"
            max="100000"
            step="1"
            required
          />
        </label>
        <label>
          Total flask capacity (ml)
          <input
            v-model.number="draft.flask_capacity_ml"
            type="number"
            min="1"
            max="100000"
            step="1"
            required
          />
        </label>
      </div>
      <button class="button button-dark" type="submit">Next: my products</button>
    </form>
    <!-- Step 2: choose the products before generation. -->
    <section v-if="stage === 'products'" class="nutrition-panel race-onboarding">
      <div class="race-panel-heading">
        <h2>What are you taking?</h2>
        <button class="race-text-button" :disabled="busy" @click="stage = 'setup'">Back to race</button>
      </div>
      <p class="race-help">Add the carbohydrates shown on your product labels.</p>
      <NutritionProductList :products="draft.products" :disabled="busy" @remove="removeProduct" />
      <form ref="productFormElement" class="race-product-form" @submit.prevent="addProduct">
        <fieldset class="race-fieldset race-product-inputs" :disabled="busy">
          <label>
            Type
            <select v-model="productForm.kind" aria-label="Product type">
              <option value="gel">Gel</option>
              <option value="bar">Bar</option>
              <option value="food">Other food</option>
              <option value="drink">Drink</option>
            </select>
          </label>
          <label>
            Product name
            <input v-model="productForm.name" maxlength="100" required />
          </label>
          <label>
            Carbs
            <template v-if="productForm.kind === 'drink'">(g / 500 ml)</template>
            <template v-else>(g / portion)</template>
            <input
              v-model.number="productForm.carbs"
              type="number"
              min="0"
              max="10000"
              step="0.01"
              required
            />
          </label>
          <button class="button button-outline" type="submit">Add product</button>
        </fieldset>
      </form>
      <div class="race-onboarding-actions">
        <button
          v-if="draft.foods.length + draft.drinks.length > 0"
          class="race-text-button"
          :disabled="busy"
          @click="stage = 'build'"
        >
          Back to strategy
        </button>
        <button class="button button-dark" :disabled="busy" @click="generateStrategy">
          <template v-if="busy">Generating...</template>
          <template v-else>Generate my strategy</template>
        </button>
      </div>
    </section>
    <!-- Step 3: move or edit items in the generated plan. -->
    <template v-if="stage === 'build'">
      <header class="race-toolbar race-no-print">
        <div>
          <h2>{{ draft.name }}</h2>
          <p>
            {{ formatNumber(draft.distance_km) }}
            km ·
            {{ formatTime(draft.estimated_duration) }}
          </p>
        </div>
        <div class="race-inline-actions">
          <button class="button button-outline" :disabled="busy" @click="stage = 'setup'">
            Race & products
          </button>
          <button class="button button-dark" :disabled="busy" @click="savePlan">Save plan</button>
        </div>
      </header>
      <section class="nutrition-panel race-course race-no-print">
        <div class="race-panel-heading">
          <div>
            <h2>Your race at a glance</h2>
            <p class="race-help">Drag to move. Click to edit.</p>
          </div>
          <button class="button button-outline" :disabled="busy || draft.estimated_duration < 2" @click="addStop">
            <Flag :size="17" aria-hidden="true" />
            Add aid station
          </button>
        </div>
        <details class="race-inventory">
          <summary>Add food or drinks</summary>
          <NutritionProductList
            :products="draft.products"
            :disabled="busy"
            placement
            @place="placeProduct"
            @drag="dragProduct"
          />
          <button class="race-text-button" :disabled="busy" @click="stage = 'products'">Edit my products</button>
        </details>
        <div class="race-scroll">
          <div class="race-timeline" :style="{ minWidth: timelineWidth + 'px' }">
            <div class="race-axis">
              <span v-for="tick in ticks" :key="tick" :style="{ left: position(tick) }">{{ formatTime(tick) }}</span>
            </div>
            <div v-for="lane in foodLanes" :key="lane.kind" class="race-lane">
              <h3 class="race-lane-label">{{ lane.name }}</h3>
              <div
                class="race-food-track"
                :style="{ height: lane.height + 'px' }"
                @dragover.prevent
                @drop.prevent="dropOnTimeline"
              >
                <button
                  v-for="item in lane.items"
                  :key="item.food.id"
                  class="race-food-pin"
                  :class="{ selected: selection && selection.list === 'foods' && selection.id === item.food.id }"
                  :style="{ left: position(item.food.time_minutes), top: item.row * 88 + 8 + 'px' }"
                  :draggable="!busy"
                  :disabled="busy"
                  @dragstart="startDrag($event, 'foods', item.food.id)"
                  @click="selectEntry('foods', item.food.id)"
                >
                  <span class="race-pin-time">{{ formatTime(item.food.time_minutes) }}</span>
                  <span class="race-pin-name">{{ getProduct(item.food.product_id).name }}</span>
                  <span class="race-pin-quantity">
                    ×
                    {{ formatNumber(item.food.quantity) }}
                  </span>
                </button>
              </div>
            </div>
            <div
              v-if="foodLanes.length === 0"
              class="race-empty-track"
              @dragover.prevent
              @drop.prevent="dropOnTimeline"
            >
              Add or drop food here
            </div>
            <div v-for="lane in drinkLanes" :key="lane.product.id" class="race-lane">
              <h3 class="race-lane-label">
                <Droplets :size="16" aria-hidden="true" />
                {{ lane.product.name }}
              </h3>
              <div class="race-drink-track" @dragover.prevent @drop.prevent="dropOnTimeline">
                <button
                  v-for="drink in lane.drinks"
                  :key="drink.id"
                  class="race-drink-band"
                  :style="drinkStyle(drink)"
                  :draggable="!busy"
                  :disabled="busy"
                  @dragstart="startDrag($event, 'drinks', drink.id)"
                  @click="selectEntry('drinks', drink.id)"
                >
                  <strong>
                    {{ formatNumber(drink.volume_ml) }}
                    ml
                  </strong>
                  <span>
                    {{ formatTime(drink.start_minutes) }}
                    –
                    {{ formatTime(drink.end_minutes) }}
                  </span>
                </button>
              </div>
            </div>
            <div
              v-if="drinkLanes.length === 0"
              class="race-empty-track"
              @dragover.prevent
              @drop.prevent="dropOnTimeline"
            >
              Add or drop a drink here
            </div>
            <div v-if="draft.aid_stations.length > 0" class="race-lane">
              <h3 class="race-lane-label">Aid stations</h3>
              <div class="race-stop-track" @dragover.prevent @drop.prevent="dropOnTimeline">
                <button
                  v-for="stop in draft.aid_stations"
                  :key="stop.id"
                  class="race-stop-pin"
                  :style="{ left: position(stop.time_minutes) }"
                  :draggable="!busy"
                  :disabled="busy"
                  @dragstart="startDrag($event, 'aid_stations', stop.id)"
                  @click="selectEntry('aid_stations', stop.id)"
                >
                  <Flag :size="16" aria-hidden="true" />
                  <strong>{{ stop.name }}</strong>
                  <span>{{ formatTime(stop.time_minutes) }}</span>
                </button>
              </div>
            </div>
            <div class="race-endpoints">
              <span>Start · 0 km</span>
              <span>
                Finish ·
                {{ formatNumber(draft.distance_km) }}
                km
              </span>
            </div>
          </div>
        </div>
        <form
          ref="editorElement"
          v-if="selectedEntry"
          class="race-entry-editor"
          @submit.prevent="finishEditing"
        >
          <fieldset class="race-fieldset" :disabled="busy">
            <h3>Edit selected item</h3>
            <div v-if="selection.list === 'foods'" class="nutrition-fields">
              <label>
                Time from start (minutes)
                <input
                  v-model.number="selectedEntry.time_minutes"
                  type="number"
                  min="0"
                  :max="draft.estimated_duration - 1"
                  step="1"
                  required
                />
              </label>
              <label>
                Portions
                <input
                  v-model.number="selectedEntry.quantity"
                  type="number"
                  :min="portionStep"
                  max="10000"
                  :step="portionStep"
                  required
                />
              </label>
            </div>
            <div v-else-if="selection.list === 'drinks'" class="nutrition-fields">
              <label>
                From (minutes)
                <input
                  v-model.number="selectedEntry.start_minutes"
                  type="number"
                  min="0"
                  :max="selectedEntry.end_minutes - 1"
                  step="1"
                  required
                />
              </label>
              <label>
                To (minutes)
                <input
                  v-model.number="selectedEntry.end_minutes"
                  type="number"
                  :min="selectedEntry.start_minutes + 1"
                  :max="draft.estimated_duration"
                  step="1"
                  required
                />
              </label>
              <label>
                Total volume for this period (ml)
                <input
                  v-model.number="selectedEntry.volume_ml"
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                  required
                />
              </label>
              <p>
                Drink carbs:
                {{ formatNumber(selectedEntry.volume_ml / 500 * getProduct(selectedEntry.product_id).carbs) }}
                g
              </p>
            </div>
            <template v-else>
              <div class="nutrition-fields">
                <label>
                  Aid station name
                  <input v-model="selectedEntry.name" maxlength="100" required />
                </label>
                <label>
                  Time from start (minutes)
                  <input
                    v-model.number="selectedEntry.time_minutes"
                    type="number"
                    min="1"
                    :max="draft.estimated_duration - 1"
                    step="1"
                    required
                  />
                </label>
              </div>
              <label class="race-checkbox">
                <input v-model="selectedEntry.collect_products" type="checkbox" />
                I can collect my own food here
              </label>
              <p class="nutrition-help">Water refills must be available at this stop.</p>
            </template>
            <div class="race-inline-actions">
              <button type="submit" class="button button-dark">Done</button>
              <button type="button" class="button button-outline" @click="removeEntry">Remove item</button>
            </div>
          </fieldset>
        </form>
        <div class="race-plan-summary">
          <div>
            <span>Carbs</span>
            <strong>
              {{ formatNumber(totals.carbs) }}
              <small>
                /
                {{ formatNumber(draft.carbs_per_hour * draft.estimated_duration / 60) }}
                g
              </small>
            </strong>
          </div>
          <div>
            <span>Total drinks</span>
            <strong>
              {{ formatNumber(totals.fluid / 1000) }}
              <small>
                /
                {{ formatNumber(draft.hydration_ml_per_hour * draft.estimated_duration / 60000) }}
                L
              </small>
            </strong>
          </div>
          <div class="race-status">
            <span v-if="!report">Changes not checked</span>
            <strong v-else-if="report.covered && report.grouped_gels === 0" class="race-saved">
              <Check :size="18" aria-hidden="true" />
              Targets matched
            </strong>
            <strong v-else class="nutrition-warning">A few adjustments needed</strong>
            <button class="race-text-button" :disabled="busy" @click="checkStrategy">Check changes</button>
          </div>
        </div>
        <div v-if="report && !report.hydration_feasible" class="race-capacity-note" role="status">
          <template v-for="segment in report.segments" :key="segment.start_minutes">
            <p v-if="segment.fluid_shortfall_ml > 0.01">
              <Flag :size="16" aria-hidden="true" />
              {{ segment.from }}
              →
              {{ segment.to }}
              :
              {{ formatNumber(segment.fluid_shortfall_ml) }}
              ml more capacity or another refill needed.
            </p>
          </template>
        </div>
        <div v-if="report && (!report.covered || report.grouped_gels > 0)" class="race-inline-actions">
          <button class="button button-outline" :disabled="busy || proposal !== null" @click="suggestAdditions">
            Balance my plan
          </button>
        </div>
        <details v-if="report" class="race-check-details">
          <summary>View hourly details</summary>
          <p class="race-help">
            Comparison margin: ±
            {{ formatNumber(Math.min(10, draft.carbs_per_hour * 0.2)) }}
            g/h for carbs, ±10% for drinks.
          </p>
          <div class="nutrition-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Carbs / target</th>
                  <th>Drinks / target</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="hour in report.hourly" :key="hour.start_minutes">
                  <td>
                    {{ formatTime(hour.start_minutes) }}
                    –
                    {{ formatTime(hour.end_minutes) }}
                  </td>
                  <td :class="{ 'nutrition-warning': hour.carbs_status !== 'close' }">
                    {{ formatNumber(hour.carbs_g) }}
                    /
                    {{ formatNumber(hour.carbs_target_g) }}
                    g
                  </td>
                  <td :class="{ 'nutrition-warning': hour.fluid_status !== 'close' }">
                    {{ formatNumber(hour.fluid_ml) }}
                    /
                    {{ formatNumber(hour.fluid_target_ml) }}
                    ml
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section v-if="proposal" class="nutrition-panel race-proposal race-no-print">
        <div class="race-panel-heading">
          <h2>Suggested update</h2>
          <span v-if="proposal.added_foods > 0">
            {{ proposal.added_foods }}
            new food intake(s)
          </span>
        </div>
        <p v-if="proposal.replaced_foods.length > 0" class="race-help">
          Grouped or fractional gels will be replaced by separate intakes.
        </p>
        <details>
          <summary>View changes before applying</summary>
          <ul>
            <li v-for="food in proposal.food_additions" :key="'food-' + food.id">
              {{ formatTime(food.time_minutes) }}
              ·
              {{ formatNumber(food.quantity) }}
              ×
              {{ getProduct(food.product_id).name }}
            </li>
            <li v-for="drink in proposal.draft.drinks" :key="'drink-' + drink.id">
              {{ formatTime(drink.start_minutes) }}
              –
              {{ formatTime(drink.end_minutes) }}
              ·
              {{ formatNumber(drink.volume_ml) }}
              ml
              {{ getProduct(drink.product_id).name }}
            </li>
          </ul>
        </details>
        <p v-if="!proposal.report.covered" class="nutrition-warning">
          Some targets still need different products or food times.
        </p>
        <div class="race-inline-actions">
          <button
            class="button button-dark"
            :disabled="busy || (proposal.added_foods === 0 && !proposal.drinks_changed && proposal.replaced_foods.length === 0)"
            @click="acceptProposal"
          >
            Apply update
          </button>
          <button class="race-text-button" :disabled="busy" @click="proposal = null">Cancel</button>
        </div>
      </section>
      <!-- Open a step to see drinks, food and packing details. -->
      <section class="nutrition-panel race-roadbook">
        <div class="race-panel-heading">
          <div>
            <h2>Your race, step by step</h2>
            <p class="race-help">
              {{ draft.name }}
              ·
              {{ formatNumber(draft.distance_km) }}
              km ·
              {{ formatTime(draft.estimated_duration) }}
            </p>
          </div>
          <button class="button button-outline race-no-print" :disabled="!report || busy" @click="printRoadbook">
            Print / PDF
          </button>
        </div>
        <div v-if="report" class="nutrition-warning race-print-only">
          <p v-if="!report.covered || report.grouped_gels > 0">
            Review the target gaps and food timing before using this plan.
          </p>
          <template v-for="segment in report.segments" :key="segment.start_minutes">
            <p v-if="segment.fluid_shortfall_ml > 0.01">
              {{ segment.from }}
              →
              {{ segment.to }}
              :
              {{ formatNumber(segment.fluid_shortfall_ml) }}
              ml more flask capacity or another refill needed.
            </p>
          </template>
        </div>
        <ol class="race-roadbook-list">
          <li v-for="step in roadbookSteps" :key="step.time" class="race-roadbook-step">
            <span class="race-step-time">{{ formatTime(step.time) }}</span>
            <div class="race-step-dot" aria-hidden="true">
            </div>
            <article class="race-step-card">
              <button class="race-step-toggle" :aria-expanded="expandedStep === step.time" @click="toggleStep(step.time)">
                <span>
                  <strong v-if="step.time === 0">Start</strong>
                  <strong v-else-if="step.time === draft.estimated_duration">Finish</strong>
                  <strong v-for="food in step.foods" :key="food.id">
                    {{ formatNumber(food.quantity) }}
                    ×
                    {{ getProduct(food.product_id).name }}
                  </strong>
                  <strong v-for="stop in step.stops" :key="'stop-' + stop.id">
                    {{ stop.name }}
                    · refill
                  </strong>
                  <strong
                    v-if="step.time > 0 && step.time < draft.estimated_duration && step.foods.length + step.stops.length === 0"
                  >
                    Drink change
                  </strong>
                  <span v-if="step.fluid > 0" class="race-step-fluid">
                    {{ formatNumber(step.fluid) }}
                    ml to drink until
                    {{ formatTime(step.end) }}
                  </span>
                  <span v-else-if="step.time === draft.estimated_duration" class="race-step-fluid">
                    Your plan is complete.
                  </span>
                </span>
                <ChevronDown class="race-no-print" :size="18" aria-hidden="true" />
              </button>
              <div v-show="expandedStep === step.time" class="race-step-body">
                <div v-for="food in step.foods" :key="food.id" class="race-step-detail">
                  <span>
                    {{ formatNumber(food.quantity * getProduct(food.product_id).carbs) }}
                    g carbs ·
                    {{ getProduct(food.product_id).name }}
                  </span>
                  <button class="race-text-button race-no-print" :disabled="busy" @click="editRoadbookItem('foods', food.id)">
                    Edit intake
                  </button>
                </div>
                <div v-for="drink in step.drinks" :key="drink.name" class="race-step-detail">
                  <span>
                    <Droplets :size="15" aria-hidden="true" />
                    {{ drink.name }}
                  </span>
                  <strong>
                    {{ formatNumber(drink.volume) }}
                    ml
                  </strong>
                </div>
                <div v-for="stop in step.stops" :key="stop.id" class="race-step-detail">
                  <span>
                    Refill your flasks
                    <template v-if="stop.collect_products"> and collect food</template>
                    .
                  </span>
                  <button
                    class="race-text-button race-no-print"
                    :disabled="busy"
                    @click="editRoadbookItem('aid_stations', stop.id)"
                  >
                    Edit stop
                  </button>
                </div>
                <div v-if="step.pickup && step.pickup.products.length > 0" class="race-step-packing">
                  <strong>Pack here</strong>
                  <span v-for="product in step.pickup.products" :key="product.product_id">
                    {{ product.portions_to_pack }}
                    ×
                    {{ product.name }}
                  </span>
                </div>
              </div>
            </article>
          </li>
        </ol>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* Keep the setup forms in the same place. */
.race-planner {
  display: grid;
  gap: 24px;
}

.race-steps {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 28px;
  list-style: none;
  padding: 0;
  margin: 0;
  color: #68686d;
  font-size: 14px;
}

.race-steps .active {
  color: #33322f;
  font-weight: 700;
}

.race-onboarding {
  width: 100%;
  max-width: 820px;
  margin: 8px auto;
}

.race-onboarding > button {
  display: block;
  margin: 28px 0 0 auto;
}

.race-onboarding-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 20px;
  margin-top: 28px;
}

/* Share the spacing of headings and actions. */
.race-toolbar, .race-panel-heading, .race-inline-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.race-toolbar h2, .race-panel-heading h2 {
  margin: 0;
}

.race-toolbar p {
  margin: 7px 0 0;
  color: #68686d;
}

.race-inline-actions {
  justify-content: flex-start;
}

.race-help {
  margin: 12px 0 20px;
  color: #68686d;
  font-size: 14px;
}

.race-fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.race-product-form {
  margin-top: 24px;
  padding-top: 22px;
  border-top: 1px solid #e5e5e0;
}

.race-product-inputs {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1.2fr auto;
  gap: 14px;
  align-items: end;
}

.race-product-inputs select {
  padding: 12px;
  border: 1px solid #d6d5d1;
  border-radius: 6px;
  background: #fff;
  color: inherit;
  font: inherit;
  width: 100%;
}

.race-text-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #55544f;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
}

.race-course {
  min-width: 0;
}

.race-panel-heading > button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.race-panel-heading .race-help {
  margin-bottom: 0;
}

.race-inventory {
  margin: 22px 0;
  border-top: 1px solid #e5e5e0;
  border-bottom: 1px solid #e5e5e0;
  padding: 14px 0;
}

.race-inventory[open] > div {
  margin-top: 16px;
}

.race-inventory > button {
  margin-top: 14px;
}

.race-planner summary {
  cursor: pointer;
  font-size: 14px;
  color: #55544f;
}

/* Scroll the race line when the screen is narrow. */
.race-scroll {
  overflow-x: auto;
  margin-top: 24px;
  padding: 20px 78px;
  border-radius: 12px;
  background: #fbfaf7;
}

.race-timeline {
  padding-top: 12px;
}

.race-axis {
  position: relative;
  height: 38px;
  border-bottom: 2px solid #b5bcaf;
}

.race-axis span {
  position: absolute;
  transform: translateX(-50%);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.race-planner .race-lane-label {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 22px 0 8px;
  font-size: 14px;
  color: #55544f;
}

.race-food-track, .race-drink-track, .race-stop-track {
  position: relative;
  border-top: 1px solid #dedfd7;
}

.race-food-pin {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  transform: translateX(-50%);
  width: 136px;
  height: 76px;
  padding: 10px 12px;
  border: 1px solid #bdcbb8;
  border-radius: 9px;
  background: #eef3e9;
  color: #354c36;
  cursor: grab;
  text-align: left;
  font: inherit;
}

.race-food-pin.selected {
  border-color: #354c36;
}

.race-pin-time {
  font-size: 15px;
  font-weight: 700;
}

.race-pin-name {
  max-width: 100%;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.race-pin-quantity {
  font-size: 12px;
  color: #596650;
}

.race-drink-track {
  height: 68px;
}

.race-drink-band {
  position: absolute;
  top: 7px;
  height: 54px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  border: 0;
  border-radius: 8px;
  padding: 8px;
  background: #deebf1;
  color: #345468;
  cursor: grab;
  overflow: hidden;
  font: inherit;
}

.race-drink-band strong {
  font-size: 16px;
}

.race-drink-band span {
  font-size: 12px;
  white-space: nowrap;
}

.race-stop-track {
  height: 90px;
}

.race-stop-pin {
  position: absolute;
  top: 8px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 1px solid #d7c8ab;
  border-radius: 8px;
  background: #f5efe2;
  padding: 9px 12px;
  color: #665434;
  cursor: grab;
  font: inherit;
  font-size: 13px;
  max-width: 145px;
}

.race-stop-pin strong {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.race-empty-track {
  padding: 24px 0;
  color: #68686d;
  font-size: 14px;
}

.race-endpoints {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  margin-top: 14px;
  border-top: 1px solid #dedfd7;
  font-size: 13px;
  color: #55544f;
}

/* Keep the selected item close to the timeline. */
.race-entry-editor {
  margin-top: 24px;
  padding: 22px;
  background: #fbfaf7;
  border: 1px solid #dedfd7;
  border-radius: 10px;
}

.race-entry-editor h3 {
  margin-bottom: 18px;
}

.race-entry-editor .race-inline-actions {
  margin-top: 20px;
}

.race-checkbox {
  flex-direction: row;
  align-items: center;
  margin-top: 16px;
}

/* Show totals before the optional hourly details. */
.race-plan-summary {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  align-items: center;
  gap: 24px;
  margin-top: 24px;
}

.race-plan-summary > div > span {
  display: block;
  color: #68686d;
  font-size: 13px;
  margin-bottom: 7px;
}

.race-plan-summary > div > strong {
  font-size: 24px;
}

.race-plan-summary small {
  font-weight: 400;
  font-size: 16px;
}

.race-plan-summary .race-status strong {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 15px;
}

.race-status > button {
  margin-top: 6px;
}

.race-saved {
  color: #35634b;
  margin: 0;
}

.race-capacity-note {
  margin-top: 20px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #fff8eb;
  color: #805016;
}

.race-capacity-note p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 14px;
}

.race-capacity-note svg {
  flex-shrink: 0;
}

.race-capacity-note + .race-inline-actions {
  margin-top: 16px;
}

.race-check-details {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e0;
}

.race-check-details .race-help {
  font-size: 13px;
}

.race-proposal {
  border-color: #8caa94;
}

.race-proposal details {
  margin: 16px 0;
}

.race-proposal li {
  margin: 8px 0;
  font-size: 14px;
}

.race-proposal > .race-inline-actions {
  margin-top: 20px;
}

/* Connect the roadbook steps on one vertical line. */
.race-roadbook-list {
  list-style: none;
  padding: 0;
  margin: 30px 0 0;
}

.race-roadbook-step {
  display: grid;
  grid-template-columns: 110px 24px minmax(0, 1fr);
  column-gap: 20px;
  position: relative;
  padding-bottom: 18px;
}

.race-step-time {
  padding-top: 20px;
  font-size: 18px;
  font-weight: 600;
  color: #55544f;
  text-align: right;
}

.race-step-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #8c9b80;
  margin: 25px auto 0;
}

.race-step-dot::after {
  content: "";
  position: absolute;
  top: 37px;
  bottom: -25px;
  width: 2px;
  background: #e1e5da;
  left: 141px;
}

.race-roadbook-step:last-child .race-step-dot::after {
  display: none;
}

.race-step-card {
  border: 1px solid #dedfd7;
  border-radius: 10px;
  overflow: hidden;
  min-width: 0;
}

.race-step-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  text-align: left;
  color: inherit;
  border: 0;
  background: #fbfaf7;
  padding: 18px 22px;
  cursor: pointer;
  font: inherit;
}

.race-step-toggle strong {
  display: block;
  font-size: 17px;
  margin: 0 0 5px;
  overflow-wrap: anywhere;
}

.race-step-fluid {
  display: block;
  color: #68686d;
  font-size: 14px;
  line-height: 1.5;
}

.race-step-body {
  padding: 4px 22px 18px;
  border-top: 1px solid #e5e5e0;
}

.race-step-detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  font-size: 14px;
}

.race-step-detail > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.race-step-packing {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #e5e5e0;
  font-size: 14px;
}

.race-step-packing strong {
  width: 100%;
}

.race-print-only {
  display: none;
}

/* Fit the forms and roadbook on small screens. */
@media (max-width: 800px) {
  .race-product-inputs {
    grid-template-columns: 1fr 1fr;
  }

  .race-plan-summary {
    grid-template-columns: 1fr 1fr;
  }

  .race-status {
    grid-column: 1 / -1;
  }

  .race-roadbook-step {
    grid-template-columns: 80px 16px minmax(0, 1fr);
    column-gap: 12px;
  }

  .race-step-time {
    font-size: 15px;
  }

  .race-step-dot::after {
    left: 99px;
  }

}
@media (max-width: 500px) {
  .race-steps {
    gap: 14px;
    font-size: 12px;
  }

  .race-product-inputs {
    grid-template-columns: 1fr;
  }

  .race-onboarding-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .race-toolbar .race-inline-actions > button {
    flex: 1;
  }

  .race-roadbook-step {
    grid-template-columns: 56px 10px minmax(0, 1fr);
    column-gap: 8px;
  }

  .race-step-time {
    font-size: 13px;
  }

  .race-step-dot {
    width: 8px;
    height: 8px;
  }

  .race-step-dot::after {
    left: 67px;
  }

  .race-step-toggle {
    padding: 14px;
  }

  .race-step-toggle strong {
    font-size: 15px;
  }

  .race-step-body {
    padding: 4px 14px 14px;
  }

  .race-step-detail {
    flex-wrap: wrap;
    gap: 6px;
  }

}
/* Print all step details, including closed steps. */
@media print {
  .race-step-body {
    display: block !important;
  }

  .race-print-only {
    display: block;
  }

  .race-roadbook-step {
    break-inside: avoid;
  }

  .race-step-toggle {
    padding: 12px 16px;
  }

  .race-step-time {
    padding-top: 14px;
  }

  .race-step-dot {
    margin-top: 19px;
  }

}
</style>
