<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { getCurrentUser, user, logoutUser } from "@/stores/auth";
import "@/assets/athlete-profile.css";

const currentUser = getCurrentUser();
const router = useRouter();
const loading = ref(true);
// null means the server has not told us whether a profile exists yet.
const profileExists = ref(null);
const message = ref("");
const error = ref("");

// Store the form values. The server saves them for the logged-in athlete.
const profile = ref({
  sport: "",
  weekly_volume: "",
  level: "",
  goal: "",
  past_injury: "",
  weight_kg: "",
  height_cm: "",
  birth_date: "",
  sex: "",
});

// These calculator settings stay on the page and are never saved.
const activityFactor = ref("");
const calorieChange = ref(0);

// Calculate the age from the birth date.
const age = computed(function () {
  if (!profile.value.birth_date) {
    return null;
  }

  const birth = new Date(profile.value.birth_date + "T00:00:00");
  const now = new Date();

  // Stop if the date is invalid or in the future.
  if (Number.isNaN(birth.getTime()) || birth > now) {
    return null;
  }

  let years = now.getFullYear() - birth.getFullYear();

  const birthdayMonthIsLater = now.getMonth() < birth.getMonth();
  const sameMonth = now.getMonth() === birth.getMonth();
  const birthdayDayIsLater = now.getDate() < birth.getDate();

  // Remove one year if the birthday has not happened yet.
  if (birthdayMonthIsLater || (sameMonth && birthdayDayIsLater)) {
    years--;
  }

  return years;
});


// Calculate BMI for adults with a valid weight and height.
const bmi = computed(function () {
  const weight = profile.value.weight_kg;
  const height = profile.value.height_cm;

  // Stop if the age is missing or below 18.
  if (age.value === null || age.value < 18) {
    return null;
  }

  // The weight must be a number above zero.
  if (!Number.isFinite(weight) || weight <= 0) {
    return null;
  }

  // The height must be a number above zero.
  if (!Number.isFinite(height) || height <= 0) {
    return null;
  }

  const metres = height / 100;
  return weight / (metres * metres);
});

// Show the adult BMI screening range without rounding before the comparison.
const bmiRange = computed(function () {
  if (bmi.value === null) {
    return "";
  }

  if (bmi.value < 18.5) {
    return "Underweight range";
  }

  if (bmi.value < 25) {
    return "Normal weight range";
  }

  if (bmi.value < 30) {
    return "Overweight range";
  }

  return "Obesity range";
});

// Calculate resting energy and daily energy.
const energy = computed(function () {
  const weight = profile.value.weight_kg;
  const height = profile.value.height_cm;
  const sex = profile.value.sex;

  // Wait for valid adult BMI data.
  if (bmi.value === null) {
    return null;
  }

  // The formula needs one of these two values.
  if (sex !== "male" && sex !== "female") {
    return null;
  }

  if (!Number.isFinite(activityFactor.value)) {
    return null;
  }

  let rest = 10 * weight + 6.25 * height - 5 * age.value;

  if (sex === "male") {
    rest += 5;
  } else {
    rest -= 161;
  }

  if (rest <= 0) {
    return null;
  }

  const daily = rest * activityFactor.value;

  return {
    rest: rest,
    daily: daily,
  };
});

// Apply the selected percentage to daily calories.
const calorieScenario = computed(function () {
  if (!energy.value) {
    return null;
  }

  // Hide a deficit when BMI is below 18.5.
  if (bmi.value < 18.5 && calorieChange.value < 0) {
    return null;
  }

  const changeFactor = 1 + calorieChange.value / 100;
  return energy.value.daily * changeFactor;
});

// Return today's date for the date input's maximum value.
function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

