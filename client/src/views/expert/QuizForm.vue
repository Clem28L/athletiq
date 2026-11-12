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
        <button class="btn-back" @click="goBack"><ArrowLeft :size="16" aria-hidden="true" /> Retour</button>
        <h1 v-if="isEditMode">Modifier le quiz</h1>
        <h1 v-else>Nouveau quiz</h1>
        <p class="subtitle">
          <template v-if="isEditMode">Modifie les informations du quiz.</template>
          <template v-else>Remplis les informations de base.</template>
        </p>
      </div>
    </header>

    <div v-if="loadingQuiz" class="state-msg">Chargement du quiz...</div>

    <form v-else class="quiz-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="title">Titre</label>
        <input
          id="title"
          v-model="title"
          placeholder="Ex: Prévention des blessures au genou"
        />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          v-model="description"
          rows="4"
          placeholder="Décris brièvement le contenu du quiz..."
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="type">Type</label>
          <select id="type" v-model="type">
            <option value="" disabled>Choisir un type</option>
            <option value="mcq">QCM</option>
            <option value="declarative">Déclaratif</option>
            <option value="calculation">Calcul</option>
            <option value="recommendation">Recommandation</option>
          </select>
        </div>

        <div class="form-group">
          <label for="module">Module</label>
          <select id="module" v-model="module">
            <option value="" disabled>Choisir un module</option>
            <option value="prevention">Prévention</option>
            <option value="nutrition">Nutrition</option>
            <option value="equipment">Équipement</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="category">Catégorie</label>
        <input
          id="category"
          v-model="category"
          placeholder="Ex: Mobilité, Hydratation, Chaussures..."
        />
      </div>

      <div v-if="isEditMode" class="form-group checkbox-group">
        <label>
          <input type="checkbox" v-model="published" />
          Publier ce quiz (visible pour les athlètes)
        </label>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="goBack">
          Annuler
        </button>
        <button type="submit" class="btn-primary" :disabled="loading">
          <template v-if="loading">Sauvegarde...</template>
          <template v-else-if="isEditMode">Enregistrer</template>
          <template v-else>Créer le quiz</template>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.quiz-form-page {
  padding: 40px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
    sans-serif;
  color: #1d1d1f;
  background: #ffffff;
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
  color: #86868b;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 12px;
}
.btn-back:hover {
  color: #1d1d1f;
}
.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}
.subtitle {
  color: #86868b;
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
  color: #1d1d1f;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 12px 16px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: white;
  color: #1d1d1f;
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
  border-top: 1px solid #e5e5e7;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background: #1d1d1f;
  color: white;
  border: none;
}
.btn-primary:hover {
  background: #000;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #1d1d1f;
  border: 1px solid #d2d2d7;
}
.btn-secondary:hover {
  background: #f5f5f7;
}

.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: #86868b;
}
</style>
