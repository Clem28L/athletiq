<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { nutritionRequest } from "@/utils/nutritionApi";
import NutritionPlanCard from "@/components/NutritionPlanCard.vue";
import RaceNutritionPlanner from "@/components/RaceNutritionPlanner.vue";
import "@/assets/nutrition-plans.css";

const router = useRouter();
const plans = ref([]);
const listPage = ref(1);
const hasMore = ref(false);
const page = ref("list");
const loading = ref(false);
const error = ref("");
const selectedPlan = ref(null);

// Load one page of saved plans.
async function loadPlans(number = listPage.value) {
  if (loading.value) {
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const data = await nutritionRequest(router, "?page=" + number);
    plans.value = data.plans;
    hasMore.value = data.has_more;
    listPage.value = number;
  } catch (err) {
    error.value = "Unable to load plans. " + err.message;
  } finally {
    loading.value = false;
  }
}

// Start a new plan with an empty race form.
function newPlan() {
  selectedPlan.value = null;
  error.value = "";
  page.value = "planner";
}

// Open the saved plan in its matching view.
async function openPlan(id) {
  if (loading.value) {
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    selectedPlan.value = await nutritionRequest(router, "/" + id);
    // Older plans keep their original result view.
    if (selectedPlan.value.plan_data.format === "timeline") {
      page.value = "planner";
    } else {
      page.value = "result";
    }
  } catch (err) {
    error.value = "Unable to open the plan. " + err.message;
  } finally {
    loading.value = false;
  }
}

// Delete the plan and refresh the list.
async function deletePlan(id) {
  if (loading.value || !window.confirm("Delete this nutrition plan?")) {
    return;
  }
  loading.value = true;
  error.value = "";
  let nextPage = listPage.value;
  try {
    await nutritionRequest(router, "/" + id, "DELETE");
    if (plans.value.length === 1 && nextPage > 1) {
      nextPage--;
    }
  } catch (err) {
    error.value = "Unable to delete the plan. " + err.message;
    return;
  } finally {
    loading.value = false;
  }
  await loadPlans(nextPage);
}

// Return to the first page of saved plans.
function showPlans() {
  page.value = "list";
  selectedPlan.value = null;
  loadPlans(1);
}

// Check flask capacity in older saved plans.
function hasHydrationProblem(plan) {
  for (let i = 0; i < plan.segments.length; i++) {
    if (plan.segments[i].fluid_ml > plan.flask_capacity_ml) {
      return true;
    }
  }
  return false;
}