// Send profile requests with the login token.
async function request(method, body) {
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

  const response = await fetch("http://localhost:3000/api/athlete/profile", options);
  if (response.status === 401) {
    logoutUser();
    await router.replace("/login");
    throw new Error("Please log in again.");
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
}

// Load the saved profile into the form.
async function loadProfile() {
  loading.value = true;
  clearMessages();

  try {
    let data = await request("GET");
    profileExists.value = data !== null;

    // Load old browser data when there is no server profile.
    if (!data) {
      const saved = localStorage.getItem(
        "athlete-profile-" + currentUser.id
      );

      if (saved) {
        data = JSON.parse(saved);
        message.value =
          "Your previous browser profile was loaded. Save it to your account below.";
      }
    }

    if (data) {
      // Copy only the fields used by the form.
      const fields = Object.keys(profile.value);
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        let value = data[field];

        // Show an empty field when no value is saved.
        if (value === null || value === undefined) {
          value = "";
        }

        profile.value[field] = value;
      }
    }
  } catch (err) {
    error.value = "Unable to load your profile. " + err.message;
  } finally {
    loading.value = false;
  }
}

// Create or update the athlete's profile.
async function saveProfile() {
  // Wait until the profile is loaded and no request is running.
  if (loading.value || profileExists.value === null) {
    return;
  }

  clearMessages();

  // Check the birth date only when the field is filled.
  if (profile.value.birth_date && age.value === null) {
    error.value = "Enter a valid birth date that is not in the future.";
    return;
  }

  loading.value = true;

  // Use POST for a new profile and PUT for a saved profile.
  let method = "POST";

  if (profileExists.value) {
    method = "PUT";
  }

  try {
    const data = await request(method, profile.value);
    profileExists.value = true;
    message.value = data.message;
  } catch (err) {
    error.value = "Unable to save your profile. " + err.message;
  } finally {
    // Enable the form after success or failure.
    loading.value = false;
  }
}
// Clear the save message when the athlete changes a field.
function clearMessages() {
  message.value = "";
  error.value = "";
}

// Keep displayed numbers easy to read. Calculations keep their full precision.
function formatNumber(value, decimals = 0) {
  return value.toLocaleString("en-GB", { maximumFractionDigits: decimals });
}

onMounted(loadProfile);

// Leave the local profile when the athlete logs out.
watch(user, function (account) {
  if (!account) {
    router.replace("/login");
  }
});
</script>

