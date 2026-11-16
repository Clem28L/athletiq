<script setup>
import { ArrowLeft } from "@lucide/vue";
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

// An ID in the URL means we are editing a quiz.
const quizId = route.params.id;
const isEditMode = quizId !== undefined;
// Form fields
const title = ref("");
const description = ref("");
const type = ref("");
const module = ref("");
const category = ref("");
const published = ref(false);

// UI state
const error = ref("");
const loading = ref(false);
const loadingQuiz = ref(false);

// Load the quiz data if we are in edit mode
async function loadQuiz() {
  if (!isEditMode) {
    return;
  }

  loadingQuiz.value = true;

  try {
    const response = await fetch(
      "http://localhost:3000/api/quizzes/" + quizId,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      error.value = data.error || "Failed to load quiz.";
      return;
    }

    // Fill the form with existing values
    title.value = data.title;
    description.value = data.description;
    type.value = data.type;
    module.value = data.module;
    category.value = data.category;
    published.value = Boolean(data.published);
  } catch (err) {
    error.value = "Cannot reach the server.";
  } finally {
    loadingQuiz.value = false;
  }
}

// Submit the form
async function handleSubmit() {
  error.value = "";

  // Check that all fields are filled
  if (
    !title.value ||
    !description.value ||
    !type.value ||
    !module.value ||
    !category.value
  ) {
    error.value = "All fields are required.";
    return;
  }

  loading.value = true;

  try {
    // Build the URL and method depending on the mode
    let url = "http://localhost:3000/api/quizzes";
    let method = "POST";

    if (isEditMode) {
      url = url + "/" + quizId;
      method = "PUT";
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({
        title: title.value,
        description: description.value,
        type: type.value,
        module: module.value,
        category: category.value,
        published: published.value,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      error.value = data.error || "Failed to save quiz.";
      return;
    }

    // Go back to the list after saving.
    router.push("/expert/quizzes");
  } catch (err) {
    error.value = "Cannot reach the server.";
  } finally {
    loading.value = false;
  }
}

// Go back to the quizzes list
function goBack() {
  router.push("/expert/quizzes");
}

onMounted(loadQuiz);
</script>

<template>
  <div class="quiz-form-page">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="goBack"><ArrowLeft :size="16" aria-hidden="true" /> Back to quizzes</button>
        <h1 v-if="isEditMode">Edit quiz</h1>
        <h1 v-else>New quiz</h1>
        <p class="subtitle">
          <template v-if="isEditMode">Edit the quiz details.</template>
          <template v-else>Enter the quiz details.</template>
        </p>
      </div>
    </header>

    <div v-if="loadingQuiz" class="state-msg">Loading quiz…</div>

    <form v-else class="quiz-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="title">Title</label>
        <input
          id="title"
          v-model="title"
          placeholder="e.g. Knee injury prevention"
        />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          v-model="description"
          rows="4"
          placeholder="Briefly describe the quiz"
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="type">Type</label>
          <select id="type" v-model="type">
            <option value="" disabled>Select a type</option>
            <option value="mcq">Multiple choice</option>
            <option value="declarative">Knowledge check</option>
            <option value="calculation">Calculation</option>
            <option value="recommendation">Recommendation</option>
          </select>
        </div>

        <div class="form-group">
          <label for="module">Module</label>
          <select id="module" v-model="module">
            <option value="" disabled>Select a module</option>
            <option value="prevention">Prevention</option>
            <option value="nutrition">Nutrition</option>
            <option value="equipment">Equipment</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="category">Category</label>
        <input
          id="category"
          v-model="category"
          placeholder="e.g. Mobility, hydration, shoes"
        />
      </div>

      <div v-if="isEditMode" class="form-group checkbox-group">
        <label>
          <input type="checkbox" v-model="published" />
          Publish this quiz so athletes can see it
        </label>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="goBack">
          Cancel
        </button>
        <button type="submit" class="btn-primary" :disabled="loading">
          <template v-if="loading">Saving…</template>
          <template v-else-if="isEditMode">Save</template>
          <template v-else>Create quiz</template>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.quiz-form-page {
  padding: 40px;
  color: var(--ink);
  background: var(--page);
  min-height: 100vh;
  max-width: 700px;
}

.page-header {
  margin-bottom: 40px;
}
.btn-back {
  background: none;
  border: none;
  padding: 0;
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 12px;
}
.btn-back:hover {
  color: var(--ink);
}
.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}
.subtitle {
  color: var(--muted);
  font-size: 14px;
  margin-top: 8px;
}

.quiz-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  background: var(--surface);
  color: var(--ink);
}

.form-group textarea {
  resize: vertical;
  line-height: 1.5;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 400;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.error-msg {
  color: #ff3b30;
  font-size: 14px;
  margin: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
}
.btn-primary:hover {
  background: var(--primary-deep);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
}
.btn-secondary:hover {
  background: var(--page);
}

.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
}
</style>
