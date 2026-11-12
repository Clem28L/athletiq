<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { logoutUser } from "@/stores/auth";
import "@/assets/nutrition-plans.css";
import NutritionPlanCard from "@/components/NutritionPlanCard.vue";

const router = useRouter();
const plans = ref([]);
const listPage = ref(1);
const hasMore = ref(false);
const page = ref("list");
const loading = ref(false);
const error = ref("");
const form = ref(null);
const selectedPlan = ref(null);

// Call the server using the logged-in athlete's token.
async function request(path, method, body) {
  const options = {
    method: method,
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  };

  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch("http://localhost:3000/api/nutrition" + path, options);

  if (response.status === 401) {
    logoutUser();
    await router.push("/login");
    throw new Error("Please log in again.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
}

// Load the athlete's plans from the database.
async function loadPlans(number = listPage.value) {
  if (loading.value) {
    return;
  }
  loading.value = true;
  error.value = "";

  try {
    const data = await request("?page=" + number, "GET");
    plans.value = data.plans;
    hasMore.value = data.has_more;
    listPage.value = number;
  } catch (err) {
    error.value = "Unable to load plans. " + err.message;
  } finally {
    loading.value = false;
  }
}

// Open an empty form. Hourly targets are entered by the athlete.
function newPlan() {
  form.value = {
    name: "",
    distance_km: "",
    elevation_gain: "",
    estimated_duration: "",
    temperature: "",
    carbs_per_hour: "",
    hydration_ml_per_hour: "",
    flask_capacity_ml: "",
    reuse_leftovers: false,
    foods: [],
    drinks: [{ name: "Water", carbs_per_litre: 0, share_percent: 100, sodium_mg_per_litre: "" }],
    aid_stations: [],
  };
  error.value = "";
  page.value = "form";
}

// Add a stop after the previous one.
function addStop() {
  form.value.aid_stations.push({
    name: "",
    distance_km: "",
    time_minutes: "",
    collect_products: false,
  });
}

// Remove a stop from the form.
function removeStop(index) {
  form.value.aid_stations.splice(index, 1);
}

// Add an empty food product.
function addFood() {
  let share = 0;

  // The first food gets the full share.
  if (form.value.foods.length === 0) {
    share = 100;
  }

  form.value.foods.push({
    name: "",
    carbs_per_portion: "",
    share_percent: share,
  });
}

// Remove the selected food from the form.
function removeFood(index) {
  form.value.foods.splice(index, 1);
}

// Add an empty drink.
function addDrink() {
  let share = 0;

  // The first drink gets the full share.
  if (form.value.drinks.length === 0) {
    share = 100;
  }

  form.value.drinks.push({
    name: "",
    carbs_per_litre: 0,
    share_percent: share,
    sodium_mg_per_litre: "",
  });
}


// Remove the selected drink from the form.
function removeDrink(index) {
  form.value.drinks.splice(index, 1);
}

// Ask the server to calculate and save the plan in one request.
async function validatePlan() {
  if (loading.value) {
    return;
  }
  loading.value = true;
  error.value = "";

  // Empty optional fields are saved as null, not as empty text.
  if (form.value.elevation_gain === "") {
    form.value.elevation_gain = null;
  }
  if (form.value.temperature === "") {
    form.value.temperature = null;
  }

  for (let i = 0; i < form.value.drinks.length; i++) {
    if (form.value.drinks[i].sodium_mg_per_litre === "") {
      form.value.drinks[i].sodium_mg_per_litre = null;
    }
  }

  try {
    const data = await request("", "POST", form.value);

    selectedPlan.value = {
      id_nutplan: data.planId,
      name: form.value.name,
      distance_km: form.value.distance_km,
      elevation_gain: form.value.elevation_gain,
      estimated_duration: form.value.estimated_duration,
      temperature: form.value.temperature,
      plan_data: data.plan,
    };
    page.value = "result";
  } catch (err) {
    error.value = "Unable to save the plan. " + err.message;
  } finally {
    loading.value = false;
  }
}

// Open the full result saved in the database.
async function openPlan(id) {
  if (loading.value) {
    return;
  }
  loading.value = true;
  error.value = "";

  try {
    selectedPlan.value = await request("/" + id, "GET");
    page.value = "result";
  } catch (err) {
    error.value = "Unable to open the plan. " + err.message;
  } finally {
    loading.value = false;
  }
}

// Delete a plan and update the list.
async function deletePlan(id) {
  if (loading.value) {
    return;
  }

  const confirmed = window.confirm("Delete this nutrition plan?");

  if (!confirmed) {
    return;
  }

  loading.value = true;
  error.value = "";

  let deleted = false;
  let nextPage = listPage.value;

  try {
    await request("/" + id, "DELETE");
    deleted = true;

    // Go back one page when its last plan is deleted.
    if (plans.value.length === 1 && nextPage > 1) {
      nextPage--;
    }
  } catch (err) {
    error.value = "Unable to delete the plan. " + err.message;
  } finally {
    loading.value = false;
  }

  // Reload after loading is false so loadPlans can run.
  if (deleted) {
    await loadPlans(nextPage);
  }
}
// Return to the list and load the latest saved plans.
function showPlans() {
  page.value = "list";
  selectedPlan.value = null;
  loadPlans(1);
}

// Add the product shares so the athlete can check the total.
function getShareTotal(products) {
  let total = 0;
  for (let i = 0; i < products.length; i++) {
    total += Number(products[i].share_percent);
  }
  return total;
}

// Check all sections, including those from older saved plans.
function hasHydrationProblem(plan) {
  for (let i = 0; i < plan.segments.length; i++) {
    const segment = plan.segments[i];
    if (segment.fluid_ml > plan.flask_capacity_ml) {
      return true;
    }
  }
  return false;
}

// Show fractional food portions with enough detail to understand the split.
function formatPortions(value) {
  return Number(value).toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

// Show amounts with at most one decimal place.
function formatNumber(value) {
  return Number(value).toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

// Show elapsed minutes as hours and minutes.
function formatTime(minutes) {
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  return hours + " h " + rest + " min";
}

onMounted(function () {
  loadPlans(1);
});
</script>

<template>
  <div class="nutrition-page">
    <header class="nutrition-header">
      <div>
        <h1>Nutrition Plans</h1>
        <p>Plan your food and drinks between aid stations.</p>
      </div>
      <div class="nutrition-actions">
        <button v-if="page !== 'list'" class="button button-outline" :disabled="loading" @click="showPlans">
          My Plans
        </button>
        <button v-if="page === 'list'" class="button button-outline" :disabled="loading" @click="loadPlans()">
          Refresh
        </button>
        <button v-if="page !== 'form'" class="button button-dark" :disabled="loading" @click="newPlan">
          + New Nutrition Plan
        </button>
      </div>
    </header>

    <p v-if="error" class="nutrition-error" role="alert">{{ error }}</p>
    <p v-if="loading" class="nutrition-message">Loading...</p>

    <!-- Saved plans -->
    <section v-if="page === 'list' && !loading">
      <div v-if="plans.length === 0 && !error" class="nutrition-empty">
        <h2>No plans yet</h2>
        <p>Create your first race nutrition plan.</p>
        <button class="button button-dark" @click="newPlan">Create a Plan</button>
      </div>
      <div v-else class="nutrition-grid">
        <NutritionPlanCard v-for="plan in plans" :key="plan.id_nutplan" :plan="plan" @open="openPlan" @delete="deletePlan" />
      </div>
      <div v-if="listPage > 1 || hasMore" class="nutrition-pagination">
        <button class="button button-outline" :disabled="listPage === 1" @click="loadPlans(listPage - 1)">Previous</button>
        <span>Page {{ listPage }}</span>
        <button class="button button-outline" :disabled="!hasMore" @click="loadPlans(listPage + 1)">Next</button>
      </div>
    </section>

    <!-- The browser checks required fields. The server checks the full form. -->
    <form v-if="page === 'form'" @submit.prevent="validatePlan">
      <fieldset class="nutrition-form" :disabled="loading">
        <section class="nutrition-panel">
          <h2>1. Your race</h2>
          <p class="nutrition-help">Elevation and temperature are saved for information. They do not change this calculation.</p>
          <div class="nutrition-fields">
            <label>Race name
              <input v-model="form.name" maxlength="100" required />
            </label>
            <label>Distance (km)
              <input v-model.number="form.distance_km" type="number" min="0.01" max="9999.99" step="0.01" required />
            </label>
            <label>Estimated duration (minutes)
              <input v-model.number="form.estimated_duration" type="number" min="1" step="1" required />
            </label>
            <label>Elevation gain (m, optional)
              <input v-model.number="form.elevation_gain" type="number" min="0" step="1" />
            </label>
            <label>Temperature (°C, optional)
              <input v-model.number="form.temperature" type="number" min="-99.9" max="99.9" step="0.1" />
            </label>
          </div>
        </section>

        <section class="nutrition-panel">
          <h2>2. Your hourly targets</h2>
          <p class="nutrition-help">Enter your planned targets. This calculator does not choose them from your weight or level.</p>
          <div class="nutrition-fields">
            <label>Carbohydrates (g/hour)
              <input v-model.number="form.carbs_per_hour" type="number" min="0.01" step="0.01" required />
            </label>
            <label>Total fluid (ml/hour)
              <input v-model.number="form.hydration_ml_per_hour" type="number" min="1" step="1" required />
            </label>
            <label>Total flask capacity (ml)
              <input v-model.number="form.flask_capacity_ml" type="number" min="1" step="1" required />
              <small>Add the capacity of all your flasks.</small>
            </label>
          </div>
        </section>

        <section class="nutrition-panel">
          <h2>3. Your food and drink</h2>
          <p class="nutrition-help">Use the amounts on your product labels. Choose your own split between products.</p>
          <h3>Food products</h3>
          <p class="nutrition-help">Shares split the food carbohydrates left after drinks. Food shares must total 100%. You can leave this list empty if drinks cover the full carb target.</p>
          <div v-for="(food, index) in form.foods" :key="index" class="nutrition-stop">
            <div class="nutrition-section-header">
              <h3>Food {{ index + 1 }}</h3>
              <button type="button" class="button button-outline" @click="removeFood(index)">Remove</button>
            </div>
            <div class="nutrition-fields">
              <label>Product name<input v-model="food.name" required /></label>
              <label>Carbohydrates per portion (g)<input v-model.number="food.carbs_per_portion" type="number" min="0.01" step="0.01" required /></label>
              <label>Share of food carbohydrates (%)<input v-model.number="food.share_percent" type="number" min="0" max="100" step="1" required /></label>
            </div>
          </div>
          <button type="button" class="button button-outline" @click="addFood">+ Add Food Product</button>
          <p v-if="form.foods.length > 0" class="nutrition-help nutrition-share-total">Food shares: {{ getShareTotal(form.foods) }} / 100%</p>
          <label class="nutrition-checkbox">
            <input v-model="form.reuse_leftovers" type="checkbox" />
            Reuse leftover food at the next collection point
          </label>
          <p class="nutrition-help">Off by default. Enable only if you can carry and use the remaining food, including opened portions. Food targets stay the same.</p>

          <h3 class="nutrition-drinks-title">Drinks</h3>
          <p class="nutrition-help">Include plain water as a drink with 0 g/L. Drink shares split the fluid volume and must total 100%. Sodium is optional label information; it does not set a sodium target.</p>
          <div v-for="(drink, index) in form.drinks" :key="index" class="nutrition-stop">
            <div class="nutrition-section-header">
              <h3>Drink {{ index + 1 }}</h3>
              <button type="button" class="button button-outline" @click="removeDrink(index)">Remove</button>
            </div>
            <div class="nutrition-fields">
              <label>Drink name<input v-model="drink.name" required /></label>
              <label>Carbohydrates (g/litre)<input v-model.number="drink.carbs_per_litre" type="number" min="0" step="0.01" required /></label>
              <label>Share of total fluid (%)<input v-model.number="drink.share_percent" type="number" min="0" max="100" step="1" required /></label>
              <label>Sodium (mg/litre, optional)<input v-model.number="drink.sodium_mg_per_litre" type="number" min="0" step="0.1" /></label>
            </div>
          </div>
          <button type="button" class="button button-outline" @click="addDrink">+ Add Drink</button>
          <p class="nutrition-help nutrition-share-total">Drink shares: {{ getShareTotal(form.drinks) }} / 100%</p>
        </section>

        <section class="nutrition-panel">
          <h2>4. Aid stations</h2>
          <p class="nutrition-help">Add stops in race order. Times are minutes from the start. Water refills are assumed available at every stop.</p>
          <p v-if="form.aid_stations.length === 0" class="nutrition-help">No stops added: carry everything from the start.</p>
          <div v-for="(stop, index) in form.aid_stations" :key="index" class="nutrition-stop">
            <div class="nutrition-section-header">
              <h3>Stop {{ index + 1 }}</h3>
              <button type="button" class="button button-outline" @click="removeStop(index)">Remove</button>
            </div>
            <div class="nutrition-fields">
              <label>Aid station name (optional)<input v-model="stop.name" placeholder="Leave empty for Stop 1, Stop 2..." /></label>
              <label>Distance from start (km)
                <input v-model.number="stop.distance_km" type="number" min="0.01" :max="form.distance_km" step="0.01" required />
              </label>
              <label>Elapsed time from start (minutes)
                <input v-model.number="stop.time_minutes" type="number" min="1" :max="form.estimated_duration" step="1" required />
              </label>
            </div>
            <label class="nutrition-checkbox">
              <input v-model="stop.collect_products" type="checkbox" />
              I can collect my own food products here
            </label>
          </div>
          <button type="button" class="button button-outline" @click="addStop">+ Add Aid Station</button>
        </section>

        <div class="nutrition-submit">
          <p class="nutrition-help">Validate Plan calculates and saves your plan.</p>
          <button type="submit" class="button button-dark">Validate Plan</button>
        </div>
      </fieldset>
    </form>

    <!-- Both new and previously saved plans use the same result view. -->
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