<template>
  <div class="athlete-profile-page">
    <header class="profile-heading">
      <div>
        <h1>My Profile</h1>
        <p>Your sport, training and personal estimates.</p>
      </div>
      <span class="profile-account">{{ currentUser.name }} · Athlete</span>
    </header>

    <p class="profile-storage-note">Your profile details are saved to your athlete account. Calorie settings are not saved and reset when you leave this page.</p>
    <p v-if="loading" class="profile-help">Loading...</p>
    <div v-if="error && profileExists === null" class="profile-load-error">
      <p class="profile-error" role="alert">{{ error }}</p>
      <button class="button button-outline" :disabled="loading" @click="loadProfile">Try Again</button>
    </div>

    <form @submit.prevent="saveProfile" @input="clearMessages">
      <fieldset class="profile-form" :disabled="loading || profileExists === null">
      <div class="profile-layout">
        <div class="profile-form-sections">
          <section class="profile-panel">
            <h2>About you</h2>
            <p class="profile-help">Fields are optional. Add your birth date, height and weight to see your adult BMI.</p>
            <div class="profile-fields">
              <label>Birth date
                <input v-model="profile.birth_date" type="date" :max="today()" />
                <small v-if="age !== null">{{ age }} years old</small>
              </label>
              <label>Sex used for the calorie formula
                <select v-model="profile.sex">
                  <option value="">Not provided</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <label>Height (cm)
                <input v-model.number="profile.height_cm" type="number" min="1" max="300" step="0.1" />
              </label>
              <label>Weight (kg)
                <input v-model.number="profile.weight_kg" type="number" min="1" max="500" step="0.1" />
              </label>
            </div>
          </section>

          <section class="profile-panel">
            <h2>Your training</h2>
            <div class="profile-fields">
              <label>Main sport
                <select v-model="profile.sport">
                  <option value="">Choose a sport</option>
                  <option value="running">Running</option>
                  <option value="trail">Trail running</option>
                  <option value="cycling">Cycling</option>
                  <option value="triathlon">Triathlon</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>Level
                <select v-model="profile.level">
                  <option value="">Choose a level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label>Weekly distance (km)
                <input v-model.number="profile.weekly_volume" type="number" min="0" max="9999.99" step="0.1" />
              </label>
            </div>
            <label class="profile-full-field">Your goal
              <textarea v-model="profile.goal" maxlength="100" rows="3" placeholder="Prepare for a race, improve endurance..."></textarea>
            </label>
            <label class="profile-full-field">Past injuries (optional)
              <textarea v-model="profile.past_injury" maxlength="2000" rows="2"></textarea>
            </label>
          </section>

          <section class="profile-panel">
            <h2>Daily energy estimate</h2>
            <p class="profile-help">Choose your total daily activity, including work, walking and sport. These calculator settings are temporary and are not included in Save Profile.</p>
            <div class="profile-fields">
              <label>Daily activity
                <select v-model.number="activityFactor">
                  <option value="">Choose your activity</option>
                  <option :value="1.4">Mostly sitting (factor 1.4)</option>
                  <option :value="1.6">Some daily activity (factor 1.6)</option>
                  <option :value="1.8">Active daily life (factor 1.8)</option>
                  <option :value="2">Very active daily life (factor 2.0)</option>
                </select>
              </label>
              <label>Calorie scenario
                <select v-model.number="calorieChange">
                  <option :value="0">Maintenance (0%)</option>
                  <option :value="-5">Small deficit (-5%)</option>
                  <option :value="-10">Deficit (-10%)</option>
                  <option :value="5">Small surplus (+5%)</option>
                  <option :value="10">Surplus (+10%)</option>
                </select>
              </label>
            </div>
            <p class="profile-help profile-bottom-note">These are comparison scenarios, not recommended calorie targets. Needs vary from day to day, especially during endurance training.</p>
          </section>
        </div>

        <!-- Results change as the athlete fills in the form. -->
        <aside class="profile-results">
          <section class="profile-panel">
            <h2>Your estimates</h2>
            <p v-if="age === null" class="profile-help">Add your birth date to enable the adult estimates.</p>
            <p v-else-if="age < 18" class="profile-help">BMI ranges and calorie estimates on this page are for adults aged 18 or older.</p>
            <template v-else>
              <div v-if="bmi !== null" class="profile-metric">
                <span>Body mass index (BMI)</span>
                <strong>{{ formatNumber(bmi, 1) }}</strong>
                <small>{{ bmiRange }}</small>
              </div>
              <p v-else class="profile-help">Add your height and weight to see your BMI.</p>

              <template v-if="energy">
                <div class="profile-metric">
                  <span>Estimated resting energy</span>
                  <strong>{{ formatNumber(energy.rest) }} <small>kcal/day</small></strong>
                </div>
                <div class="profile-metric">
                  <span>Estimated maintenance</span>
                  <strong>{{ formatNumber(energy.daily) }} <small>kcal/day</small></strong>
                </div>
                <div v-if="calorieScenario !== null" class="profile-metric profile-scenario">
                  <span>Your selected scenario ({{ calorieChange }}%)</span>
                  <strong>{{ formatNumber(calorieScenario) }} <small>kcal/day</small></strong>
                </div>
                <p v-else class="profile-help">A deficit scenario is not shown when BMI is below 18.5.</p>
              </template>
              <p v-else class="profile-help">Add your height, weight, formula sex and daily activity to see calorie estimates.</p>
            </template>
            <p class="profile-help profile-bottom-note">BMI does not measure body fat or distinguish muscle from fat. It is not a diagnosis.</p>
          </section>
          <section class="profile-panel profile-source-note">
            <h2>About the numbers</h2>
            <p>Energy uses the <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener noreferrer">Mifflin–St Jeor formula</a>, then an activity factor. This is a rough estimate, not a measured energy need.</p>
            <p><a href="https://www.niddk.nih.gov/bwp" target="_blank" rel="noopener noreferrer">Adult energy estimates</a> are not intended for pregnancy or breastfeeding. BMI uses <a href="https://www.who.int/data/nutrition/nlis/info/malnutrition-in-women" target="_blank" rel="noopener noreferrer">WHO adult ranges</a>.</p>
          </section>
        </aside>
      </div>

      <div class="profile-save-row">
        <button type="submit" class="button button-dark">Save Profile</button>
        <p v-if="message" class="profile-success" role="status">{{ message }}</p>
        <p v-if="error && profileExists !== null" class="profile-error" role="alert">{{ error }}</p>
      </div>
      </fieldset>
    </form>
  </div>
</template>
