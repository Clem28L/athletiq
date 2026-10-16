<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

// Quiz ID from the URL
const quizId = route.params.id;

// Quiz info + questions list
const quiz = ref(null);
const questions = ref([]);
const loading = ref(true);
const error = ref("");

// New question form
const newQuestionText = ref("");
const newQuestionType = ref("single_choice");
const newQuestionPoints = ref(1);
const newOptions = ref([
  { text: "", is_correct: false },
  { text: "", is_correct: false },
]);
const formError = ref("");
const saving = ref(false);

// Load quiz + questions
async function loadQuiz() {
  loading.value = true;
  error.value = "";

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

    quiz.value = data;
    questions.value = data.questions || [];
  } catch (err) {
    error.value = "Cannot reach the server.";
  } finally {
    loading.value = false;
  }
}

// Add a blank option to the form
function addOptionField() {
  newOptions.value.push({ text: "", is_correct: false });
}

// Remove an option from the form
function removeOptionField(index) {
  newOptions.value.splice(index, 1);
}

// Add a new question
async function handleAddQuestion() {
  formError.value = "";

  // Check that the question text is filled
  if (!newQuestionText.value) {
    formError.value = "Question text is required.";
    return;
  }

  // Keep only options that have text
  const filledOptions = newOptions.value.filter((o) => o.text.trim() !== "");

  // Need at least 2 options for a quiz question
  if (filledOptions.length < 2) {
    formError.value = "You need at least 2 options.";
    return;
  }

  // Need at least 1 correct answer
  const hasCorrect = filledOptions.some((o) => o.is_correct);
  if (!hasCorrect) {
    formError.value = "You must mark at least one option as correct.";
    return;
  }

  saving.value = true;

  try {
    // STEP 1 — Create the question
    const response = await fetch(
      "http://localhost:3000/api/quizzes/" + quizId + "/questions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify({
          text: newQuestionText.value,
          type_answer: newQuestionType.value,
          points: newQuestionPoints.value,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      formError.value = data.error || "Failed to add question.";
      return;
    }

    const newQuestionId = data.questionId;

    // STEP 2 — Create the options for this question
    for (const option of filledOptions) {
      await fetch(
        "http://localhost:3000/api/questions/" + newQuestionId + "/options",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify({
            text: option.text,
            is_correct: option.is_correct,
          }),
        },
      );
    }

    // Reset the form
    newQuestionText.value = "";
    newQuestionType.value = "single_choice";
    newQuestionPoints.value = 1;
    newOptions.value = [
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ];

    // Reload the quiz to show the new question
    await loadQuiz();
  } catch (err) {
    formError.value = "Cannot reach the server.";
  } finally {
    saving.value = false;
  }
}

// Delete a question
async function deleteQuestion(questionId) {
  if (!confirm("Delete this question?")) return;

  try {
    const response = await fetch(
      "http://localhost:3000/api/questions/" + questionId,
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      },
    );

    if (!response.ok) {
      alert("Delete failed");
      return;
    }

    // Remove from local list
    questions.value = questions.value.filter(
      (q) => q.id_question !== questionId,
    );
  } catch (err) {
    alert("Server error");
  }
}

// Go back to the quizzes list
function goBack() {
  router.push("/expert/quizzes");
}

onMounted(loadQuiz);
</script>

