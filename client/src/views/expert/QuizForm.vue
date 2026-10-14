<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// Form fields
const title = ref("");
const description = ref("");
const type = ref("");
const module = ref("");
const category = ref("");

// UI state
const error = ref("");
const loading = ref(false);

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
    const response = await fetch("http://localhost:3000/api/quizzes", {
      method: "POST",
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
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      error.value = data.error || "Failed to create quiz.";
      return;
    }

    // Success → go to the questions page of the new quiz
    router.push("/expert/quizzes/" + data.quizId + "/questions");
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
</script>

<template>
  <div class="quiz-form-page">
    <!-- Header -->
    <header class="page-header">
      <div>
        <button class="btn-back" @click="goBack">← Retour</button>
        <h1>Nouveau quiz</h1>
        <p class="subtitle">
          Remplis les informations de base. Tu ajouteras les questions après.
        </p>
      </div>
    </header>

    <!-- Form -->
    <form class="quiz-form" @submit.prevent="handleSubmit">
      <!-- Title -->
      <div class="form-group">
        <label for="title">Titre</label>
        <input
          id="title"
          v-model="title"
          type="text"
          placeholder="Ex: Prévention des blessures au genou"
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          v-model="description"
          rows="4"
          placeholder="Décris brièvement le contenu du quiz..."
        ></textarea>
      </div>

      <!-- Two columns: type + module -->
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

      <!-- Category -->
      <div class="form-group">
        <label for="category">Catégorie</label>
        <input
          id="category"
          v-model="category"
          type="text"
          placeholder="Ex: Mobilité, Hydratation, Chaussures..."
        />
      </div>

      <!-- Error message -->
      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="goBack">
          Annuler
        </button>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? "Création..." : "Créer le quiz" }}
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

/* Header */
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

/* Form */
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

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #1d1d1f;
}

.form-group textarea {
  resize: vertical;
  line-height: 1.5;
}

/* Two columns */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Error */
.error-msg {
  color: #ff3b30;
  font-size: 14px;
  margin: 0;
}

/* Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e7;
}

.btn-primary {
  background: #1d1d1f;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
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
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.btn-secondary:hover {
  background: #f5f5f7;
}
</style>
