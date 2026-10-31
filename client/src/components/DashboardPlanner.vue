<script setup>
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  userId: {
    type: Number,
    required: true,
  },
});

const today = new Date();

const month = ref(
  new Date(today.getFullYear(), today.getMonth(), 1)
);

const selectedDay = ref(getDayKey(today));
const notes = ref({});
const error = ref("");

const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// Build a date name without changing it to another time zone.
function getDayKey(date) {
  const year = date.getFullYear();
  const monthNumber = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return year + "-" + monthNumber + "-" + day;
}

// Show the name of the displayed month.
const monthTitle = computed(function () {
  return month.value.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
});

// Build six weeks, starting on Monday.
const days = computed(function () {
  const items = [];
  const year = month.value.getFullYear();
  const monthNumber = month.value.getMonth();
  const offset = (month.value.getDay() + 6) % 7;

  for (let i = 0; i < 42; i++) {
    const date = new Date(year, monthNumber, i - offset + 1);

    items.push({
      key: getDayKey(date),
      number: date.getDate(),
      outside: date.getMonth() !== monthNumber,
    });
  }

  return items;
});

// Read the note for the selected day.
const selectedNote = computed(function () {
  if (typeof notes.value[selectedDay.value] === "string") {
    return notes.value[selectedDay.value];
  }

  return "";
});

// Show the previous or next month.
function changeMonth(change) {
  month.value = new Date(
    month.value.getFullYear(),
    month.value.getMonth() + change,
    1
  );
}

// Read this account's notes saved in this browser.
function loadNotes() {
  try {
    const stored = localStorage.getItem(
      "athletiq-notes-" + props.userId
    );

    if (stored) {
      const data = JSON.parse(stored);

      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data)
      ) {
        notes.value = data;
      }
    }
  } catch (err) {
    error.value = "Unable to read saved notes.";
  }
}

// Save the note whenever the user types.
function saveNote(event) {
  notes.value[selectedDay.value] = event.target.value;
  error.value = "";

  try {
    localStorage.setItem(
      "athletiq-notes-" + props.userId,
      JSON.stringify(notes.value)
    );
  } catch (err) {
    error.value = "This note could not be saved in your browser.";
  }
}

onMounted(loadNotes);
</script>

<template>
  <section id="home-planner" class="dash-card dash-planner">
    <p class="dash-small">YOUR PLANNER</p>

    <div class="dash-row">
      <h2>{{ monthTitle }}</h2>

      <div class="dash-row">
        <button
          type="button"
          class="dash-icon"
          aria-label="Previous month"
          @click="changeMonth(-1)"
        >
          ‹
        </button>

        <button
          type="button"
          class="dash-icon"
          aria-label="Next month"
          @click="changeMonth(1)"
        >
          ›
        </button>
      </div>
    </div>

    <div class="dash-calendar">
      <span
        v-for="day in weekDays"
        :key="day"
        class="dash-weekday"
      >
        {{ day }}
      </span>

      <button
        v-for="day in days"
        :key="day.key"
        type="button"
        class="dash-day"
        :class="{
          outside: day.outside,
          selected: day.key === selectedDay,
          today: day.key === getDayKey(today),
        }"
        :aria-label="day.key"
        :aria-pressed="day.key === selectedDay"
        @click="selectedDay = day.key"
      >
        {{ day.number }}
      </button>
    </div>

    <label for="daily-note" class="dash-note-label">
      My note · {{ selectedDay }}
    </label>

    <textarea
      id="daily-note"
      :value="selectedNote"
      maxlength="500"
      rows="3"
      placeholder="Plan a session, check your gear, or write a reminder..."
      @input="saveNote"
    ></textarea>

    <p class="dash-help">
      Notes are saved in this browser for your account.
    </p>

    <p v-if="error" class="dash-error" role="alert">
      {{ error }}
    </p>
  </section>
</template>