// Show food portions with up to two decimals.
function formatPortions(value) {
  return Number(value).toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

// Keep saved amounts easy to read.
function formatNumber(value) {
  return Number(value).toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

// Show the race duration in hours and minutes.
function formatTime(minutes) {
  const total = Math.round(minutes);
  return Math.floor(total / 60) + " h " + (total % 60) + " min";
}

// Load the plan list when the page opens.
onMounted(function () {
  loadPlans(1);
});
</script>

<template>
  <div class="nutrition-page">
    <header class="nutrition-header race-no-print">
      <div>
        <h1>Nutrition Plans</h1>
      </div>
      <div class="nutrition-actions">
        <button v-if="page !== 'list'" class="button button-outline" :disabled="loading" @click="showPlans">
          My Plans
        </button>
        <button v-if="page === 'list'" class="button button-outline" :disabled="loading" @click="loadPlans()">
          Refresh
        </button>
        <button v-if="page !== 'planner'" class="button button-dark" :disabled="loading" @click="newPlan">
          + New Nutrition Plan
        </button>
      </div>
    </header>
    <p v-if="error" class="nutrition-error" role="alert">{{ error }}</p>
    <p v-if="loading && page !== 'planner'" class="nutrition-message">Loading...</p>
    <section v-if="page === 'list' && !loading">
      <div v-if="plans.length === 0 && !error" class="nutrition-empty">
        <h2>No plans yet</h2>
        <p>Create your first race nutrition plan.</p>
        <button class="button button-dark" @click="newPlan">Create a Plan</button>
      </div>
      <div v-else class="nutrition-grid">
        <NutritionPlanCard
          v-for="plan in plans"
          :key="plan.id_nutplan"
          :plan="plan"
          @open="openPlan"
          @delete="deletePlan"
        />
      </div>
      <div v-if="listPage > 1 || hasMore" class="nutrition-pagination">
        <button class="button button-outline" :disabled="listPage === 1" @click="loadPlans(listPage - 1)">
          Previous
        </button>
        <span>Page {{ listPage }}</span>
        <button class="button button-outline" :disabled="!hasMore" @click="loadPlans(listPage + 1)">
          Next
        </button>
      </div>
    </section>
    <RaceNutritionPlanner v-if="page === 'planner'" :saved-plan="selectedPlan" @busy="loading = $event" />

    <!-- Keep previously saved plans readable. -->
    <section v-if="page === 'result' && selectedPlan" class="nutrition-result">
      <div v-if="hasHydrationProblem(selectedPlan.plan_data)" class="nutrition-alert" role="status">
        <strong>Your hydration plan is not fully feasible.</strong>
        <p>At least one section exceeds your flask capacity. The plan is saved, but you need more capacity or another confirmed refill point.</p>
      </div>
      <div class="nutrition-panel nutrition-result-heading">
        <span class="nutrition-tag">Saved plan</span>
        <h2>{{ selectedPlan.name }}</h2>
        <p>{{ formatNumber(selectedPlan.distance_km) }} km · {{ formatTime(selectedPlan.estimated_duration) }}</p>
        <p v-if="selectedPlan.elevation_gain != null">Elevation gain: {{ formatNumber(selectedPlan.elevation_gain) }} m</p>
        <p v-if="selectedPlan.temperature != null">Temperature: {{ formatNumber(selectedPlan.temperature) }} °C</p>
      </div>

      <section class="nutrition-panel">
        <h2>Your targets</h2>
        <p class="nutrition-help">These are the hourly targets you entered, not targets chosen by the calculator.</p>
        <div class="nutrition-summary">
          <div><span>Carbohydrates</span><strong>{{ formatNumber(selectedPlan.plan_data.carbs_per_hour) }} g/h</strong></div>
          <div><span>Total fluid</span><strong>{{ formatNumber(selectedPlan.plan_data.hydration_ml_per_hour) }} ml/h</strong></div>
          <div><span>Flask capacity</span><strong>{{ formatNumber(selectedPlan.plan_data.flask_capacity_ml) }} ml</strong></div>
        </div>
      </section>

      <section class="nutrition-panel">
        <h2>Calculated amounts for the full race</h2>
        <div class="nutrition-summary">
          <div><span>Total carb target</span><strong>{{ formatNumber(selectedPlan.plan_data.totals.carbs_target_g) }} g</strong></div>
          <div><span>Total fluid</span><strong>{{ formatNumber(selectedPlan.plan_data.totals.fluid_ml / 1000) }} L</strong></div>
          <div><span>Food portions to pack</span><strong>{{ selectedPlan.plan_data.totals.food_portions_to_pack }}</strong></div>
        </div>
        <p v-if="selectedPlan.plan_data.drinks" class="nutrition-help nutrition-totals-note">Drinks provide {{ formatNumber(selectedPlan.plan_data.totals.drink_carbs_g) }} g of carbs. Food provides {{ formatNumber(selectedPlan.plan_data.totals.food_carbs_g) }} g before packing quantities are rounded up.</p>
      </section>

      <!-- Whole packs can contain more food than the eating target. -->
      <section v-if="selectedPlan.plan_data.totals.food_packed_carbs_g !== undefined" class="nutrition-panel">
        <h2>Food to eat and food to carry</h2>
        <div class="nutrition-summary">
          <div><span>Food carbs to consume</span><strong>{{ formatNumber(selectedPlan.plan_data.totals.food_carbs_g) }} g</strong></div>
          <div><span>Food carbs packed in whole portions</span><strong>{{ formatNumber(selectedPlan.plan_data.totals.food_packed_carbs_g) }} g</strong></div>
          <div><span>Extra packed carbs</span><strong>{{ formatNumber(selectedPlan.plan_data.totals.food_extra_carbs_g) }} g</strong></div>
        </div>
        <p class="nutrition-help nutrition-totals-note">Extra carbs come from rounding up whole portions. They are not an extra eating target.</p>
        <p class="nutrition-help">Packed totals include the start and all later pickups. You do not carry the full total at once.</p>
        <p v-if="selectedPlan.plan_data.reuse_leftovers" class="nutrition-help">Leftovers are kept and used before collecting more of the same product.</p>
        <p v-else class="nutrition-help">Leftovers are not counted toward the next collection. Each pickup covers its own part of the race.</p>
        <div v-if="selectedPlan.plan_data.totals.foods.length > 0" class="nutrition-table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Carbs to eat</th><th>Portions packed</th><th>Carbs packed</th><th>Extra carbs</th></tr></thead>
            <tbody>
              <tr v-for="(food, index) in selectedPlan.plan_data.totals.foods" :key="index">
                <td>{{ food.name }}</td>
                <td>{{ formatNumber(food.carbs_g) }} g</td>
                <td>{{ food.portions_to_pack }}</td>
                <td>{{ formatNumber(food.packed_carbs_g) }} g</td>
                <td>{{ formatNumber(food.extra_carbs_g) }} g</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="nutrition-panel">
        <h2>Between aid stations</h2>
        <p class="nutrition-help">Fluid amounts cover each section. Refills are assumed available at every stop. Carrying drink powder or tablets is not calculated.</p>
        <div class="nutrition-table-wrap">
          <table>
            <thead><tr><th>Section</th><th>Time from start</th><th>Carb target</th><th>Total fluid</th><th>Drinks to prepare</th><th>Carbs from food</th></tr></thead>
            <tbody>
              <tr v-for="(segment, index) in selectedPlan.plan_data.segments" :key="index">
                <td>
                  <strong>{{ segment.from }} → {{ segment.to }}</strong>
                  <small>{{ formatNumber(segment.distance_km) }} km</small>
                  <small v-if="segment.fluid_shortfall_ml > 0" class="nutrition-warning">You need {{ formatNumber(segment.fluid_shortfall_ml) }} ml more flask capacity for this section.</small>
                  <!-- Older saved plans only have a capacity flag. -->
                  <small v-if="segment.capacity_too_small" class="nutrition-warning">Your flasks cannot hold the planned fluid for this section.</small>
                  <small v-if="segment.drink_exceeds_carbs_target" class="nutrition-warning">Drinks alone exceed your carb target. Review your drink settings.</small>
                </td>
                <td>{{ formatTime(segment.start_minutes) }} – {{ formatTime(segment.end_minutes) }}</td>
                <td>{{ formatNumber(segment.carbs_target_g) }} g</td>
                <td>{{ formatNumber(segment.fluid_ml) }} ml</td>
                <td>
                  <template v-if="segment.drinks">
                    <small v-for="(drink, drinkIndex) in segment.drinks" :key="drinkIndex">{{ drink.name }}: {{ formatNumber(drink.volume_ml) }} ml ({{ formatNumber(drink.carbs_g) }} g carbs)</small>
                  </template>
                  <template v-else>
                    <small>Water: {{ formatNumber(segment.water_ml) }} ml</small>
                    <small>Drink: {{ formatNumber(segment.drink_ml) }} ml</small>
                  </template>
                </td>
                <td>{{ formatNumber(segment.food_carbs_g) }} g</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- The eating plan uses fractions; the packing plan uses whole portions. -->
      <section v-if="selectedPlan.plan_data.segments[0].foods" class="nutrition-panel">
        <h2>What to eat in each section</h2>
        <p class="nutrition-help">Spread these amounts across the section. Portions can be fractions: about 1.5 portions means one and a half. The carb amounts are the planned amounts; portion counts are shown approximately.</p>
        <div class="nutrition-table-wrap">
          <table>
            <thead><tr><th>Section</th><th>Time from start</th><th>Food to consume</th></tr></thead>
            <tbody>
              <tr v-for="(segment, index) in selectedPlan.plan_data.segments" :key="index">
                <td>{{ segment.from }} → {{ segment.to }}</td>
                <td>{{ formatTime(segment.start_minutes) }} – {{ formatTime(segment.end_minutes) }}</td>
                <td>
                  <p v-if="segment.foods.length === 0">No food needed for this section.</p>
                  <ul class="nutrition-product-list">
                    <li v-for="(food, foodIndex) in segment.foods" :key="foodIndex">
                      <strong>{{ food.name }}: {{ formatNumber(food.carbs_g) }} g carbs</strong>
                      <small>About {{ formatPortions(food.portions_to_consume) }} portions to consume</small>
                    </li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="nutrition-panel">
        <h2>Food to pack and collect</h2>
        <p class="nutrition-help">At each location, pack enough to reach the next food collection point. Portions are rounded up for packing, not extra food you must eat.</p>
        <div class="nutrition-supplies">
          <article v-for="(supply, index) in selectedPlan.plan_data.supplies" :key="index" class="nutrition-stop">
            <h3>{{ supply.location }}</h3>
            <p class="nutrition-help">To cover the race until {{ supply.until }}.</p>
            <p v-if="supply.products && supply.products.length === 0">No food portions needed.</p>
            <ul v-if="supply.products" class="nutrition-product-list">
              <li v-for="(product, productIndex) in supply.products" :key="productIndex">
                <strong>{{ product.portions_to_pack }} portions</strong> of {{ product.name }}
                <small>Carbs to eat before {{ supply.until }}: {{ formatNumber(product.carbs_g) }} g</small>
                <template v-if="product.packed_carbs_g !== undefined">
                  <small>Carbs in newly packed portions: {{ formatNumber(product.packed_carbs_g) }} g</small>
                  <small v-if="product.carried_in_carbs_g > 0">Already carried from earlier: {{ formatNumber(product.carried_in_carbs_g) }} g</small>
                  <small>Left after this part: {{ formatNumber(product.leftover_carbs_g) }} g</small>
                </template>
              </li>
            </ul>
            <p v-else><strong>{{ supply.food_portions }} portions</strong> of {{ supply.food_name }}</p>
          </article>
        </div>
      </section>

      <section v-if="selectedPlan.plan_data.drinks" class="nutrition-panel">
        <h2>Your drink labels</h2>
        <p class="nutrition-help">Follow each product's label when preparing drinks. Sodium values are shown only when you entered them.</p>
        <ul class="nutrition-product-list">
          <li v-for="(drink, index) in selectedPlan.plan_data.drinks" :key="index">
            <strong>{{ drink.name }}</strong>: {{ drink.share_percent }}% of fluid · {{ formatNumber(drink.carbs_per_litre) }} g carbs/litre
            <small v-if="drink.sodium_mg_per_litre != null">Sodium: {{ formatNumber(drink.sodium_mg_per_litre) }} mg/litre</small>
          </li>
        </ul>
      </section>
    </section>
  </div>
</template>