<template>
  <div class="quiz-questions-page">
    <!-- Header -->
    <header class="page-header">
      <button class="btn-back" @click="goBack">← Retour aux quiz</button>
      <h1>Questions du quiz</h1>
      <p class="subtitle" v-if="quiz">{{ quiz.title }}</p>
    </header>

    <!-- Loading / error -->
    <div v-if="loading" class="state-msg">Chargement...</div>
    <div v-else-if="error" class="state-msg error">{{ error }}</div>

    <div v-else class="content">
      <!-- ADD QUESTION FORM -->
      <section class="add-question-section">
        <h2>Ajouter une question</h2>

        <form class="question-form" @submit.prevent="handleAddQuestion">
          <!-- Question text -->
          <div class="form-group">
            <label>Texte de la question</label>
            <textarea
              v-model="newQuestionText"
              rows="2"
              placeholder="Ex: Quelle est la meilleure récupération après une course ?"
            ></textarea>
          </div>

          <!-- Type + points -->
          <div class="form-row">
            <div class="form-group">
              <label>Type de réponse</label>
              <select v-model="newQuestionType">
                <option value="single_choice">Choix unique</option>
                <option value="multiple_choice">Choix multiple</option>
              </select>
            </div>
            <div class="form-group">
              <label>Points</label>
              <input v-model.number="newQuestionPoints" type="number" min="1" />
            </div>
          </div>

          <!-- Options -->
          <div class="form-group">
            <label>Options de réponse</label>

            <div
              v-for="(option, index) in newOptions"
              :key="index"
              class="option-row"
            >
              <input
                type="checkbox"
                v-model="option.is_correct"
                title="Marquer comme correcte"
              />
              <input
                v-model="option.text"
                type="text"
                placeholder="Texte de l'option"
              />
              <button
                v-if="newOptions.length > 2"
                type="button"
                class="btn-icon"
                @click="removeOptionField(index)"
              >
                ✕
              </button>
            </div>

            <button
              type="button"
              class="btn-add-option"
              @click="addOptionField"
            >
              + Ajouter une option
            </button>
          </div>

          <!-- Error -->
          <p v-if="formError" class="error-msg">{{ formError }}</p>

          <!-- Submit -->
          <div class="form-actions">
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? "Ajout..." : "Ajouter la question" }}
            </button>
          </div>
        </form>
      </section>

      <!-- QUESTIONS LIST -->
      <section class="questions-list-section">
        <h2>Questions existantes ({{ questions.length }})</h2>

        <p v-if="questions.length === 0" class="empty-msg">
          Aucune question pour l'instant.
        </p>

        <div
          v-for="(question, qIndex) in questions"
          :key="question.id_question"
          class="question-card"
        >
          <div class="question-header">
            <span class="question-number">Q{{ qIndex + 1 }}</span>
            <span class="question-points">{{ question.points }} pt</span>
            <button
              class="btn-icon danger"
              @click="deleteQuestion(question.id_question)"
              title="Supprimer"
            >
              ✕
            </button>
          </div>

          <p class="question-text">{{ question.text }}</p>

          <ul
            v-if="question.options && question.options.length > 0"
            class="options-list"
          >
            <li
              v-for="option in question.options"
              :key="option.id_option"
              :class="{ correct: option.is_correct }"
            >
              <span class="option-marker">{{
                option.is_correct ? "✓" : "○"
              }}</span>
              {{ option.text }}
            </li>
          </ul>
          <p v-else class="no-options-msg">Pas d'options enregistrées.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.quiz-questions-page {
  padding: 40px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI",
    sans-serif;
  color: #1d1d1f;
  background: #ffffff;
  min-height: 100vh;
  max-width: 900px;
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

.content {
  display: flex;
  flex-direction: column;
  gap: 48px;
}
.add-question-section h2,
.questions-list-section h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 20px 0;
}

/* Form */
.question-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  background: #fafafa;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-group label {
  font-size: 14px;
  font-weight: 500;
}
.form-group textarea,
.form-group input,
.form-group select {
  padding: 12px 16px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: white;
}
.form-group textarea:focus,
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #1d1d1f;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Options */
.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.option-row input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
}
.option-row input[type="text"] {
  flex: 1;
}

.btn-add-option {
  margin-top: 8px;
  background: none;
  border: 1px dashed #d2d2d7;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  color: #55544f;
  cursor: pointer;
}
.btn-add-option:hover {
  border-color: #1d1d1f;
  color: #1d1d1f;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #86868b;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  flex-shrink: 0;
}
.btn-icon:hover {
  background: #f0f0f0;
}
.btn-icon.danger:hover {
  background: #ff3b30;
  color: white;
}

/* Error */
.error-msg {
  color: #ff3b30;
  font-size: 14px;
  margin: 0;
}

/* Submit */
.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
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

/* Empty */
.empty-msg {
  color: #86868b;
  font-size: 14px;
  padding: 20px 0;
}

/* Questions list */
.question-card {
  padding: 20px;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  margin-bottom: 16px;
  background: white;
}
.question-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.question-number {
  font-weight: 600;
  font-size: 14px;
  color: #1d1d1f;
}
.question-points {
  font-size: 12px;
  color: #86868b;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 20px;
}
.question-header .btn-icon {
  margin-left: auto;
}
.question-text {
  font-size: 15px;
  margin: 0 0 16px 0;
  line-height: 1.5;
}
.options-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.options-list li {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #55544f;
}
.options-list li.correct {
  background: #f0fdf4;
  color: #166534;
  font-weight: 500;
}
.option-marker {
  font-weight: 700;
  font-size: 14px;
  width: 16px;
  text-align: center;
}
.no-options-msg {
  color: #86868b;
  font-size: 13px;
  font-style: italic;
  margin: 0;
}

/* States */
.state-msg {
  text-align: center;
  padding: 60px 20px;
  color: #86868b;
}
.state-msg.error {
  color: #ff3b30;
}
</style>
